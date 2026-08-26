//! Runtime-independent compiler facade.
//!
//! This crate coordinates source indexing, candidate parsing, semantic resolution, and CSS output.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::{
    collections::{BTreeMap, BTreeSet},
    error::Error,
    fmt,
};

use utilitycss_css_ir::{CssDocument, CssSerializationMode, OrderKey};
use utilitycss_diagnostics::{Diagnostic, DiagnosticBag};
use utilitycss_scanner::scan;
use utilitycss_span::{SourceId, Span};
use utilitycss_syntax::parse;
use utilitycss_theme::Theme;
use utilitycss_utilities::{resolve, UtilityErrorKind, UtilityRegistry};
use utilitycss_variants::{apply, VariantRegistry};

/// Configuration for a compiler instance.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompilerConfig {
    theme: Theme,
    utilities: UtilityRegistry,
    variants: VariantRegistry,
    serialization_mode: CssSerializationMode,
}

impl CompilerConfig {
    /// Creates configuration with the built-in theme and registries.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Replaces the theme used for semantic resolution.
    #[must_use]
    pub fn with_theme(mut self, theme: Theme) -> Self {
        self.theme = theme;
        self
    }

    /// Replaces the utility registry.
    #[must_use]
    pub fn with_utility_registry(mut self, utilities: UtilityRegistry) -> Self {
        self.utilities = utilities;
        self
    }

    /// Replaces the variant registry.
    #[must_use]
    pub fn with_variant_registry(mut self, variants: VariantRegistry) -> Self {
        self.variants = variants;
        self
    }

    /// Selects the CSS serialization mode.
    #[must_use]
    pub fn with_serialization_mode(mut self, mode: CssSerializationMode) -> Self {
        self.serialization_mode = mode;
        self
    }

    /// Returns the configured theme.
    #[must_use]
    pub fn theme(&self) -> &Theme {
        &self.theme
    }

    /// Returns the configured utility registry.
    #[must_use]
    pub fn utilities(&self) -> &UtilityRegistry {
        &self.utilities
    }

    /// Returns the configured variant registry.
    #[must_use]
    pub fn variants(&self) -> &VariantRegistry {
        &self.variants
    }

    /// Returns the selected CSS serialization mode.
    #[must_use]
    pub const fn serialization_mode(&self) -> CssSerializationMode {
        self.serialization_mode
    }
}

impl Default for CompilerConfig {
    fn default() -> Self {
        Self {
            theme: Theme::default(),
            utilities: UtilityRegistry::default(),
            variants: VariantRegistry::default(),
            serialization_mode: CssSerializationMode::Minified,
        }
    }
}

/// Source content supplied by a host application.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SourceInput {
    id: SourceId,
    path: Option<String>,
    content: String,
}

impl SourceInput {
    /// Creates a source input without path metadata.
    #[must_use]
    pub fn new(id: SourceId, content: impl Into<String>) -> Self {
        Self { id, path: None, content: content.into() }
    }

    /// Adds optional path metadata without making the compiler depend on a filesystem.
    #[must_use]
    pub fn with_path(mut self, path: impl Into<String>) -> Self {
        self.path = Some(path.into());
        self
    }

    /// Returns the stable source identity.
    #[must_use]
    pub fn id(&self) -> &SourceId {
        &self.id
    }

    /// Returns optional path metadata.
    #[must_use]
    pub fn path(&self) -> Option<&str> {
        self.path.as_deref()
    }

    /// Returns the source content.
    #[must_use]
    pub fn content(&self) -> &str {
        &self.content
    }
}

/// A candidate supplied by an optional host-language extractor.
///
/// The candidate text MUST be an exact slice of the associated [`SourceInput`] content. This
/// keeps extractor adapters thin while preserving source-aware diagnostics in the compiler.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CandidateInput {
    raw: String,
    span: Span,
}

impl CandidateInput {
    /// Creates a candidate from its source text and byte span.
    #[must_use]
    pub fn new(raw: impl Into<String>, span: Span) -> Self {
        Self { raw: raw.into(), span }
    }

    /// Returns the candidate text.
    #[must_use]
    pub fn raw(&self) -> &str {
        &self.raw
    }

    /// Returns the candidate's byte span.
    #[must_use]
    pub const fn span(&self) -> Span {
        self.span
    }
}

/// Errors raised before a compiler build can begin.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CompilerError {
    /// The source identity was empty and could not support stable indexing.
    EmptySourceId,
    /// An extractor supplied a span that does not exactly match its candidate text.
    InvalidCandidateSpan {
        /// Candidate text supplied by the extractor.
        raw: String,
        /// Candidate span supplied by the extractor.
        span: Span,
    },
}

impl fmt::Display for CompilerError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptySourceId => formatter.write_str("source identity must not be empty"),
            Self::InvalidCandidateSpan { raw, span } => write!(
                formatter,
                "candidate `{raw}` does not match source span {}..{}",
                span.start(),
                span.end()
            ),
        }
    }
}

impl Error for CompilerError {}

/// The result of one compiler build.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompileOutput {
    css: String,
    diagnostics: DiagnosticBag,
    stats: CompileStats,
}

impl CompileOutput {
    /// Returns the serialized CSS output.
    #[must_use]
    pub fn css(&self) -> &str {
        &self.css
    }

    /// Returns diagnostics emitted during the build.
    #[must_use]
    pub const fn diagnostics(&self) -> &DiagnosticBag {
        &self.diagnostics
    }

    /// Returns counters for the work performed during this build.
    #[must_use]
    pub const fn stats(&self) -> &CompileStats {
        &self.stats
    }
}

/// Counters describing source scanning, candidate caching, and rule generation.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct CompileStats {
    sources_scanned: usize,
    bytes_scanned: usize,
    candidates_found: usize,
    unique_candidates: usize,
    candidates_parsed: usize,
    cache_hits: usize,
    rules_generated: usize,
    rules_removed: usize,
}

impl CompileStats {
    /// Returns the number of source updates that required scanning.
    #[must_use]
    pub const fn sources_scanned(&self) -> usize {
        self.sources_scanned
    }

    /// Returns the number of source bytes scanned during updates.
    #[must_use]
    pub const fn bytes_scanned(&self) -> usize {
        self.bytes_scanned
    }

    /// Returns the number of candidate occurrences found during updates.
    #[must_use]
    pub const fn candidates_found(&self) -> usize {
        self.candidates_found
    }

    /// Returns the number of unique candidates active at build time.
    #[must_use]
    pub const fn unique_candidates(&self) -> usize {
        self.unique_candidates
    }

    /// Returns the number of candidates parsed and resolved on this build.
    #[must_use]
    pub const fn candidates_parsed(&self) -> usize {
        self.candidates_parsed
    }

    /// Returns the number of active candidates served from the cache.
    #[must_use]
    pub const fn cache_hits(&self) -> usize {
        self.cache_hits
    }

    /// Returns the number of active rules emitted.
    #[must_use]
    pub const fn rules_generated(&self) -> usize {
        self.rules_generated
    }

    /// Returns the number of cached candidate rules removed from active references.
    #[must_use]
    pub const fn rules_removed(&self) -> usize {
        self.rules_removed
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct CandidateCacheEntry {
    rule: Option<utilitycss_css_ir::CssRule>,
    diagnostic: Option<Diagnostic>,
}

/// A compiler instance with deterministic source identity storage.
#[derive(Clone, Debug, Default)]
pub struct Compiler {
    config: CompilerConfig,
    sources: BTreeMap<SourceId, SourceInput>,
    source_candidates: BTreeMap<SourceId, BTreeMap<String, Vec<Span>>>,
    candidate_sources: BTreeMap<String, BTreeSet<SourceId>>,
    candidate_cache: BTreeMap<String, CandidateCacheEntry>,
    pending_stats: CompileStats,
}

impl Compiler {
    /// Creates an empty compiler instance.
    #[must_use]
    pub fn new(config: CompilerConfig) -> Self {
        Self {
            config,
            sources: BTreeMap::new(),
            source_candidates: BTreeMap::new(),
            candidate_sources: BTreeMap::new(),
            candidate_cache: BTreeMap::new(),
            pending_stats: CompileStats::default(),
        }
    }

    /// Inserts or replaces source content by stable source identity.
    pub fn update_source(&mut self, source: SourceInput) -> Result<(), CompilerError> {
        if source.id().as_str().is_empty() {
            return Err(CompilerError::EmptySourceId);
        }
        let source_id = source.id().clone();
        if let Some(previous) = self.sources.get(&source_id) {
            if previous.content() == source.content() {
                self.sources.insert(source_id, source);
                return Ok(());
            }
        }

        let tokens = scan(source.content())
            .into_iter()
            .map(|token| CandidateInput::new(token.raw(), token.span()))
            .collect::<Vec<_>>();
        self.update_source_with_candidates(source, tokens)
    }

    /// Inserts or replaces source content using candidates supplied by a host-language extractor.
    ///
    /// This operation retains the same indexes and cache behavior as [`Self::update_source`]. It
    /// is useful for AST-assisted adapters that already know which string literals are static.
    pub fn update_source_with_candidates<I>(
        &mut self,
        source: SourceInput,
        candidates: I,
    ) -> Result<(), CompilerError>
    where
        I: IntoIterator<Item = CandidateInput>,
    {
        if source.id().as_str().is_empty() {
            return Err(CompilerError::EmptySourceId);
        }
        let source_id = source.id().clone();

        let mut new_candidates: BTreeMap<String, Vec<Span>> = BTreeMap::new();
        let mut candidates_found = 0;
        for candidate in candidates {
            validate_candidate(&source, &candidate)?;
            candidates_found += 1;
            new_candidates.entry(candidate.raw).or_default().push(candidate.span);
        }
        let previous_candidates =
            self.source_candidates.get(&source_id).cloned().unwrap_or_default();
        for raw in previous_candidates.keys() {
            if !new_candidates.contains_key(raw) {
                self.remove_candidate_reference(raw, &source_id);
            }
        }
        for raw in new_candidates.keys() {
            if !previous_candidates.contains_key(raw) {
                self.candidate_sources.entry(raw.clone()).or_default().insert(source_id.clone());
            }
        }
        self.source_candidates.insert(source_id.clone(), new_candidates);
        self.pending_stats.sources_scanned += 1;
        self.pending_stats.bytes_scanned += source.content().len();
        self.pending_stats.candidates_found += candidates_found;
        self.sources.insert(source_id, source);
        Ok(())
    }

    /// Removes a source and returns whether it was present.
    pub fn remove_source(&mut self, id: &SourceId) -> bool {
        let Some(previous_candidates) = self.source_candidates.remove(id) else {
            return self.sources.remove(id).is_some();
        };
        for raw in previous_candidates.keys() {
            self.remove_candidate_reference(raw, id);
        }
        self.sources.remove(id).is_some()
    }

    /// Replaces compiler configuration and invalidates semantic candidate caches.
    pub fn replace_config(&mut self, config: CompilerConfig) {
        self.config = config;
        self.candidate_cache.clear();
    }

    /// Removes all sources, indexes, and cached semantic results.
    pub fn reset(&mut self) {
        self.sources.clear();
        self.source_candidates.clear();
        self.candidate_sources.clear();
        self.candidate_cache.clear();
        self.pending_stats = CompileStats::default();
    }

    /// Returns the number of source units currently registered.
    #[must_use]
    pub fn source_count(&self) -> usize {
        self.sources.len()
    }

    /// Builds all known source units into deterministic CSS and diagnostics.
    #[must_use]
    pub fn build(&mut self) -> CompileOutput {
        let mut stats = std::mem::take(&mut self.pending_stats);
        stats.unique_candidates = self.candidate_sources.len();
        let mut document = CssDocument::new();
        let mut diagnostics = DiagnosticBag::new();
        for (raw, source_ids) in &self.candidate_sources {
            if source_ids.is_empty() {
                continue;
            }
            let (entry, was_cached) = if let Some(entry) = self.candidate_cache.get(raw).cloned() {
                (entry, true)
            } else {
                let entry = compile_candidate(raw, &self.config);
                self.candidate_cache.insert(raw.clone(), entry.clone());
                (entry, false)
            };
            if was_cached {
                stats.cache_hits += 1;
            } else {
                stats.candidates_parsed += 1;
            }
            if let Some(rule) = entry.rule {
                stats.rules_generated += 1;
                document.push(rule);
            }
            if let Some(diagnostic) = entry.diagnostic {
                for source_id in source_ids {
                    if let Some(spans) = self
                        .source_candidates
                        .get(source_id)
                        .and_then(|candidates| candidates.get(raw))
                    {
                        for span in spans {
                            diagnostics.push(
                                diagnostic.clone().with_source(source_id.clone()).with_span(*span),
                            );
                        }
                    }
                }
            }
        }

        CompileOutput { css: document.to_css(self.config.serialization_mode()), diagnostics, stats }
    }

    /// Returns the current compiler configuration.
    #[must_use]
    pub const fn config(&self) -> &CompilerConfig {
        &self.config
    }

    fn remove_candidate_reference(&mut self, raw: &str, source_id: &SourceId) {
        let mut remove_candidate = false;
        if let Some(source_ids) = self.candidate_sources.get_mut(raw) {
            source_ids.remove(source_id);
            remove_candidate = source_ids.is_empty();
        }
        if remove_candidate {
            self.candidate_sources.remove(raw);
            self.pending_stats.rules_removed += 1;
        }
    }
}

fn compile_candidate(raw: &str, config: &CompilerConfig) -> CandidateCacheEntry {
    let diagnostic_source = SourceId::new("");
    let diagnostic_span = Span::empty(0);
    let candidate = match parse(raw) {
        Ok(candidate) => candidate,
        Err(error) => {
            return CandidateCacheEntry {
                rule: None,
                diagnostic: Some(error.to_diagnostic(diagnostic_source, diagnostic_span)),
            };
        }
    };
    let utility = match resolve(&candidate, config.theme(), config.utilities()) {
        Ok(utility) => utility,
        Err(error) if error.kind() == UtilityErrorKind::UnknownUtility => {
            return CandidateCacheEntry { rule: None, diagnostic: None };
        }
        Err(error) => {
            return CandidateCacheEntry {
                rule: None,
                diagnostic: Some(error.to_diagnostic(diagnostic_source, diagnostic_span)),
            };
        }
    };
    let utility_order = utility.order();
    let tie_breaker = stable_hash(raw.as_bytes());
    let rule = utility.into_rule(tie_breaker);
    let rule = match apply(&candidate, rule, config.theme(), config.variants()) {
        Ok(rule) => rule,
        Err(error) => {
            return CandidateCacheEntry {
                rule: None,
                diagnostic: Some(error.to_diagnostic(diagnostic_source, diagnostic_span)),
            };
        }
    };
    let variant_order = config.variants().order(&candidate, config.theme());
    CandidateCacheEntry {
        rule: Some(rule.with_order(OrderKey::new(0, variant_order, utility_order, tie_breaker))),
        diagnostic: None,
    }
}

fn validate_candidate(
    source: &SourceInput,
    candidate: &CandidateInput,
) -> Result<(), CompilerError> {
    let start = usize::try_from(candidate.span.start()).unwrap_or(usize::MAX);
    let end = usize::try_from(candidate.span.end()).unwrap_or(usize::MAX);
    let matches_source = source.content().get(start..end) == Some(candidate.raw.as_str());
    if matches_source {
        Ok(())
    } else {
        Err(CompilerError::InvalidCandidateSpan {
            raw: candidate.raw.clone(),
            span: candidate.span,
        })
    }
}

fn stable_hash(bytes: &[u8]) -> u64 {
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

#[cfg(test)]
mod tests {
    use utilitycss_css_ir::CssSerializationMode;
    use utilitycss_span::SourceId;

    use utilitycss_span::Span;

    use super::{CandidateInput, Compiler, CompilerConfig, CompilerError, SourceInput};

    #[test]
    fn source_updates_are_replacements() {
        let mut compiler = Compiler::new(CompilerConfig::new());
        let id = SourceId::new("src/app.html");

        compiler
            .update_source(SourceInput::new(id.clone(), "<div />"))
            .expect("source ID is valid");
        compiler.update_source(SourceInput::new(id, "<main />")).expect("source ID is valid");

        assert_eq!(compiler.source_count(), 1);
        assert_eq!(compiler.build().css(), "");
        assert!(compiler.build().diagnostics().is_empty());
    }

    #[test]
    fn empty_source_ids_are_typed_errors() {
        let mut compiler = Compiler::new(CompilerConfig::new());
        let result = compiler.update_source(SourceInput::new(SourceId::new(""), "content"));

        assert_eq!(result, Err(CompilerError::EmptySourceId));
    }

    #[test]
    fn compiles_deduplicated_candidates_through_the_initial_pipeline() {
        let mut compiler = Compiler::new(
            CompilerConfig::new().with_serialization_mode(CssSerializationMode::Minified),
        );
        compiler
            .update_source(SourceInput::new(
                SourceId::new("src/app.html"),
                r#"<div class="flex p-4 p-4 hover:bg-red-500/50 md:grid"></div>"#,
            ))
            .expect("source ID is valid");

        let output = compiler.build();

        assert!(output.css().contains(".flex{display:flex;}"));
        assert!(output.css().contains(".p-4{padding:1rem;}"));
        assert!(output.css().contains("@media (min-width: 768px){"));
        assert_eq!(output.css().matches(".p-4{").count(), 1);
        assert!(output.diagnostics().is_empty());
    }

    #[test]
    fn incremental_build_matches_a_clean_rebuild() {
        let first_id = SourceId::new("src/first.html");
        let second_id = SourceId::new("src/second.html");
        let first_source = SourceInput::new(first_id.clone(), r#"<div class="p-4"></div>"#);
        let second_source = SourceInput::new(second_id.clone(), r#"<div class="flex"></div>"#);
        let changed_source =
            SourceInput::new(first_id.clone(), r#"<div class="p-8 hover:bg-red-500"></div>"#);

        let mut incremental = Compiler::new(CompilerConfig::new());
        incremental.update_source(first_source).expect("source ID is valid");
        incremental.update_source(second_source.clone()).expect("source ID is valid");
        let initial = incremental.build();
        assert!(initial.stats().candidates_parsed() > 0);

        incremental.update_source(changed_source.clone()).expect("source ID is valid");
        let incremental_output = incremental.build();

        let mut clean = Compiler::new(CompilerConfig::new());
        clean.update_source(changed_source).expect("source ID is valid");
        clean.update_source(second_source).expect("source ID is valid");
        let clean_output = clean.build();

        assert_eq!(incremental_output.css(), clean_output.css());
        assert_eq!(incremental_output.diagnostics(), clean_output.diagnostics());
        assert!(incremental_output.stats().cache_hits() > 0);
        assert!(incremental_output.stats().candidates_parsed() > 0);
    }

    #[test]
    fn no_op_updates_use_cached_candidates_and_removals_drop_rules() {
        let id = SourceId::new("src/app.html");
        let source = SourceInput::new(id.clone(), r#"<div class="p-4"></div>"#);
        let mut compiler = Compiler::new(CompilerConfig::new());

        compiler.update_source(source.clone()).expect("source ID is valid");
        let first = compiler.build();
        compiler.update_source(source).expect("same source ID is valid");
        let no_op = compiler.build();

        assert_eq!(no_op.stats().sources_scanned(), 0);
        assert_eq!(no_op.stats().candidates_parsed(), 0);
        assert!(no_op.stats().cache_hits() > 0);
        assert_eq!(no_op.css(), first.css());

        assert!(compiler.remove_source(&id));
        let removed = compiler.build();
        assert_eq!(removed.css(), "");
        assert!(removed.stats().rules_removed() > 0);
    }

    #[test]
    fn configuration_replacement_invalidates_semantic_cache() {
        let id = SourceId::new("src/app.html");
        let source = SourceInput::new(id, r#"<div class="bg-red-500"></div>"#);
        let mut compiler = Compiler::new(CompilerConfig::new());
        compiler.update_source(source).expect("source ID is valid");
        let first = compiler.build();

        let theme = utilitycss_theme::Theme::builder().color("red-500", "#123456").build();
        compiler.replace_config(CompilerConfig::new().with_theme(theme));
        let second = compiler.build();

        assert_ne!(first.css(), second.css());
        assert!(second.stats().candidates_parsed() > 0);
    }

    #[test]
    fn host_extractors_can_supply_validated_candidates() {
        let source = r#"const classes = clsx("p-4");"#;
        let start = source.find("p-4").expect("candidate is present");
        let end = start + "p-4".len();
        let mut compiler = Compiler::new(CompilerConfig::new());

        compiler
            .update_source_with_candidates(
                SourceInput::new(SourceId::new("src/app.tsx"), source),
                [CandidateInput::new(
                    "p-4",
                    Span::new(start as u32, end as u32).expect("span is ordered"),
                )],
            )
            .expect("candidate span matches source");

        assert!(compiler.build().css().contains(".p-4{"));
    }

    #[test]
    fn host_extractors_cannot_invent_candidate_spans() {
        let mut compiler = Compiler::new(CompilerConfig::new());
        let result = compiler.update_source_with_candidates(
            SourceInput::new(SourceId::new("src/app.tsx"), "const classes = \"p-4\";"),
            [CandidateInput::new("p-8", Span::new(17, 20).expect("span is ordered"))],
        );

        assert!(matches!(result, Err(CompilerError::InvalidCandidateSpan { .. })));
    }

    #[test]
    fn diagnostics_preserve_every_duplicate_candidate_occurrence() {
        let source =
            SourceInput::new(SourceId::new("src/app.html"), r#"<div class="p-[] p-[]"></div>"#);
        let mut compiler = Compiler::new(CompilerConfig::new());
        compiler.update_source(source).expect("source is valid");

        let output = compiler.build();
        let diagnostics = output.diagnostics().iter().collect::<Vec<_>>();

        assert_eq!(diagnostics.len(), 2);
        assert_ne!(diagnostics[0].span(), diagnostics[1].span());
    }
}
