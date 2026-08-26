//! Thin N-API transport bindings over the runtime-independent compiler facade.

// The N-API proc macro emits its own unsafe FFI glue and locally allows that generated code.
// This crate contains no handwritten unsafe blocks.
#![deny(unsafe_code)]
#![deny(missing_docs)]

use napi::{Error, Result, Status};
use napi_derive::napi;
use utilitycss_compiler::{CandidateInput, Compiler as CoreCompiler, CompilerConfig, SourceInput};
use utilitycss_css_ir::CssSerializationMode;
use utilitycss_diagnostics::Severity;
use utilitycss_extractor::{extract_for_framework, Framework};
use utilitycss_span::{SourceId, Span};
use utilitycss_stylesheet::{transform_stylesheet, StylesheetInput};
use utilitycss_swc::{extract as extract_swc, SourceKind as SwcSourceKind};

/// A diagnostic returned across the N-API boundary.
#[napi(object)]
pub struct JsDiagnostic {
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

/// A statically extracted candidate accepted by the batched source update API.
#[napi(object)]
pub struct JsCandidate {
    /// Candidate text, which MUST match the source span exactly.
    pub raw: String,
    /// Inclusive start byte offset.
    pub start: u32,
    /// Exclusive end byte offset.
    pub end: u32,
}

/// Build counters returned across the N-API boundary.
#[napi(object)]
pub struct JsStats {
    /// Number of source units scanned on updates.
    pub sources_scanned: u32,
    /// Number of source bytes scanned on updates.
    pub bytes_scanned: u32,
    /// Number of candidate occurrences found on updates.
    pub candidates_found: u32,
    /// Number of unique active candidates.
    pub unique_candidates: u32,
    /// Number of candidates parsed on this build.
    pub candidates_parsed: u32,
    /// Number of active candidates served from cache.
    pub cache_hits: u32,
    /// Number of active rules emitted.
    pub rules_generated: u32,
    /// Number of rules removed from active references.
    pub rules_removed: u32,
}

/// A compiler build result returned to JavaScript.
#[napi(object)]
pub struct JsBuildResult {
    /// Serialized CSS output.
    pub css: String,
    /// Structured compiler diagnostics.
    pub diagnostics: Vec<JsDiagnostic>,
    /// Work counters for this build.
    pub stats: JsStats,
}

/// A stylesheet transformation result returned across the N-API boundary.
#[napi(object)]
pub struct JsStylesheetResult {
    /// Transformed authored CSS.
    pub css: String,
    /// Structured stylesheet and composition diagnostics.
    pub diagnostics: Vec<JsDiagnostic>,
}

/// A reusable JavaScript-facing compiler instance.
#[napi]
pub struct Compiler {
    inner: CoreCompiler,
}

#[napi]
impl Compiler {
    /// Creates a compiler, optionally selecting readable CSS output.
    #[napi(constructor)]
    pub fn new(pretty: Option<bool>) -> Self {
        let mode = if pretty.unwrap_or(false) {
            CssSerializationMode::Pretty
        } else {
            CssSerializationMode::Minified
        };
        Self { inner: CoreCompiler::new(CompilerConfig::new().with_serialization_mode(mode)) }
    }

    /// Inserts or replaces one source unit.
    #[napi]
    pub fn update_source(
        &mut self,
        id: String,
        content: String,
        path: Option<String>,
        candidates: Option<Vec<JsCandidate>>,
    ) -> Result<()> {
        let source_id = SourceId::new(id);
        let source = match path {
            Some(path) => SourceInput::new(source_id, content).with_path(path),
            None => SourceInput::new(source_id, content),
        };
        if let Some(candidates) = candidates {
            let candidates = candidates
                .into_iter()
                .map(|candidate| {
                    let span = Span::new(candidate.start, candidate.end).ok_or_else(|| {
                        Error::new(Status::InvalidArg, "candidate span is not ordered")
                    })?;
                    Ok(CandidateInput::new(candidate.raw, span))
                })
                .collect::<Result<Vec<_>>>()?;
            self.inner
                .update_source_with_candidates(source, candidates)
                .map_err(|error| Error::new(Status::InvalidArg, error.to_string()))
        } else {
            self.inner
                .update_source(source)
                .map_err(|error| Error::new(Status::InvalidArg, error.to_string()))
        }
    }

    /// Extracts static class candidates using SWC or the selected framework adapter.
    #[napi]
    pub fn extract_candidates(
        &self,
        content: String,
        path: Option<String>,
    ) -> Result<Vec<JsCandidate>> {
        let candidates = match source_kind(path.as_deref()) {
            SourceKind::JavaScript(kind) => extract_swc(&content, kind)
                .map_err(|error| Error::new(Status::InvalidArg, error.to_string()))?
                .into_iter()
                .map(|candidate| (candidate.raw(), candidate.span()))
                .collect::<Vec<_>>(),
            SourceKind::Framework(framework) => extract_for_framework(&content, framework)
                .into_iter()
                .map(|candidate| (candidate.raw(), candidate.span()))
                .collect(),
        };
        Ok(candidates
            .into_iter()
            .map(|(raw, span)| JsCandidate {
                raw: raw.to_owned(),
                start: span.start(),
                end: span.end(),
            })
            .collect())
    }

    /// Removes one source unit and returns whether it existed.
    #[napi]
    pub fn remove_source(&mut self, id: String) -> bool {
        self.inner.remove_source(&SourceId::new(id))
    }

    /// Builds the current sources and returns CSS, diagnostics, and counters.
    #[napi]
    pub fn build(&mut self) -> JsBuildResult {
        let output = self.inner.build();
        let diagnostics = output.diagnostics().iter().map(js_diagnostic).collect();
        let stats = output.stats();
        JsBuildResult {
            css: output.css().to_owned(),
            diagnostics,
            stats: JsStats {
                sources_scanned: saturating_u32(stats.sources_scanned()),
                bytes_scanned: saturating_u32(stats.bytes_scanned()),
                candidates_found: saturating_u32(stats.candidates_found()),
                unique_candidates: saturating_u32(stats.unique_candidates()),
                candidates_parsed: saturating_u32(stats.candidates_parsed()),
                cache_hits: saturating_u32(stats.cache_hits()),
                rules_generated: saturating_u32(stats.rules_generated()),
                rules_removed: saturating_u32(stats.rules_removed()),
            },
        }
    }

    /// Transforms authored CSS and resolves explicit `@apply` directives.
    #[napi]
    pub fn transform_stylesheet(
        &mut self,
        id: String,
        content: String,
        path: Option<String>,
    ) -> JsStylesheetResult {
        let source_id = SourceId::new(id);
        let input = match path {
            Some(path) => StylesheetInput::new(source_id, content).with_path(path),
            None => StylesheetInput::new(source_id, content),
        };
        let output = transform_stylesheet(&mut self.inner, input);
        JsStylesheetResult {
            css: output.css().to_owned(),
            diagnostics: output.diagnostics().iter().map(js_diagnostic).collect(),
        }
    }
}

fn js_diagnostic(diagnostic: &utilitycss_diagnostics::Diagnostic) -> JsDiagnostic {
    JsDiagnostic {
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
    }
}

fn saturating_u32(value: usize) -> u32 {
    u32::try_from(value).unwrap_or(u32::MAX)
}

enum SourceKind {
    JavaScript(SwcSourceKind),
    Framework(Framework),
}

fn source_kind(path: Option<&str>) -> SourceKind {
    let extension = path
        .map(std::path::Path::new)
        .and_then(std::path::Path::extension)
        .and_then(|extension| extension.to_str())
        .map(str::to_ascii_lowercase);
    match extension.as_deref() {
        Some("js") | Some("mjs") | Some("cjs") => SourceKind::JavaScript(SwcSourceKind::JavaScript),
        Some("jsx") | Some("mjsx") | Some("cjsx") => SourceKind::JavaScript(SwcSourceKind::Jsx),
        Some("ts") | Some("mts") | Some("cts") => SourceKind::JavaScript(SwcSourceKind::TypeScript),
        Some("tsx") | Some("mtsx") | Some("ctsx") => SourceKind::JavaScript(SwcSourceKind::Tsx),
        Some("vue") => SourceKind::Framework(Framework::Vue),
        Some("svelte") => SourceKind::Framework(Framework::Svelte),
        Some("astro") => SourceKind::Framework(Framework::Astro),
        _ => SourceKind::Framework(Framework::Html),
    }
}
