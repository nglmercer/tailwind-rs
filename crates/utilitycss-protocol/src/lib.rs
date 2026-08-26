//! Versioned, runtime-independent transport types for compiler hosts.
//!
//! The protocol keeps bindings and external processes on a compact plain-data surface. It does
//! not expose the compiler's internal AST or CSS IR types.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::{error::Error, fmt};

use serde::{Deserialize, Serialize};
use utilitycss_compiler::{CandidateInput, Compiler, CompilerConfig, SourceInput};
use utilitycss_css_ir::CssSerializationMode;
use utilitycss_diagnostics::Severity;
use utilitycss_span::{SourceId, Span};

/// Current request/response schema version.
pub const PROTOCOL_VERSION: u16 = 2;

/// A candidate supplied by an AST-assisted host extractor.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ProtocolCandidate {
    /// Candidate text, which MUST match the source span exactly.
    pub raw: String,
    /// Inclusive start byte offset.
    pub start: u32,
    /// Exclusive end byte offset.
    pub end: u32,
}

/// A versioned compiler request.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ProtocolRequest {
    /// Starts or resets a compiler session.
    Initialize {
        /// Request schema version.
        #[serde(rename = "protocolVersion")]
        protocol_version: u16,
        /// Whether CSS should use readable formatting.
        #[serde(default)]
        pretty: bool,
    },
    /// Inserts or replaces one source unit.
    UpdateSource {
        /// Stable source identity.
        id: String,
        /// Optional path metadata.
        path: Option<String>,
        /// Source content.
        content: String,
        /// Optional statically extracted candidates.
        #[serde(default)]
        candidates: Option<Vec<ProtocolCandidate>>,
    },
    /// Removes one source unit.
    RemoveSource {
        /// Stable source identity.
        id: String,
    },
    /// Builds the current source set.
    Build,
    /// Removes all sources and cached semantic results.
    Reset,
}

/// A structured diagnostic transported across process or runtime boundaries.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ProtocolDiagnostic {
    /// Stable severity name.
    pub severity: String,
    /// Stable diagnostic code.
    pub code: String,
    /// Human-readable diagnostic message.
    pub message: String,
    /// Optional source identity.
    pub source: Option<String>,
    /// Optional start byte offset.
    pub start: Option<u32>,
    /// Optional exclusive end byte offset.
    pub end: Option<u32>,
    /// Optional actionable help text.
    pub help: Option<String>,
}

/// Build counters transported across process or runtime boundaries.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ProtocolStats {
    /// Number of source units scanned on updates.
    pub sources_scanned: u64,
    /// Number of source bytes scanned on updates.
    pub bytes_scanned: u64,
    /// Number of candidate occurrences found on updates.
    pub candidates_found: u64,
    /// Number of unique active candidates.
    pub unique_candidates: u64,
    /// Number of candidates parsed on this build.
    pub candidates_parsed: u64,
    /// Number of active candidates served from cache.
    pub cache_hits: u64,
    /// Number of active rules emitted.
    pub rules_generated: u64,
    /// Number of cached candidate rules removed from active references.
    pub rules_removed: u64,
}

/// A compiler build result transported across process or runtime boundaries.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ProtocolBuildResult {
    /// Serialized CSS output.
    pub css: String,
    /// Structured diagnostics.
    pub diagnostics: Vec<ProtocolDiagnostic>,
    /// Build counters.
    pub stats: ProtocolStats,
}

/// A versioned compiler response.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ProtocolResponse {
    /// Session initialization succeeded.
    Initialized {
        /// Active schema version.
        #[serde(rename = "protocolVersion")]
        protocol_version: u16,
    },
    /// Source update succeeded.
    Updated,
    /// Source removal completed.
    Removed {
        /// Whether a source with that identity existed.
        existed: bool,
    },
    /// Build completed.
    Build {
        /// Build result.
        result: ProtocolBuildResult,
    },
    /// All sources and caches were cleared.
    Reset,
}

/// Errors raised while decoding or handling protocol messages.
#[derive(Debug)]
pub enum ProtocolError {
    /// The input JSON was invalid.
    InvalidJson(String),
    /// The requested schema version is unsupported.
    UnsupportedVersion(u16),
    /// A request requiring a compiler arrived before initialization.
    NotInitialized,
    /// The compiler rejected a request.
    Compiler(utilitycss_compiler::CompilerError),
    /// A candidate used an invalid half-open span.
    InvalidCandidateSpan {
        /// Inclusive start byte offset.
        start: u32,
        /// Exclusive end byte offset.
        end: u32,
    },
    /// A response could not be serialized.
    Serialization(String),
}

impl fmt::Display for ProtocolError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidJson(message) => write!(formatter, "invalid protocol JSON: {message}"),
            Self::UnsupportedVersion(version) => {
                write!(formatter, "unsupported protocol version {version}")
            }
            Self::NotInitialized => formatter.write_str("protocol session is not initialized"),
            Self::Compiler(error) => error.fmt(formatter),
            Self::InvalidCandidateSpan { start, end } => {
                write!(formatter, "candidate span {start}..{end} is not ordered")
            }
            Self::Serialization(message) => {
                write!(formatter, "protocol serialization failed: {message}")
            }
        }
    }
}

impl Error for ProtocolError {}

/// A stateful request handler for line-oriented or embedded protocol users.
#[derive(Debug, Default)]
pub struct ProtocolSession {
    compiler: Option<Compiler>,
}

impl ProtocolSession {
    /// Creates an uninitialized protocol session.
    #[must_use]
    pub const fn new() -> Self {
        Self { compiler: None }
    }

    /// Handles one typed request.
    pub fn handle(&mut self, request: ProtocolRequest) -> Result<ProtocolResponse, ProtocolError> {
        match request {
            ProtocolRequest::Initialize { protocol_version, pretty } => {
                if protocol_version != PROTOCOL_VERSION {
                    return Err(ProtocolError::UnsupportedVersion(protocol_version));
                }
                let mode = if pretty {
                    CssSerializationMode::Pretty
                } else {
                    CssSerializationMode::Minified
                };
                self.compiler =
                    Some(Compiler::new(CompilerConfig::new().with_serialization_mode(mode)));
                Ok(ProtocolResponse::Initialized { protocol_version })
            }
            ProtocolRequest::UpdateSource { id, path, content, candidates } => {
                let compiler = self.compiler.as_mut().ok_or(ProtocolError::NotInitialized)?;
                let source_id = SourceId::new(id);
                let source = match path {
                    Some(path) => SourceInput::new(source_id, content).with_path(path),
                    None => SourceInput::new(source_id, content),
                };
                if let Some(candidates) = candidates {
                    let candidates = candidates
                        .into_iter()
                        .map(|candidate| {
                            let span = Span::new(candidate.start, candidate.end).ok_or(
                                ProtocolError::InvalidCandidateSpan {
                                    start: candidate.start,
                                    end: candidate.end,
                                },
                            )?;
                            Ok(CandidateInput::new(candidate.raw, span))
                        })
                        .collect::<Result<Vec<_>, _>>()?;
                    compiler
                        .update_source_with_candidates(source, candidates)
                        .map_err(ProtocolError::Compiler)?;
                } else {
                    compiler.update_source(source).map_err(ProtocolError::Compiler)?;
                }
                Ok(ProtocolResponse::Updated)
            }
            ProtocolRequest::RemoveSource { id } => {
                let compiler = self.compiler.as_mut().ok_or(ProtocolError::NotInitialized)?;
                let existed = compiler.remove_source(&SourceId::new(id));
                Ok(ProtocolResponse::Removed { existed })
            }
            ProtocolRequest::Build => {
                let compiler = self.compiler.as_mut().ok_or(ProtocolError::NotInitialized)?;
                Ok(ProtocolResponse::Build { result: build_result(compiler) })
            }
            ProtocolRequest::Reset => {
                let compiler = self.compiler.as_mut().ok_or(ProtocolError::NotInitialized)?;
                compiler.reset();
                Ok(ProtocolResponse::Reset)
            }
        }
    }

    /// Decodes one JSON request and encodes its typed response.
    pub fn handle_json(&mut self, input: &str) -> Result<String, ProtocolError> {
        let request = serde_json::from_str(input)
            .map_err(|error| ProtocolError::InvalidJson(error.to_string()))?;
        let response = self.handle(request)?;
        serde_json::to_string(&response)
            .map_err(|error| ProtocolError::Serialization(error.to_string()))
    }
}

fn build_result(compiler: &mut Compiler) -> ProtocolBuildResult {
    let output = compiler.build();
    let diagnostics = output
        .diagnostics()
        .iter()
        .map(|diagnostic| ProtocolDiagnostic {
            severity: match diagnostic.severity() {
                Severity::Error => "error".to_owned(),
                Severity::Warning => "warning".to_owned(),
                Severity::Note => "note".to_owned(),
                Severity::Help => "help".to_owned(),
            },
            code: diagnostic.code().to_string(),
            message: diagnostic.message().to_owned(),
            source: diagnostic.source().map(ToString::to_string),
            start: diagnostic.span().map(|span| span.start()),
            end: diagnostic.span().map(|span| span.end()),
            help: diagnostic.help().map(str::to_owned),
        })
        .collect();
    let stats = output.stats();
    ProtocolBuildResult {
        css: output.css().to_owned(),
        diagnostics,
        stats: ProtocolStats {
            sources_scanned: saturating_u64(stats.sources_scanned()),
            bytes_scanned: saturating_u64(stats.bytes_scanned()),
            candidates_found: saturating_u64(stats.candidates_found()),
            unique_candidates: saturating_u64(stats.unique_candidates()),
            candidates_parsed: saturating_u64(stats.candidates_parsed()),
            cache_hits: saturating_u64(stats.cache_hits()),
            rules_generated: saturating_u64(stats.rules_generated()),
            rules_removed: saturating_u64(stats.rules_removed()),
        },
    }
}

fn saturating_u64(value: usize) -> u64 {
    u64::try_from(value).unwrap_or(u64::MAX)
}

#[cfg(test)]
mod tests {
    use super::{ProtocolRequest, ProtocolResponse, ProtocolSession, PROTOCOL_VERSION};

    #[test]
    fn typed_session_builds_one_source() {
        let mut session = ProtocolSession::new();
        assert_eq!(
            session
                .handle(ProtocolRequest::Initialize {
                    protocol_version: PROTOCOL_VERSION,
                    pretty: false
                })
                .expect("version is supported"),
            ProtocolResponse::Initialized { protocol_version: PROTOCOL_VERSION }
        );
        session
            .handle(ProtocolRequest::UpdateSource {
                id: "src/app.html".to_owned(),
                path: None,
                content: r#"<div class="p-4"></div>"#.to_owned(),
                candidates: None,
            })
            .expect("source update succeeds");

        let ProtocolResponse::Build { result } =
            session.handle(ProtocolRequest::Build).expect("build succeeds")
        else {
            panic!("expected build response");
        };
        assert!(result.css.contains(".p-4{"));
    }

    #[test]
    fn json_round_trip_uses_stable_field_names() {
        let mut session = ProtocolSession::new();
        let response = session
            .handle_json(r#"{"type":"initialize","protocolVersion":2,"pretty":true}"#)
            .expect("request is valid");

        assert_eq!(response, r#"{"type":"initialized","protocolVersion":2}"#);
    }
}
