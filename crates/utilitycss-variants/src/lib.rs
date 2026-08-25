//! Variant registry and transformations for selectors and CSS wrappers.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::{collections::BTreeMap, error::Error, fmt};

use utilitycss_css_ir::CssRule;
use utilitycss_diagnostics::{Diagnostic, DiagnosticCode};
use utilitycss_span::{SourceId, Span};
use utilitycss_syntax::{CandidateAst, ValueAst, VariantAst, VariantKind};
use utilitycss_theme::Theme;

/// A registered variant behavior.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum VariantDefinition {
    /// Appends a pseudo-class or pseudo-element to each selector.
    Pseudo {
        /// Pseudo selector suffix, including its leading colon.
        suffix: String,
        /// Stable variant ordering rank.
        order: u16,
    },
    /// Wraps rules in an at-rule.
    Media {
        /// At-rule name such as `media`.
        name: String,
        /// At-rule prelude.
        prelude: String,
        /// Stable variant ordering rank.
        order: u16,
    },
    /// Prefixes each selector with an ancestor selector and combinator.
    Ancestor {
        /// Selector prefix, including any trailing combinator whitespace.
        prefix: String,
        /// Stable variant ordering rank.
        order: u16,
    },
}

impl VariantDefinition {
    /// Creates a pseudo selector variant.
    #[must_use]
    pub fn pseudo(suffix: impl Into<String>, order: u16) -> Self {
        Self::Pseudo { suffix: suffix.into(), order }
    }

    /// Creates an at-rule wrapper variant.
    #[must_use]
    pub fn media(name: impl Into<String>, prelude: impl Into<String>, order: u16) -> Self {
        Self::Media { name: name.into(), prelude: prelude.into(), order }
    }

    /// Creates an ancestor selector variant.
    #[must_use]
    pub fn ancestor(prefix: impl Into<String>, order: u16) -> Self {
        Self::Ancestor { prefix: prefix.into(), order }
    }

    fn order(&self) -> u16 {
        match self {
            Self::Pseudo { order, .. }
            | Self::Media { order, .. }
            | Self::Ancestor { order, .. } => *order,
        }
    }
}

/// Built-in variant definitions indexed by their source name.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VariantRegistry {
    definitions: BTreeMap<String, VariantDefinition>,
}

impl VariantRegistry {
    /// Creates a registry containing the initial pseudo and dark variants.
    #[must_use]
    pub fn new() -> Self {
        let mut registry = Self { definitions: BTreeMap::new() };
        for (name, suffix, order) in [
            ("hover", ":hover", 100),
            ("focus", ":focus", 110),
            ("active", ":active", 120),
            ("disabled", ":disabled", 130),
        ] {
            registry.register(name, VariantDefinition::pseudo(suffix, order));
        }
        registry.register(
            "dark",
            VariantDefinition::media("media", "(prefers-color-scheme: dark)", 300),
        );
        registry.register("group-hover", VariantDefinition::ancestor(".group:hover ", 150));
        registry.register("peer-checked", VariantDefinition::ancestor(".peer:checked ~ ", 160));
        registry
    }

    /// Registers or replaces a named variant.
    pub fn register(&mut self, name: impl Into<String>, definition: VariantDefinition) {
        self.definitions.insert(name.into(), definition);
    }

    /// Returns a named variant definition.
    #[must_use]
    pub fn get(&self, name: &str) -> Option<&VariantDefinition> {
        self.definitions.get(name)
    }

    /// Returns the highest registered ordering rank in a candidate's variant chain.
    #[must_use]
    pub fn order(&self, candidate: &CandidateAst<'_>, theme: &Theme) -> u16 {
        candidate
            .variants()
            .iter()
            .map(|variant| match variant.kind() {
                VariantKind::Named { name, .. } => self
                    .get(name)
                    .map_or_else(|| breakpoint_order(name, theme), VariantDefinition::order),
                VariantKind::Arbitrary { .. } => 500,
            })
            .max()
            .unwrap_or(0)
    }
}

impl Default for VariantRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// The category of a variant resolution error.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum VariantErrorKind {
    /// No registered or built-in variant matched the source segment.
    UnknownVariant,
    /// A variant value is malformed or unsupported.
    InvalidValue,
    /// A selector contains a structure-breaking character.
    UnsafeSelector,
}

impl VariantErrorKind {
    const fn code(self) -> DiagnosticCode {
        DiagnosticCode::new(match self {
            Self::UnknownVariant => "variant.unknown",
            Self::InvalidValue => "variant.invalid-value",
            Self::UnsafeSelector => "variant.unsafe-selector",
        })
    }
}

/// A typed error raised while applying a variant chain.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VariantError {
    kind: VariantErrorKind,
    name: String,
    value: Option<String>,
}

impl VariantError {
    fn new(kind: VariantErrorKind, name: &str, value: Option<&str>) -> Self {
        Self { kind, name: name.to_owned(), value: value.map(str::to_owned) }
    }

    /// Returns the error category.
    #[must_use]
    pub const fn kind(&self) -> VariantErrorKind {
        self.kind
    }

    /// Returns the variant name involved in the error.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Converts the error into a source-aware diagnostic.
    #[must_use]
    pub fn to_diagnostic(&self, source: SourceId, span: Span) -> Diagnostic {
        Diagnostic::error(self.kind.code(), self.to_string()).with_source(source).with_span(span)
    }
}

impl fmt::Display for VariantError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match (self.kind, self.value.as_deref()) {
            (VariantErrorKind::UnknownVariant, _) => {
                write!(formatter, "unknown variant `{}`", self.name)
            }
            (VariantErrorKind::InvalidValue, Some(value)) => {
                write!(formatter, "invalid value `{value}` for variant `{}`", self.name)
            }
            (VariantErrorKind::UnsafeSelector, Some(value)) => {
                write!(formatter, "unsafe selector `{value}` for variant `{}`", self.name)
            }
            _ => write!(formatter, "invalid variant `{}`", self.name),
        }
    }
}

impl Error for VariantError {}

/// Applies a candidate's variants to a resolved base rule.
pub fn apply(
    candidate: &CandidateAst<'_>,
    mut rule: CssRule,
    theme: &Theme,
    registry: &VariantRegistry,
) -> Result<CssRule, VariantError> {
    for variant in candidate.variants().iter().rev() {
        rule = apply_one(variant, rule, theme, registry)?;
    }
    Ok(rule)
}

fn apply_one(
    variant: &VariantAst<'_>,
    rule: CssRule,
    theme: &Theme,
    registry: &VariantRegistry,
) -> Result<CssRule, VariantError> {
    match variant.kind() {
        VariantKind::Arbitrary { selector } => {
            let selector = safe_selector(selector, "[arbitrary]")?;
            Ok(rule.map_selectors(|base| apply_selector(selector, base)))
        }
        VariantKind::Named { name, value } => {
            if let Some(definition) = registry.get(name) {
                return Ok(apply_definition(definition, rule));
            }
            if let Some(value) = value {
                if matches!(name, "data" | "aria") {
                    return apply_attribute(name, value, rule);
                }
                return Err(VariantError::new(
                    VariantErrorKind::InvalidValue,
                    name,
                    Some(value.content()),
                ));
            }
            if let Some(breakpoint) = theme.breakpoint(name) {
                return Ok(CssRule::at_rule(
                    rule.order(),
                    "media",
                    format!("(min-width: {breakpoint})"),
                    vec![rule],
                ));
            }
            Err(VariantError::new(VariantErrorKind::UnknownVariant, name, None))
        }
    }
}

fn apply_definition(definition: &VariantDefinition, rule: CssRule) -> CssRule {
    match definition {
        VariantDefinition::Pseudo { suffix, .. } => {
            rule.map_selectors(|selector| format!("{selector}{suffix}"))
        }
        VariantDefinition::Media { name, prelude, .. } => {
            CssRule::at_rule(rule.order(), name, prelude, vec![rule])
        }
        VariantDefinition::Ancestor { prefix, .. } => {
            rule.map_selectors(|selector| format!("{prefix}{selector}"))
        }
    }
}

fn apply_attribute(
    name: &str,
    value: ValueAst<'_>,
    rule: CssRule,
) -> Result<CssRule, VariantError> {
    let content = safe_selector(value.content(), name)?;
    if content.is_empty() {
        return Err(VariantError::new(VariantErrorKind::InvalidValue, name, Some(content)));
    }
    Ok(rule.map_selectors(|selector| format!("{selector}[{name}-{content}]")))
}

fn safe_selector<'a>(selector: &'a str, name: &str) -> Result<&'a str, VariantError> {
    if selector.chars().any(|character| matches!(character, '{' | '}' | ';' | '\n' | '\r'))
        || selector.contains("/*")
        || selector.contains("*/")
    {
        return Err(VariantError::new(VariantErrorKind::UnsafeSelector, name, Some(selector)));
    }
    Ok(selector)
}

fn apply_selector(selector: &str, base: &str) -> String {
    if selector.contains('&') {
        selector.replace('&', base)
    } else {
        format!("{selector} {base}")
    }
}

fn breakpoint_order(name: &str, theme: &Theme) -> u16 {
    if theme.breakpoint(name).is_some() {
        match name {
            "sm" => 200,
            "md" => 210,
            "lg" => 220,
            "xl" => 230,
            _ => 240,
        }
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use utilitycss_css_ir::{CssDeclaration, CssRule, CssSerializationMode, OrderKey};
    use utilitycss_syntax::parse;
    use utilitycss_theme::Theme;

    use super::{apply, VariantErrorKind, VariantRegistry};

    fn base_rule() -> CssRule {
        CssRule::style(
            OrderKey::default(),
            ".hover\\:bg-red-500",
            vec![CssDeclaration::new("color", "red")],
        )
    }

    #[test]
    fn applies_pseudo_and_responsive_variants_in_author_order() {
        let candidate = parse("md:hover:bg-red-500").expect("candidate is valid");
        let rule = apply(&candidate, base_rule(), &Theme::default(), &VariantRegistry::new())
            .expect("built-in variants are valid");
        let mut document = utilitycss_css_ir::CssDocument::new();
        document.push(rule);

        assert_eq!(
            document.to_css(CssSerializationMode::Minified),
            "@media (min-width: 768px){.hover\\:bg-red-500:hover{color:red;}}"
        );
    }

    #[test]
    fn applies_arbitrary_and_attribute_variants() {
        let arbitrary = parse("[&>*]:p-4").expect("candidate is valid");
        let arbitrary_rule =
            apply(&arbitrary, base_rule(), &Theme::default(), &VariantRegistry::new())
                .expect("arbitrary selector is safe");
        assert_eq!(arbitrary_rule.selector(), Some(".hover\\:bg-red-500>*"));

        let data = parse("data-[state=open]:p-4").expect("candidate is valid");
        let data_rule = apply(&data, base_rule(), &Theme::default(), &VariantRegistry::new())
            .expect("attribute selector is safe");
        assert_eq!(data_rule.selector(), Some(".hover\\:bg-red-500[data-state=open]"));
    }

    #[test]
    fn rejects_unknown_variants() {
        let candidate = parse("unknown:p-4").expect("candidate is syntactically valid");
        let error = apply(&candidate, base_rule(), &Theme::default(), &VariantRegistry::new())
            .expect_err("variant is not registered");

        assert_eq!(error.kind(), VariantErrorKind::UnknownVariant);
    }
}
