//! Registry and semantic lowering for the initial utility set.
//!
//! Utility lowering produces declarations and an escaped class selector. Variants are applied by
//! the separate `utilitycss-variants` crate.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::{collections::BTreeMap, error::Error, fmt};

use utilitycss_css_ir::{CssDeclaration, CssRule, OrderKey};
use utilitycss_diagnostics::{Diagnostic, DiagnosticCode};
use utilitycss_span::{SourceId, Span};
use utilitycss_syntax::{CandidateAst, ValueAst};
use utilitycss_theme::Theme;

/// The edge or axis affected by a spacing utility.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum SpacingEdge {
    /// All sides or the unqualified property.
    All,
    /// Horizontal sides.
    X,
    /// Vertical sides.
    Y,
    /// The top side.
    Top,
    /// The right side.
    Right,
    /// The bottom side.
    Bottom,
    /// The left side.
    Left,
}

/// A dimension affected by a sizing utility.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum Dimension {
    /// The `width` property.
    Width,
    /// The `height` property.
    Height,
    /// The `min-width` property.
    MinWidth,
    /// The `max-width` property.
    MaxWidth,
    /// The `min-height` property.
    MinHeight,
    /// The `max-height` property.
    MaxHeight,
}

impl Dimension {
    fn property(self) -> &'static str {
        match self {
            Self::Width => "width",
            Self::Height => "height",
            Self::MinWidth => "min-width",
            Self::MaxWidth => "max-width",
            Self::MinHeight => "min-height",
            Self::MaxHeight => "max-height",
        }
    }
}

/// The color property affected by a color utility.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum ColorKind {
    /// The `background-color` property.
    Background,
    /// The `color` property.
    Text,
    /// The `border-color` property.
    Border,
}

impl ColorKind {
    fn property(self) -> &'static str {
        match self {
            Self::Background => "background-color",
            Self::Text => "color",
            Self::Border => "border-color",
        }
    }
}

/// A semantic utility definition registered under a family name.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum UtilityDefinition {
    /// A fixed property/value pair such as `flex` or `hidden`.
    Static {
        /// CSS property name.
        property: String,
        /// CSS property value.
        value: String,
        /// Stable utility ordering rank.
        order: u16,
    },
    /// A padding or margin utility.
    Spacing {
        /// Whether the utility writes padding or margin.
        margin: bool,
        /// Sides affected by the utility.
        edge: SpacingEdge,
        /// Stable utility ordering rank.
        order: u16,
    },
    /// A gap utility.
    Gap {
        /// Sides/axes affected by the gap utility.
        edge: SpacingEdge,
        /// Stable utility ordering rank.
        order: u16,
    },
    /// A width or height utility.
    Size {
        /// Dimension affected by the utility.
        dimension: Dimension,
        /// Stable utility ordering rank.
        order: u16,
    },
    /// A color utility.
    Color {
        /// Color property affected by the utility.
        kind: ColorKind,
        /// Stable utility ordering rank.
        order: u16,
    },
    /// A border-radius utility.
    Radius {
        /// Stable utility ordering rank.
        order: u16,
    },
    /// An `align-items` utility.
    AlignItems {
        /// Stable utility ordering rank.
        order: u16,
    },
    /// A `justify-content` utility.
    JustifyContent {
        /// Stable utility ordering rank.
        order: u16,
    },
    /// A `grid-template-columns` utility.
    GridColumns {
        /// Stable utility ordering rank.
        order: u16,
    },
}

impl UtilityDefinition {
    /// Creates a fixed property/value utility definition.
    #[must_use]
    pub fn static_declaration(
        property: impl Into<String>,
        value: impl Into<String>,
        order: u16,
    ) -> Self {
        Self::Static { property: property.into(), value: value.into(), order }
    }

    fn order(&self) -> u16 {
        match self {
            Self::Static { order, .. }
            | Self::Spacing { order, .. }
            | Self::Gap { order, .. }
            | Self::Size { order, .. }
            | Self::Color { order, .. }
            | Self::Radius { order }
            | Self::AlignItems { order }
            | Self::JustifyContent { order }
            | Self::GridColumns { order } => *order,
        }
    }
}

/// Built-in utility definitions indexed by family.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UtilityRegistry {
    definitions: BTreeMap<String, UtilityDefinition>,
}

impl UtilityRegistry {
    /// Creates a registry containing the initial built-in utility set.
    #[must_use]
    pub fn new() -> Self {
        let mut registry = Self { definitions: BTreeMap::new() };
        registry.register("block", UtilityDefinition::static_declaration("display", "block", 10));
        registry.register("inline", UtilityDefinition::static_declaration("display", "inline", 10));
        registry.register("flex", UtilityDefinition::static_declaration("display", "flex", 10));
        registry.register("grid", UtilityDefinition::static_declaration("display", "grid", 10));
        registry.register("hidden", UtilityDefinition::static_declaration("display", "none", 10));

        for (family, edge) in [
            ("p", SpacingEdge::All),
            ("px", SpacingEdge::X),
            ("py", SpacingEdge::Y),
            ("pt", SpacingEdge::Top),
            ("pr", SpacingEdge::Right),
            ("pb", SpacingEdge::Bottom),
            ("pl", SpacingEdge::Left),
        ] {
            registry
                .register(family, UtilityDefinition::Spacing { margin: false, edge, order: 20 });
        }
        for (family, edge) in [
            ("m", SpacingEdge::All),
            ("mx", SpacingEdge::X),
            ("my", SpacingEdge::Y),
            ("mt", SpacingEdge::Top),
            ("mr", SpacingEdge::Right),
            ("mb", SpacingEdge::Bottom),
            ("ml", SpacingEdge::Left),
        ] {
            registry.register(family, UtilityDefinition::Spacing { margin: true, edge, order: 21 });
        }
        for (family, edge) in
            [("gap", SpacingEdge::All), ("gap-x", SpacingEdge::X), ("gap-y", SpacingEdge::Y)]
        {
            registry.register(family, UtilityDefinition::Gap { edge, order: 22 });
        }

        for (family, dimension) in [
            ("w", Dimension::Width),
            ("h", Dimension::Height),
            ("min-w", Dimension::MinWidth),
            ("max-w", Dimension::MaxWidth),
            ("min-h", Dimension::MinHeight),
            ("max-h", Dimension::MaxHeight),
        ] {
            registry.register(family, UtilityDefinition::Size { dimension, order: 30 });
        }

        registry
            .register("bg", UtilityDefinition::Color { kind: ColorKind::Background, order: 40 });
        registry.register("text", UtilityDefinition::Color { kind: ColorKind::Text, order: 41 });
        registry
            .register("border", UtilityDefinition::Color { kind: ColorKind::Border, order: 42 });
        registry.register("rounded", UtilityDefinition::Radius { order: 50 });
        registry.register("items", UtilityDefinition::AlignItems { order: 60 });
        registry.register("justify", UtilityDefinition::JustifyContent { order: 61 });
        registry.register("grid-cols", UtilityDefinition::GridColumns { order: 62 });
        registry
    }

    /// Registers or replaces a utility family.
    pub fn register(&mut self, family: impl Into<String>, definition: UtilityDefinition) {
        self.definitions.insert(family.into(), definition);
    }

    /// Returns a registered definition for a utility family.
    #[must_use]
    pub fn get(&self, family: &str) -> Option<&UtilityDefinition> {
        self.definitions.get(family)
    }

    /// Returns whether a utility family is registered.
    #[must_use]
    pub fn contains(&self, family: &str) -> bool {
        self.definitions.contains_key(family)
    }
}

impl Default for UtilityRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// The category of a utility resolution error.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UtilityErrorKind {
    /// No definition was registered for the family.
    UnknownUtility,
    /// A value was required but was absent.
    MissingValue,
    /// A named value was not found in the relevant theme map.
    UnknownThemeValue,
    /// An arbitrary value contains characters that could escape a declaration.
    InvalidArbitraryValue,
    /// A negative marker was used by a utility that does not support it.
    UnsupportedNegative,
    /// A named value is not accepted by the utility family.
    InvalidValue,
    /// A utility that accepts no value received one.
    UnexpectedValue,
}

impl UtilityErrorKind {
    const fn code(self) -> DiagnosticCode {
        DiagnosticCode::new(match self {
            Self::UnknownUtility => "utility.unknown",
            Self::MissingValue => "utility.missing-value",
            Self::UnknownThemeValue => "utility.unknown-theme-value",
            Self::InvalidArbitraryValue => "utility.invalid-arbitrary-value",
            Self::UnsupportedNegative => "utility.unsupported-negative",
            Self::InvalidValue => "utility.invalid-value",
            Self::UnexpectedValue => "utility.unexpected-value",
        })
    }
}

/// A typed error raised while lowering one parsed utility.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UtilityError {
    kind: UtilityErrorKind,
    family: String,
    value: Option<String>,
}

impl UtilityError {
    fn new(kind: UtilityErrorKind, family: &str, value: Option<&str>) -> Self {
        Self { kind, family: family.to_owned(), value: value.map(str::to_owned) }
    }

    /// Returns the error category.
    #[must_use]
    pub const fn kind(&self) -> UtilityErrorKind {
        self.kind
    }

    /// Returns the utility family involved in the error.
    #[must_use]
    pub fn family(&self) -> &str {
        &self.family
    }

    /// Returns the optional value involved in the error.
    #[must_use]
    pub fn value(&self) -> Option<&str> {
        self.value.as_deref()
    }

    /// Converts the error into a source-aware diagnostic.
    #[must_use]
    pub fn to_diagnostic(&self, source: SourceId, span: Span) -> Diagnostic {
        Diagnostic::error(self.kind.code(), self.to_string()).with_source(source).with_span(span)
    }
}

impl fmt::Display for UtilityError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match (self.kind, self.value.as_deref()) {
            (UtilityErrorKind::UnknownUtility, _) => {
                write!(formatter, "unknown utility family `{}`", self.family)
            }
            (UtilityErrorKind::MissingValue, _) => {
                write!(formatter, "utility `{}` requires a value", self.family)
            }
            (UtilityErrorKind::UnknownThemeValue, Some(value)) => {
                write!(formatter, "unknown theme value `{value}` for utility `{}`", self.family)
            }
            (UtilityErrorKind::InvalidArbitraryValue, Some(value)) => {
                write!(formatter, "unsafe arbitrary value `{value}` for utility `{}`", self.family)
            }
            (UtilityErrorKind::UnsupportedNegative, _) => {
                write!(formatter, "utility `{}` does not support negative values", self.family)
            }
            (UtilityErrorKind::InvalidValue, Some(value)) => {
                write!(formatter, "invalid value `{value}` for utility `{}`", self.family)
            }
            (UtilityErrorKind::UnexpectedValue, Some(value)) => {
                write!(formatter, "utility `{}` does not accept value `{value}`", self.family)
            }
            _ => write!(formatter, "invalid utility `{}`", self.family),
        }
    }
}

impl Error for UtilityError {}

/// A utility lowered into a selector, declarations, and a stable utility rank.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResolvedUtility {
    selector: String,
    declarations: Vec<CssDeclaration>,
    order: u16,
}

impl ResolvedUtility {
    /// Returns the escaped class selector.
    #[must_use]
    pub fn selector(&self) -> &str {
        &self.selector
    }

    /// Returns declarations in their deterministic property order.
    #[must_use]
    pub fn declarations(&self) -> &[CssDeclaration] {
        &self.declarations
    }

    /// Returns the utility ordering rank.
    #[must_use]
    pub const fn order(&self) -> u16 {
        self.order
    }

    /// Converts this utility into a CSS IR style rule.
    #[must_use]
    pub fn into_rule(self, tie_breaker: u64) -> CssRule {
        CssRule::style(
            OrderKey::new(0, 0, self.order, tie_breaker),
            self.selector,
            self.declarations,
        )
    }
}

/// Resolves a parsed candidate through a registry and theme.
pub fn resolve(
    candidate: &CandidateAst<'_>,
    theme: &Theme,
    registry: &UtilityRegistry,
) -> Result<ResolvedUtility, UtilityError> {
    let utility = candidate.utility();
    let family = utility.family();
    let family_definition = registry.get(family);
    let exact_definition = registry.get(utility.raw());
    let definition = family_definition
        .or(exact_definition)
        .ok_or_else(|| UtilityError::new(UtilityErrorKind::UnknownUtility, family, None))?;
    let exact_name_match = family_definition.is_none();
    let value_text = utility.value().map(ValueAst::content);
    let important = candidate.is_important();
    let declarations = match definition {
        UtilityDefinition::Static { property, value, .. } => {
            if utility.is_negative() {
                return Err(UtilityError::new(
                    UtilityErrorKind::UnsupportedNegative,
                    family,
                    value_text,
                ));
            }
            if value_text.is_some() && !exact_name_match {
                return Err(UtilityError::new(
                    UtilityErrorKind::UnexpectedValue,
                    family,
                    value_text,
                ));
            }
            vec![CssDeclaration::new(property.clone(), value.clone()).with_important(important)]
        }
        UtilityDefinition::Spacing { margin, edge, .. } => {
            let value = required_value(utility.value(), family)?;
            let value = spacing_value(value, theme, family)?;
            let value = if utility.is_negative() { negate(value) } else { value };
            spacing_declarations(*margin, *edge, value, important)
        }
        UtilityDefinition::Gap { edge, .. } => {
            if utility.is_negative() {
                return Err(UtilityError::new(
                    UtilityErrorKind::UnsupportedNegative,
                    family,
                    value_text,
                ));
            }
            let value = required_value(utility.value(), family)?;
            let value = spacing_value(value, theme, family)?;
            gap_declarations(*edge, value, important)
        }
        UtilityDefinition::Size { dimension, .. } => {
            if utility.is_negative() {
                return Err(UtilityError::new(
                    UtilityErrorKind::UnsupportedNegative,
                    family,
                    value_text,
                ));
            }
            let value = required_value(utility.value(), family)?;
            let value = size_value(value, theme, *dimension, family)?;
            vec![CssDeclaration::new(dimension.property(), value).with_important(important)]
        }
        UtilityDefinition::Color { kind, .. } => {
            if utility.is_negative() {
                return Err(UtilityError::new(
                    UtilityErrorKind::UnsupportedNegative,
                    family,
                    value_text,
                ));
            }
            let value = required_value(utility.value(), family)?;
            let value = color_value(value, theme, family, *kind)?;
            vec![CssDeclaration::new(kind.property(), value).with_important(important)]
        }
        UtilityDefinition::Radius { .. } => {
            if utility.is_negative() {
                return Err(UtilityError::new(
                    UtilityErrorKind::UnsupportedNegative,
                    family,
                    value_text,
                ));
            }
            let value = utility.value().map_or_else(
                || theme.radius("DEFAULT").map(str::to_owned),
                |value| radius_value(value, theme, family).ok(),
            );
            let value = value.ok_or_else(|| {
                UtilityError::new(UtilityErrorKind::UnknownThemeValue, family, value_text)
            })?;
            vec![CssDeclaration::new("border-radius", value).with_important(important)]
        }
        UtilityDefinition::AlignItems { .. } => {
            let value = named_choice(
                utility.value(),
                family,
                &["start", "end", "center", "baseline", "stretch"],
            )?;
            vec![CssDeclaration::new("align-items", value.clone()).with_important(important)]
        }
        UtilityDefinition::JustifyContent { .. } => {
            let value = named_choice(
                utility.value(),
                family,
                &["start", "end", "center", "between", "around", "evenly"],
            )?;
            let value = match value.as_str() {
                "between" => "space-between",
                "around" => "space-around",
                "evenly" => "space-evenly",
                _ => value.as_str(),
            };
            vec![CssDeclaration::new("justify-content", value.to_owned()).with_important(important)]
        }
        UtilityDefinition::GridColumns { .. } => {
            if utility.is_negative() {
                return Err(UtilityError::new(
                    UtilityErrorKind::UnsupportedNegative,
                    family,
                    value_text,
                ));
            }
            let value = required_value(utility.value(), family)?;
            let value = grid_columns_value(value, family)?;
            vec![CssDeclaration::new("grid-template-columns", value).with_important(important)]
        }
    };

    Ok(ResolvedUtility {
        selector: escape_class_selector(candidate.raw()),
        declarations,
        order: definition.order(),
    })
}

fn required_value<'source>(
    value: Option<ValueAst<'source>>,
    family: &str,
) -> Result<ValueAst<'source>, UtilityError> {
    value.ok_or_else(|| UtilityError::new(UtilityErrorKind::MissingValue, family, None))
}

fn spacing_value(value: ValueAst<'_>, theme: &Theme, family: &str) -> Result<String, UtilityError> {
    match value {
        ValueAst::Arbitrary { content, .. } => safe_arbitrary(content, family),
        ValueAst::Named(key) => theme
            .spacing(key)
            .map(str::to_owned)
            .or_else(|| key.parse::<f64>().ok().map(|_| format!("calc(var(--spacing) * {key})")))
            .ok_or_else(|| {
                UtilityError::new(UtilityErrorKind::UnknownThemeValue, family, Some(key))
            }),
    }
}

fn size_value(
    value: ValueAst<'_>,
    theme: &Theme,
    dimension: Dimension,
    family: &str,
) -> Result<String, UtilityError> {
    match value {
        ValueAst::Arbitrary { content, .. } => safe_arbitrary(content, family),
        ValueAst::Named(key) => {
            let token = match dimension {
                Dimension::Width | Dimension::MinWidth | Dimension::MaxWidth => {
                    theme.width(key).or_else(|| theme.spacing(key))
                }
                Dimension::Height | Dimension::MinHeight | Dimension::MaxHeight => {
                    theme.height(key).or_else(|| theme.spacing(key))
                }
            };
            token
                .map(str::to_owned)
                .or_else(|| {
                    key.parse::<f64>().ok().map(|_| format!("calc(var(--spacing) * {key})"))
                })
                .ok_or_else(|| {
                    UtilityError::new(UtilityErrorKind::UnknownThemeValue, family, Some(key))
                })
        }
    }
}

fn color_value(
    value: ValueAst<'_>,
    theme: &Theme,
    family: &str,
    _kind: ColorKind,
) -> Result<String, UtilityError> {
    match value {
        ValueAst::Arbitrary { content, .. } => safe_arbitrary(content, family),
        ValueAst::Named(key) => theme.color(key).map(str::to_owned).ok_or_else(|| {
            UtilityError::new(UtilityErrorKind::UnknownThemeValue, family, Some(key))
        }),
    }
}

fn radius_value(value: ValueAst<'_>, theme: &Theme, family: &str) -> Result<String, UtilityError> {
    match value {
        ValueAst::Arbitrary { content, .. } => safe_arbitrary(content, family),
        ValueAst::Named(key) => theme.radius(key).map(str::to_owned).ok_or_else(|| {
            UtilityError::new(UtilityErrorKind::UnknownThemeValue, family, Some(key))
        }),
    }
}

fn named_choice(
    value: Option<ValueAst<'_>>,
    family: &str,
    choices: &[&str],
) -> Result<String, UtilityError> {
    let value = required_value(value, family)?;
    let ValueAst::Named(name) = value else {
        return Err(UtilityError::new(
            UtilityErrorKind::InvalidValue,
            family,
            Some(value.content()),
        ));
    };
    if choices.contains(&name) {
        Ok(name.to_owned())
    } else {
        Err(UtilityError::new(UtilityErrorKind::InvalidValue, family, Some(name)))
    }
}

fn grid_columns_value(value: ValueAst<'_>, family: &str) -> Result<String, UtilityError> {
    match value {
        ValueAst::Arbitrary { content, .. } => safe_arbitrary(content, family),
        ValueAst::Named(columns) if columns.parse::<u16>().is_ok() => {
            Ok(format!("repeat({columns}, minmax(0, 1fr))"))
        }
        ValueAst::Named(columns) => {
            Err(UtilityError::new(UtilityErrorKind::InvalidValue, family, Some(columns)))
        }
    }
}

fn safe_arbitrary(content: &str, family: &str) -> Result<String, UtilityError> {
    if content.chars().any(|character| matches!(character, ';' | '{' | '}' | '\n' | '\r'))
        || content.contains("/*")
        || content.contains("*/")
    {
        return Err(UtilityError::new(
            UtilityErrorKind::InvalidArbitraryValue,
            family,
            Some(content),
        ));
    }
    Ok(content.replace('_', " "))
}

fn negate(value: String) -> String {
    if value == "0px" || value == "0" {
        value
    } else if value.starts_with("calc(") {
        format!("calc(-1 * {value})")
    } else {
        format!("-{value}")
    }
}

fn spacing_declarations(
    margin: bool,
    edge: SpacingEdge,
    value: String,
    important: bool,
) -> Vec<CssDeclaration> {
    let property = if margin { "margin" } else { "padding" };
    let mut declarations = Vec::new();
    match edge {
        SpacingEdge::All => declarations.push(CssDeclaration::new(property, value.clone())),
        SpacingEdge::X => {
            declarations.push(CssDeclaration::new(format!("{property}-left"), value.clone()));
            declarations.push(CssDeclaration::new(format!("{property}-right"), value.clone()));
        }
        SpacingEdge::Y => {
            declarations.push(CssDeclaration::new(format!("{property}-top"), value.clone()));
            declarations.push(CssDeclaration::new(format!("{property}-bottom"), value.clone()));
        }
        SpacingEdge::Top => {
            declarations.push(CssDeclaration::new(format!("{property}-top"), value.clone()))
        }
        SpacingEdge::Right => {
            declarations.push(CssDeclaration::new(format!("{property}-right"), value.clone()))
        }
        SpacingEdge::Bottom => {
            declarations.push(CssDeclaration::new(format!("{property}-bottom"), value.clone()))
        }
        SpacingEdge::Left => {
            declarations.push(CssDeclaration::new(format!("{property}-left"), value.clone()))
        }
    }
    declarations.into_iter().map(|declaration| declaration.with_important(important)).collect()
}

fn gap_declarations(edge: SpacingEdge, value: String, important: bool) -> Vec<CssDeclaration> {
    let property = match edge {
        SpacingEdge::All => "gap",
        SpacingEdge::X => "column-gap",
        SpacingEdge::Y => "row-gap",
        SpacingEdge::Top | SpacingEdge::Right | SpacingEdge::Bottom | SpacingEdge::Left => "gap",
    };
    vec![CssDeclaration::new(property, value).with_important(important)]
}

/// Escapes a candidate as a CSS class selector.
#[must_use]
pub fn escape_class_selector(candidate: &str) -> String {
    let mut selector = String::from(".");
    for character in candidate.chars() {
        if character.is_alphanumeric() || matches!(character, '-' | '_' | '\u{80}'..='\u{10ffff}') {
            selector.push(character);
        } else if character.is_ascii_control() {
            selector.push_str(&format!("\\{:x} ", character as u32));
        } else {
            selector.push('\\');
            selector.push(character);
        }
    }
    selector
}

#[cfg(test)]
mod tests {
    use utilitycss_syntax::parse;
    use utilitycss_theme::Theme;

    use super::{
        escape_class_selector, resolve, UtilityDefinition, UtilityErrorKind, UtilityRegistry,
    };

    #[test]
    fn resolves_static_spacing_and_color_utilities() {
        let registry = UtilityRegistry::new();
        let theme = Theme::default();

        let padding = resolve(&parse("p-4").expect("valid candidate"), &theme, &registry)
            .expect("known spacing value");
        let color = resolve(&parse("bg-red-500").expect("valid candidate"), &theme, &registry)
            .expect("known color value");

        assert_eq!(padding.selector(), ".p-4");
        assert_eq!(padding.declarations()[0].value(), "1rem");
        assert_eq!(color.declarations()[0].value(), "#ef4444");
    }

    #[test]
    fn resolves_variants_ready_selectors_and_arbitrary_values() {
        let registry = UtilityRegistry::new();
        let theme = Theme::default();
        let candidate = parse("!hover:bg-[rgb(1_2_3)]").expect("valid candidate");
        let resolved = resolve(&candidate, &theme, &registry).expect("safe arbitrary color");

        assert_eq!(resolved.selector(), r".\!hover\:bg-\[rgb\(1_2_3\)\]");
        assert_eq!(resolved.declarations()[0].value(), "rgb(1 2 3)");
        assert!(resolved.declarations()[0].is_important());
    }

    #[test]
    fn rejects_unsafe_arbitrary_values() {
        let registry = UtilityRegistry::new();
        let error = resolve(
            &parse("w-[1rem;display:block]").expect("brackets are structurally valid"),
            &Theme::default(),
            &registry,
        )
        .expect_err("declaration delimiters are unsafe");

        assert_eq!(error.kind(), UtilityErrorKind::InvalidArbitraryValue);
    }

    #[test]
    fn custom_static_definitions_extend_the_registry() {
        let mut registry = UtilityRegistry::new();
        registry.register(
            "content-center",
            UtilityDefinition::static_declaration("place-content", "center", 63),
        );
        let resolved = resolve(
            &parse("content-center").expect("valid candidate"),
            &Theme::default(),
            &registry,
        )
        .expect("custom utility is registered");

        assert_eq!(resolved.declarations()[0].property(), "place-content");
    }

    #[test]
    fn escapes_css_punctuation() {
        assert_eq!(escape_class_selector("md:hover:bg-red-500/50"), r".md\:hover\:bg-red-500\/50");
    }
}
