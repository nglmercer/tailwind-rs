//! Parser and borrowed AST for the utilitycss candidate DSL.
//!
//! Parsing is independent of themes and utility registries. Semantic resolution belongs to later
//! compiler phases.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::{fmt, str};

use utilitycss_diagnostics::{Diagnostic, DiagnosticCode};
use utilitycss_span::{SourceId, Span};

/// A parsed utility candidate.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CandidateAst<'source> {
    raw: &'source str,
    important: bool,
    variants: Vec<VariantAst<'source>>,
    utility: UtilityAst<'source>,
}

impl<'source> CandidateAst<'source> {
    /// Returns the original candidate text.
    #[must_use]
    pub const fn raw(&self) -> &'source str {
        self.raw
    }

    /// Returns whether the candidate has a leading important marker.
    #[must_use]
    pub const fn is_important(&self) -> bool {
        self.important
    }

    /// Returns variants in author order.
    #[must_use]
    pub fn variants(&self) -> &[VariantAst<'source>] {
        &self.variants
    }

    /// Returns the parsed base utility.
    #[must_use]
    pub const fn utility(&self) -> &UtilityAst<'source> {
        &self.utility
    }
}

/// A variant in a candidate's author-ordered variant chain.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct VariantAst<'source> {
    raw: &'source str,
    kind: VariantKind<'source>,
}

impl<'source> VariantAst<'source> {
    /// Returns the original variant segment.
    #[must_use]
    pub const fn raw(self) -> &'source str {
        self.raw
    }

    /// Returns the structural variant kind.
    #[must_use]
    pub const fn kind(self) -> VariantKind<'source> {
        self.kind
    }
}

/// Structural forms of a parsed variant.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum VariantKind<'source> {
    /// A named variant, optionally carrying an arbitrary value such as `data-[state=open]`.
    Named {
        /// The named variant prefix.
        name: &'source str,
        /// The optional variant value.
        value: Option<ValueAst<'source>>,
    },
    /// An arbitrary selector variant such as `[&>*]`.
    Arbitrary {
        /// The selector content without the surrounding brackets.
        selector: &'source str,
    },
}

/// A parsed base utility and its optional value and modifier.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct UtilityAst<'source> {
    raw: &'source str,
    negative: bool,
    family: &'source str,
    value: Option<ValueAst<'source>>,
    modifier: Option<ValueAst<'source>>,
}

impl<'source> UtilityAst<'source> {
    /// Returns the original utility segment without variants or the important marker.
    #[must_use]
    pub const fn raw(self) -> &'source str {
        self.raw
    }

    /// Returns whether the utility has a leading negative marker.
    #[must_use]
    pub const fn is_negative(self) -> bool {
        self.negative
    }

    /// Returns the parsed utility family.
    #[must_use]
    pub const fn family(self) -> &'source str {
        self.family
    }

    /// Returns the optional utility value.
    #[must_use]
    pub const fn value(self) -> Option<ValueAst<'source>> {
        self.value
    }

    /// Returns the optional utility modifier.
    #[must_use]
    pub const fn modifier(self) -> Option<ValueAst<'source>> {
        self.modifier
    }
}

/// A named or bracketed utility/variant value.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ValueAst<'source> {
    /// A value made of the candidate's non-bracketed source text.
    Named(&'source str),
    /// A value with balanced brackets, retaining both raw and inner text.
    Arbitrary {
        /// The value including its surrounding brackets.
        raw: &'source str,
        /// The value excluding its surrounding brackets.
        content: &'source str,
    },
}

impl<'source> ValueAst<'source> {
    /// Returns the value exactly as represented in the candidate.
    #[must_use]
    pub const fn raw(self) -> &'source str {
        match self {
            Self::Named(value) => value,
            Self::Arbitrary { raw, .. } => raw,
        }
    }

    /// Returns the value content without arbitrary-value brackets.
    #[must_use]
    pub const fn content(self) -> &'source str {
        match self {
            Self::Named(value) => value,
            Self::Arbitrary { content, .. } => content,
        }
    }

    /// Returns whether this is an arbitrary bracketed value.
    #[must_use]
    pub const fn is_arbitrary(self) -> bool {
        matches!(self, Self::Arbitrary { .. })
    }
}

/// The category of a parser failure.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ParseErrorKind {
    /// The candidate was empty.
    EmptyCandidate,
    /// A variant segment was empty.
    EmptyVariant,
    /// The utility segment was empty.
    EmptyUtility,
    /// A utility or named variant had no name.
    MissingName,
    /// A value was required but absent.
    MissingValue,
    /// An arbitrary value did not have a closing bracket.
    UnterminatedArbitraryValue,
    /// An arbitrary value had no content.
    EmptyArbitraryValue,
    /// Characters followed a complete arbitrary value where none were allowed.
    UnexpectedTrailingCharacters,
    /// The input bytes were not valid UTF-8.
    InvalidUtf8,
}

impl ParseErrorKind {
    const fn code(self) -> DiagnosticCode {
        let code = match self {
            Self::EmptyCandidate => "syntax.empty-candidate",
            Self::EmptyVariant => "syntax.empty-variant",
            Self::EmptyUtility => "syntax.empty-utility",
            Self::MissingName => "syntax.missing-name",
            Self::MissingValue => "syntax.missing-value",
            Self::UnterminatedArbitraryValue => "syntax.unterminated-arbitrary-value",
            Self::EmptyArbitraryValue => "syntax.empty-arbitrary-value",
            Self::UnexpectedTrailingCharacters => "syntax.unexpected-trailing-characters",
            Self::InvalidUtf8 => "syntax.invalid-utf8",
        };
        DiagnosticCode::new(code)
    }
}

/// A non-panicking parser error with a byte offset in the candidate.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ParseError {
    kind: ParseErrorKind,
    offset: usize,
}

impl ParseError {
    const fn new(kind: ParseErrorKind, offset: usize) -> Self {
        Self { kind, offset }
    }

    /// Returns the parser error category.
    #[must_use]
    pub const fn kind(&self) -> ParseErrorKind {
        self.kind
    }

    /// Returns the byte offset at which parsing could no longer continue.
    #[must_use]
    pub const fn offset(&self) -> usize {
        self.offset
    }

    /// Converts the error into a source-aware diagnostic.
    #[must_use]
    pub fn to_diagnostic(&self, source: SourceId, span: Span) -> Diagnostic {
        Diagnostic::error(self.kind.code(), self.to_string()).with_source(source).with_span(span)
    }
}

impl fmt::Display for ParseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self.kind {
            ParseErrorKind::EmptyCandidate => "candidate is empty",
            ParseErrorKind::EmptyVariant => "variant segment is empty",
            ParseErrorKind::EmptyUtility => "utility segment is empty",
            ParseErrorKind::MissingName => "utility or variant name is missing",
            ParseErrorKind::MissingValue => "utility value is missing",
            ParseErrorKind::UnterminatedArbitraryValue => "arbitrary value is not closed",
            ParseErrorKind::EmptyArbitraryValue => "arbitrary value is empty",
            ParseErrorKind::UnexpectedTrailingCharacters => {
                "unexpected characters follow an arbitrary value"
            }
            ParseErrorKind::InvalidUtf8 => "candidate bytes are not valid UTF-8",
        };
        write!(formatter, "{message} at byte {}", self.offset)
    }
}

impl std::error::Error for ParseError {}

/// Parses one candidate into a borrowed AST.
pub fn parse(candidate: &str) -> Result<CandidateAst<'_>, ParseError> {
    if candidate.is_empty() {
        return Err(ParseError::new(ParseErrorKind::EmptyCandidate, 0));
    }

    let (important, body) =
        candidate.strip_prefix('!').map_or((false, candidate), |body| (true, body));
    if body.is_empty() {
        return Err(ParseError::new(ParseErrorKind::EmptyUtility, candidate.len()));
    }

    let segments = split_top_level(body, ':');
    if segments.iter().any(|segment| segment.is_empty()) {
        let offset = segments.iter().position(|segment| segment.is_empty()).unwrap_or_default();
        return Err(ParseError::new(ParseErrorKind::EmptyVariant, offset));
    }

    let utility_segment = segments.last().copied().unwrap_or_default();
    if utility_segment.is_empty() {
        return Err(ParseError::new(ParseErrorKind::EmptyUtility, body.len()));
    }

    let variants = segments[..segments.len().saturating_sub(1)]
        .iter()
        .map(|segment| parse_variant(segment))
        .collect::<Result<Vec<_>, _>>()?;
    let utility = parse_utility(utility_segment)?;

    Ok(CandidateAst { raw: candidate, important, variants, utility })
}

/// Parses bytes safely, returning a typed error for invalid UTF-8.
pub fn parse_bytes(candidate: &[u8]) -> Result<CandidateAst<'_>, ParseError> {
    let text = str::from_utf8(candidate)
        .map_err(|error| ParseError::new(ParseErrorKind::InvalidUtf8, error.valid_up_to()))?;
    parse(text)
}

fn parse_variant(segment: &str) -> Result<VariantAst<'_>, ParseError> {
    if segment.starts_with('[') {
        let closing = matching_bracket(segment, 0)?;
        if closing + 1 != segment.len() {
            return Err(ParseError::new(ParseErrorKind::UnexpectedTrailingCharacters, closing + 1));
        }
        if closing == 1 {
            return Err(ParseError::new(ParseErrorKind::EmptyArbitraryValue, 1));
        }
        return Ok(VariantAst {
            raw: segment,
            kind: VariantKind::Arbitrary { selector: &segment[1..closing] },
        });
    }

    if let Some(value_start) = find_top_level_sequence(segment, "-[") {
        let name = &segment[..value_start];
        if name.is_empty() {
            return Err(ParseError::new(ParseErrorKind::MissingName, 0));
        }
        let value = parse_value_exact(segment, value_start + 1)?;
        return Ok(VariantAst {
            raw: segment,
            kind: VariantKind::Named { name, value: Some(value) },
        });
    }

    if segment.is_empty() {
        return Err(ParseError::new(ParseErrorKind::MissingName, 0));
    }
    Ok(VariantAst { raw: segment, kind: VariantKind::Named { name: segment, value: None } })
}

fn parse_utility(segment: &str) -> Result<UtilityAst<'_>, ParseError> {
    let (base, modifier_text) = split_modifier(segment);
    if base.is_empty() {
        return Err(ParseError::new(ParseErrorKind::EmptyUtility, 0));
    }

    let (negative, unsigned) =
        base.strip_prefix('-').map_or((false, base), |unsigned| (true, unsigned));
    if unsigned.is_empty() {
        return Err(ParseError::new(ParseErrorKind::MissingName, 0));
    }

    let (family, value) = split_utility(unsigned)?;
    let modifier = modifier_text.map(|text| parse_value_exact(text, 0)).transpose()?;

    Ok(UtilityAst { raw: segment, negative, family, value, modifier })
}

fn split_utility(segment: &str) -> Result<(&str, Option<ValueAst<'_>>), ParseError> {
    if let Some(value_start) = find_top_level_sequence(segment, "-[") {
        let family = &segment[..value_start];
        if family.is_empty() {
            return Err(ParseError::new(ParseErrorKind::MissingName, 0));
        }
        let value = parse_value_exact(segment, value_start + 1)?;
        return Ok((family, Some(value)));
    }

    for family in COMPOUND_UTILITY_FAMILIES {
        if let Some(value_start) =
            segment.strip_prefix(family).and_then(|rest| rest.strip_prefix('-'))
        {
            let start = segment.len() - value_start.len();
            let value = parse_value_exact(segment, start)?;
            return Ok((family, Some(value)));
        }
    }

    if let Some(value_start) = find_top_level_char(segment, '-') {
        let family = &segment[..value_start];
        if family.is_empty() {
            return Err(ParseError::new(ParseErrorKind::MissingName, 0));
        }
        let value = parse_value_exact(segment, value_start + 1)?;
        return Ok((family, Some(value)));
    }

    Ok((segment, None))
}

const COMPOUND_UTILITY_FAMILIES: &[&str] = &[
    "underline-offset",
    "grid-cols",
    "grid-rows",
    "col-span",
    "row-span",
    "col-start",
    "col-end",
    "row-start",
    "row-end",
    "border-x",
    "border-y",
    "border-s",
    "border-e",
    "border-t",
    "border-r",
    "border-b",
    "border-l",
    "rounded-t",
    "rounded-r",
    "rounded-b",
    "rounded-l",
    "space-x",
    "space-y",
    "divide-x",
    "divide-y",
    "inset-x",
    "inset-y",
    "translate-x",
    "translate-y",
    "scale-x",
    "scale-y",
    "max-w",
    "min-w",
    "max-h",
    "min-h",
];

fn split_modifier(segment: &str) -> (&str, Option<&str>) {
    find_top_level_char(segment, '/')
        .map_or((segment, None), |index| (&segment[..index], Some(&segment[index + 1..])))
}

fn parse_value_exact(input: &str, start: usize) -> Result<ValueAst<'_>, ParseError> {
    if start >= input.len() {
        return Err(ParseError::new(ParseErrorKind::MissingValue, start));
    }

    let first = input[start..].chars().next().expect("start is a valid non-end byte offset");
    if first == '[' {
        let closing = matching_bracket(input, start)?;
        if closing == start + 1 {
            return Err(ParseError::new(ParseErrorKind::EmptyArbitraryValue, start + 1));
        }
        if closing + 1 != input.len() {
            return Err(ParseError::new(ParseErrorKind::UnexpectedTrailingCharacters, closing + 1));
        }
        return Ok(ValueAst::Arbitrary {
            raw: &input[start..=closing],
            content: &input[start + 1..closing],
        });
    }

    if input[start..].contains('[') || input[start..].contains(']') {
        return Err(ParseError::new(ParseErrorKind::UnterminatedArbitraryValue, start));
    }
    Ok(ValueAst::Named(&input[start..]))
}

fn matching_bracket(input: &str, open: usize) -> Result<usize, ParseError> {
    let mut depth = 0_u32;
    let mut escaped = false;
    let mut quote = None;

    for (relative, character) in input[open..].char_indices() {
        let index = open + relative;
        if escaped {
            escaped = false;
            continue;
        }
        if character == '\\' {
            escaped = true;
            continue;
        }
        if let Some(quote_character) = quote {
            if character == quote_character {
                quote = None;
            }
            continue;
        }
        match character {
            '\'' | '"' => quote = Some(character),
            '[' => depth = depth.saturating_add(1),
            ']' => {
                depth = depth.saturating_sub(1);
                if depth == 0 {
                    return Ok(index);
                }
            }
            _ => {}
        }
    }

    Err(ParseError::new(ParseErrorKind::UnterminatedArbitraryValue, open))
}

fn split_top_level(input: &str, delimiter: char) -> Vec<&str> {
    let mut pieces = Vec::new();
    let mut start = 0;
    let mut bracket_depth = 0_u32;
    let mut escaped = false;

    for (index, character) in input.char_indices() {
        if escaped {
            escaped = false;
            continue;
        }
        if character == '\\' {
            escaped = true;
            continue;
        }
        match character {
            '[' => bracket_depth = bracket_depth.saturating_add(1),
            ']' => bracket_depth = bracket_depth.saturating_sub(1),
            character if character == delimiter && bracket_depth == 0 => {
                pieces.push(&input[start..index]);
                start = index + character.len_utf8();
            }
            _ => {}
        }
    }
    pieces.push(&input[start..]);
    pieces
}

fn find_top_level_char(input: &str, target: char) -> Option<usize> {
    find_top_level(input, |character| character == target)
}

fn find_top_level_sequence(input: &str, target: &str) -> Option<usize> {
    let target_start = target.chars().next()?;
    let mut bracket_depth = 0_u32;
    let mut escaped = false;

    for (index, character) in input.char_indices() {
        if escaped {
            escaped = false;
            continue;
        }
        if character == '\\' {
            escaped = true;
            continue;
        }
        match character {
            '[' => bracket_depth = bracket_depth.saturating_add(1),
            ']' => bracket_depth = bracket_depth.saturating_sub(1),
            character
                if character == target_start
                    && bracket_depth == 0
                    && input[index..].starts_with(target) =>
            {
                return Some(index);
            }
            _ => {}
        }
    }
    None
}

fn find_top_level<F>(input: &str, mut predicate: F) -> Option<usize>
where
    F: FnMut(char) -> bool,
{
    let mut bracket_depth = 0_u32;
    let mut escaped = false;
    for (index, character) in input.char_indices() {
        if escaped {
            escaped = false;
            continue;
        }
        if character == '\\' {
            escaped = true;
            continue;
        }
        match character {
            '[' => bracket_depth = bracket_depth.saturating_add(1),
            ']' => bracket_depth = bracket_depth.saturating_sub(1),
            character if bracket_depth == 0 && predicate(character) => return Some(index),
            _ => {}
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use proptest::prelude::*;

    use utilitycss_span::{SourceId, Span};

    use super::{parse, parse_bytes, ParseErrorKind, ValueAst, VariantKind};

    #[test]
    fn parses_variants_values_modifiers_and_important() {
        let candidate = parse("!md:hover:bg-red-500/50").expect("candidate is valid");

        assert!(candidate.is_important());
        assert_eq!(candidate.variants().len(), 2);
        assert_eq!(candidate.variants()[0].raw(), "md");
        assert_eq!(candidate.variants()[1].raw(), "hover");
        assert_eq!(candidate.utility().family(), "bg");
        assert_eq!(candidate.utility().value().map(ValueAst::content), Some("red-500"));
        assert_eq!(candidate.utility().modifier().map(ValueAst::content), Some("50"));
    }

    #[test]
    fn parses_negative_and_arbitrary_values_structurally() {
        let candidate = parse("-grid-cols-[1fr_2fr]").expect("candidate is valid");
        let value = candidate.utility().value().expect("value is present");

        assert!(candidate.utility().is_negative());
        assert_eq!(candidate.utility().family(), "grid-cols");
        assert!(value.is_arbitrary());
        assert_eq!(value.raw(), "[1fr_2fr]");
        assert_eq!(value.content(), "1fr_2fr");
    }

    #[test]
    fn parses_arbitrary_variants_and_variant_values() {
        let arbitrary = parse("[&>*]:p-4").expect("candidate is valid");
        assert_eq!(arbitrary.variants()[0].kind(), VariantKind::Arbitrary { selector: "&>*" });

        let data = parse("data-[state=open]:opacity-100").expect("candidate is valid");
        assert_eq!(
            data.variants()[0].kind(),
            VariantKind::Named {
                name: "data",
                value: Some(ValueAst::Arbitrary { raw: "[state=open]", content: "state=open" })
            }
        );
    }

    #[test]
    fn escaped_colons_do_not_create_variants() {
        let candidate = parse(r"hover\:bg-red-500").expect("candidate is syntactically valid");

        assert!(candidate.variants().is_empty());
        assert_eq!(candidate.utility().family(), r"hover\:bg");
    }

    #[test]
    fn malformed_arbitrary_values_return_diagnostics_without_panicking() {
        let error = parse("w-[calc(100%-2rem)").expect_err("bracket is unclosed");

        assert_eq!(error.kind(), ParseErrorKind::UnterminatedArbitraryValue);
        let diagnostic = error.to_diagnostic(
            SourceId::new("src/app.html"),
            Span::new(4, 23).expect("valid candidate span"),
        );
        assert_eq!(diagnostic.code().as_str(), "syntax.unterminated-arbitrary-value");
        assert_eq!(diagnostic.source().map(SourceId::as_str), Some("src/app.html"));
    }

    #[test]
    fn arbitrary_bytes_are_rejected_as_typed_errors() {
        let error = parse_bytes(b"p-4\xff").expect_err("invalid UTF-8 must be rejected");

        assert_eq!(error.kind(), ParseErrorKind::InvalidUtf8);
        assert_eq!(error.offset(), 3);
    }

    #[test]
    fn parsing_is_deterministic() {
        let first = parse("md:hover:p-4").expect("candidate is valid");
        let second = parse("md:hover:p-4").expect("candidate is valid");

        assert_eq!(first, second);
    }

    proptest! {
        #[test]
        fn arbitrary_utf8_candidates_never_panic(candidate in any::<String>()) {
            let _ = parse(&candidate);
        }
    }
}
