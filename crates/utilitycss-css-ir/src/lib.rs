//! A small CSS intermediate representation with deterministic serialization.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::cmp::Ordering;

/// Controls whitespace emitted by [`CssDocument::to_css`].
#[derive(Clone, Copy, Debug, Default, Eq, Ord, PartialEq, PartialOrd)]
pub enum CssSerializationMode {
    /// Emit readable, indented CSS.
    #[default]
    Pretty,
    /// Emit compact CSS without optional whitespace.
    Minified,
}

/// A stable ordering key assigned before CSS serialization.
#[derive(Clone, Copy, Debug, Default, Eq, Ord, PartialEq, PartialOrd)]
pub struct OrderKey {
    layer: u16,
    variant: u16,
    utility: u16,
    tie_breaker: u64,
}

impl OrderKey {
    /// Creates an ordering key from explicit semantic ordering components.
    #[must_use]
    pub const fn new(layer: u16, variant: u16, utility: u16, tie_breaker: u64) -> Self {
        Self { layer, variant, utility, tie_breaker }
    }

    /// Returns the layer ordering component.
    #[must_use]
    pub const fn layer(self) -> u16 {
        self.layer
    }

    /// Returns the variant ordering component.
    #[must_use]
    pub const fn variant(self) -> u16 {
        self.variant
    }

    /// Returns the utility ordering component.
    #[must_use]
    pub const fn utility(self) -> u16 {
        self.utility
    }

    /// Returns the deterministic tie-breaker component.
    #[must_use]
    pub const fn tie_breaker(self) -> u64 {
        self.tie_breaker
    }
}

/// One CSS declaration in a style rule.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CssDeclaration {
    property: String,
    value: String,
    important: bool,
}

impl CssDeclaration {
    /// Creates a declaration from a property and value.
    #[must_use]
    pub fn new(property: impl Into<String>, value: impl Into<String>) -> Self {
        Self { property: property.into(), value: value.into(), important: false }
    }

    /// Marks or unmarks the declaration as important.
    #[must_use]
    pub fn with_important(mut self, important: bool) -> Self {
        self.important = important;
        self
    }

    /// Returns the declaration property.
    #[must_use]
    pub fn property(&self) -> &str {
        &self.property
    }

    /// Returns the declaration value.
    #[must_use]
    pub fn value(&self) -> &str {
        &self.value
    }

    /// Returns whether the declaration is marked important.
    #[must_use]
    pub const fn is_important(&self) -> bool {
        self.important
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
enum RuleKind {
    Style { selector: String, declarations: Vec<CssDeclaration> },
    AtRule { name: String, prelude: String, children: Vec<CssRule> },
}

/// A CSS rule with an explicit ordering key.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CssRule {
    order: OrderKey,
    kind: RuleKind,
}

impl CssRule {
    /// Creates a style rule.
    #[must_use]
    pub fn style(
        order: OrderKey,
        selector: impl Into<String>,
        declarations: Vec<CssDeclaration>,
    ) -> Self {
        Self { order, kind: RuleKind::Style { selector: selector.into(), declarations } }
    }

    /// Creates an at-rule containing nested rules.
    #[must_use]
    pub fn at_rule(
        order: OrderKey,
        name: impl Into<String>,
        prelude: impl Into<String>,
        children: Vec<Self>,
    ) -> Self {
        Self {
            order,
            kind: RuleKind::AtRule { name: name.into(), prelude: prelude.into(), children },
        }
    }

    /// Returns this rule's explicit ordering key.
    #[must_use]
    pub const fn order(&self) -> OrderKey {
        self.order
    }

    /// Returns the style selector when this is a style rule.
    #[must_use]
    pub fn selector(&self) -> Option<&str> {
        match &self.kind {
            RuleKind::Style { selector, .. } => Some(selector),
            RuleKind::AtRule { .. } => None,
        }
    }

    /// Returns the declarations when this is a style rule.
    #[must_use]
    pub fn declarations(&self) -> Option<&[CssDeclaration]> {
        match &self.kind {
            RuleKind::Style { declarations, .. } => Some(declarations),
            RuleKind::AtRule { .. } => None,
        }
    }

    /// Creates a copy of a style rule with a new selector.
    #[must_use]
    pub fn with_selector(&self, selector: impl Into<String>) -> Option<Self> {
        match &self.kind {
            RuleKind::Style { declarations, .. } => {
                Some(Self::style(self.order, selector, declarations.clone()))
            }
            RuleKind::AtRule { .. } => None,
        }
    }

    /// Creates a copy with a different explicit ordering key.
    #[must_use]
    pub fn with_order(&self, order: OrderKey) -> Self {
        Self { order, kind: self.kind.clone() }
    }

    /// Returns a copy with every declaration marked important or unimportant.
    #[must_use]
    pub fn with_important(&self, important: bool) -> Self {
        Self { order: self.order, kind: map_important(&self.kind, important) }
    }

    /// Maps every nested style selector while preserving the rule structure.
    #[must_use]
    pub fn map_selectors<F>(&self, mut mapper: F) -> Self
    where
        F: FnMut(&str) -> String,
    {
        Self { order: self.order, kind: map_rule_kind(&self.kind, &mut mapper) }
    }
}

/// A collection of CSS rules that serializes in deterministic order.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct CssDocument {
    rules: Vec<CssRule>,
}

impl CssDocument {
    /// Creates an empty CSS document.
    #[must_use]
    pub const fn new() -> Self {
        Self { rules: Vec::new() }
    }

    /// Adds a rule to the document.
    pub fn push(&mut self, rule: CssRule) {
        self.rules.push(rule);
    }

    /// Returns the rules in insertion order.
    #[must_use]
    pub fn rules(&self) -> &[CssRule] {
        &self.rules
    }

    /// Returns whether the document has no rules.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.rules.is_empty()
    }

    /// Serializes the document using deterministic ordering.
    #[must_use]
    pub fn to_css(&self, mode: CssSerializationMode) -> String {
        render_rules(&self.rules, mode, 0)
    }
}

fn map_rule_kind<F>(kind: &RuleKind, mapper: &mut F) -> RuleKind
where
    F: FnMut(&str) -> String,
{
    match kind {
        RuleKind::Style { selector, declarations } => {
            RuleKind::Style { selector: mapper(selector), declarations: declarations.clone() }
        }
        RuleKind::AtRule { name, prelude, children } => RuleKind::AtRule {
            name: name.clone(),
            prelude: prelude.clone(),
            children: children
                .iter()
                .map(|child| CssRule {
                    order: child.order,
                    kind: map_rule_kind(&child.kind, mapper),
                })
                .collect(),
        },
    }
}

fn map_important(kind: &RuleKind, important: bool) -> RuleKind {
    match kind {
        RuleKind::Style { selector, declarations } => RuleKind::Style {
            selector: selector.clone(),
            declarations: declarations
                .iter()
                .cloned()
                .map(|declaration| declaration.with_important(important))
                .collect(),
        },
        RuleKind::AtRule { name, prelude, children } => RuleKind::AtRule {
            name: name.clone(),
            prelude: prelude.clone(),
            children: children.iter().map(|child| child.with_important(important)).collect(),
        },
    }
}

fn render_rules(rules: &[CssRule], mode: CssSerializationMode, indent: usize) -> String {
    let mut ordered = rules.iter().collect::<Vec<_>>();
    ordered.sort_by(|left, right| compare_rules(left, right, mode));

    let separator = match mode {
        CssSerializationMode::Pretty => "\n",
        CssSerializationMode::Minified => "",
    };

    ordered.iter().map(|rule| render_rule(rule, mode, indent)).collect::<Vec<_>>().join(separator)
}

fn compare_rules(left: &CssRule, right: &CssRule, mode: CssSerializationMode) -> Ordering {
    left.order
        .cmp(&right.order)
        .then_with(|| render_rule(left, mode, 0).cmp(&render_rule(right, mode, 0)))
}

fn render_rule(rule: &CssRule, mode: CssSerializationMode, indent: usize) -> String {
    match &rule.kind {
        RuleKind::Style { selector, declarations } => {
            render_style_rule(selector, declarations, mode, indent)
        }
        RuleKind::AtRule { name, prelude, children } => {
            let prefix =
                if prelude.is_empty() { format!("@{name}") } else { format!("@{name} {prelude}") };
            let body = render_rules(children, mode, indent + 2);

            match mode {
                CssSerializationMode::Pretty => {
                    if body.is_empty() {
                        format!("{}{} {{}}", indentation(indent), prefix)
                    } else {
                        format!(
                            "{}{} {{\n{}\n{}}}",
                            indentation(indent),
                            prefix,
                            body,
                            indentation(indent)
                        )
                    }
                }
                CssSerializationMode::Minified => format!("{prefix}{{{body}}}"),
            }
        }
    }
}

fn render_style_rule(
    selector: &str,
    declarations: &[CssDeclaration],
    mode: CssSerializationMode,
    indent: usize,
) -> String {
    match mode {
        CssSerializationMode::Pretty => {
            let mut output = format!("{}{} {{", indentation(indent), selector);
            if declarations.is_empty() {
                output.push('}');
                return output;
            }

            output.push('\n');
            for declaration in declarations {
                output.push_str(&indentation(indent + 2));
                output.push_str(declaration.property());
                output.push_str(": ");
                output.push_str(declaration.value());
                if declaration.is_important() {
                    output.push_str(" !important");
                }
                output.push_str(";\n");
            }
            output.push_str(&indentation(indent));
            output.push('}');
            output
        }
        CssSerializationMode::Minified => {
            let mut output = format!("{selector}{{");
            for declaration in declarations {
                output.push_str(declaration.property());
                output.push(':');
                output.push_str(declaration.value());
                if declaration.is_important() {
                    output.push_str("!important");
                }
                output.push(';');
            }
            output.push('}');
            output
        }
    }
}

fn indentation(width: usize) -> String {
    " ".repeat(width)
}

#[cfg(test)]
mod tests {
    use super::{CssDeclaration, CssDocument, CssRule, CssSerializationMode, OrderKey};

    fn rule(order: OrderKey, selector: &str, property: &str, value: &str) -> CssRule {
        CssRule::style(order, selector, vec![CssDeclaration::new(property, value)])
    }

    #[test]
    fn serialization_is_independent_of_insertion_order() {
        let first = rule(OrderKey::new(0, 0, 2, 0), ".p-4", "padding", "1rem");
        let second = rule(OrderKey::new(0, 0, 1, 0), ".flex", "display", "flex");

        let mut left = CssDocument::new();
        left.push(first.clone());
        left.push(second.clone());

        let mut right = CssDocument::new();
        right.push(second);
        right.push(first);

        assert_eq!(
            left.to_css(CssSerializationMode::Minified),
            right.to_css(CssSerializationMode::Minified)
        );
        assert_eq!(
            left.to_css(CssSerializationMode::Minified),
            ".flex{display:flex;}.p-4{padding:1rem;}"
        );
    }

    #[test]
    fn pretty_serialization_supports_nested_at_rules_and_important_values() {
        let style = CssRule::style(
            OrderKey::default(),
            ".p-4",
            vec![CssDeclaration::new("padding", "1rem").with_important(true)],
        );
        let media =
            CssRule::at_rule(OrderKey::new(0, 1, 0, 0), "media", "(min-width: 768px)", vec![style]);
        let mut document = CssDocument::new();
        document.push(media);

        assert_eq!(
            document.to_css(CssSerializationMode::Pretty),
            "@media (min-width: 768px) {\n  .p-4 {\n    padding: 1rem !important;\n  }\n}"
        );
    }
}
