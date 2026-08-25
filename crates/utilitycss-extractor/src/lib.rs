//! Conservative static candidate extraction for template and class-helper source.
//!
//! This crate narrows the language-agnostic scanner to contexts where a candidate is statically
//! visible: quoted `class`/`className` attributes and string literals inside known class helpers.
//! It does not evaluate user code. A future AST adapter can feed the same candidate spans into the
//! compiler without changing utility or variant semantics.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::ops::Range;

use utilitycss_scanner::scan;
use utilitycss_span::Span;

/// A statically visible candidate and its byte span in the original source.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ExtractedCandidate<'source> {
    raw: &'source str,
    span: Span,
}

impl<'source> ExtractedCandidate<'source> {
    /// Creates an extracted candidate from source text and a validated span.
    #[must_use]
    pub const fn new(raw: &'source str, span: Span) -> Self {
        Self { raw, span }
    }

    /// Returns the candidate text exactly as it appeared in the source.
    #[must_use]
    pub const fn raw(self) -> &'source str {
        self.raw
    }

    /// Returns the candidate's byte span in the source.
    #[must_use]
    pub const fn span(self) -> Span {
        self.span
    }
}

/// Extracts candidates from static class attributes and known class helper calls.
///
/// The result preserves scanner order and duplicate occurrences. Dynamic template strings and
/// unrelated string literals are intentionally ignored.
#[must_use]
pub fn extract(source: &str) -> Vec<ExtractedCandidate<'_>> {
    let mut ranges = attribute_ranges(source);
    ranges.extend(helper_string_ranges(source));
    let comments = comment_ranges(source.as_bytes());

    scan(source)
        .into_iter()
        .filter(|token| {
            let start = usize::try_from(token.span().start()).unwrap_or(usize::MAX);
            let end = usize::try_from(token.span().end()).unwrap_or(usize::MAX);
            !comments.iter().any(|comment| comment.start <= start && end <= comment.end)
                && ranges.iter().any(|range| range.start <= start && end <= range.end)
        })
        .map(|token| ExtractedCandidate::new(token.raw(), token.span()))
        .collect()
}

fn attribute_ranges(source: &str) -> Vec<Range<usize>> {
    let bytes = source.as_bytes();
    let names = [b"class".as_slice(), b"className", b"class:list", b"classList"];
    let mut ranges = Vec::new();
    let mut cursor = 0;
    while cursor < bytes.len() {
        let Some(name) = names.iter().find(|name| starts_with_name(bytes, cursor, name)) else {
            cursor += 1;
            continue;
        };
        let mut after_name = cursor + name.len();
        while after_name < bytes.len() && bytes[after_name].is_ascii_whitespace() {
            after_name += 1;
        }
        if bytes.get(after_name) != Some(&b'=') {
            cursor += name.len();
            continue;
        }
        let mut value_start = after_name + 1;
        while value_start < bytes.len() && bytes[value_start].is_ascii_whitespace() {
            value_start += 1;
        }
        let Some(&quote) = bytes.get(value_start) else {
            break;
        };
        if !matches!(quote, b'\'' | b'"') {
            cursor += name.len();
            continue;
        }
        let content_start = value_start + 1;
        let content_end = quoted_end(bytes, content_start, quote).unwrap_or(bytes.len());
        if !source[content_start..content_end].contains("${") {
            ranges.push(content_start..content_end);
        }
        cursor = content_end.saturating_add(1);
    }
    ranges
}

fn helper_string_ranges(source: &str) -> Vec<Range<usize>> {
    let bytes = source.as_bytes();
    let helpers = [b"clsx".as_slice(), b"classnames", b"cn", b"cva", b"tv", b"twJoin", b"twMerge"];
    let mut ranges = Vec::new();
    let mut cursor = 0;
    while cursor < bytes.len() {
        let Some(helper) =
            helpers.iter().find(|helper| starts_with_identifier(bytes, cursor, helper))
        else {
            cursor += 1;
            continue;
        };
        let mut open = cursor + helper.len();
        while open < bytes.len() && bytes[open].is_ascii_whitespace() {
            open += 1;
        }
        if bytes.get(open) != Some(&b'(') {
            cursor += helper.len();
            continue;
        }
        let Some(close) = matching_paren(bytes, open) else {
            cursor = open.saturating_add(1);
            continue;
        };
        ranges.extend(string_ranges(bytes, open + 1, close));
        cursor = close.saturating_add(1);
    }
    ranges
}

fn string_ranges(bytes: &[u8], start: usize, end: usize) -> Vec<Range<usize>> {
    let mut ranges = Vec::new();
    let mut cursor = start;
    while cursor < end {
        let quote = bytes[cursor];
        if !matches!(quote, b'\'' | b'"' | b'`') {
            cursor += 1;
            continue;
        }
        let content_start = cursor + 1;
        let content_end = quoted_end(&bytes[..end], content_start, quote).unwrap_or(end);
        if quote != b'`' || !bytes[content_start..content_end].windows(2).any(|pair| pair == b"${")
        {
            ranges.push(content_start..content_end);
        }
        cursor = content_end.saturating_add(1);
    }
    ranges
}

fn starts_with_name(bytes: &[u8], start: usize, name: &[u8]) -> bool {
    starts_with_identifier(bytes, start, name)
        && (name != b"class" || bytes.get(start + name.len()) != Some(&b':'))
}

fn starts_with_identifier(bytes: &[u8], start: usize, name: &[u8]) -> bool {
    let Some(end) = start.checked_add(name.len()) else {
        return false;
    };
    if bytes.get(start..end) != Some(name) {
        return false;
    }
    let before_is_identifier = start > 0 && is_identifier_byte(bytes[start - 1]);
    let after_is_identifier = bytes.get(end).is_some_and(|byte| is_identifier_byte(*byte));
    !before_is_identifier && !after_is_identifier
}

fn is_identifier_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'$')
}

fn quoted_end(bytes: &[u8], start: usize, quote: u8) -> Option<usize> {
    let mut cursor = start;
    let mut escaped = false;
    while cursor < bytes.len() {
        let byte = bytes[cursor];
        if escaped {
            escaped = false;
        } else if byte == b'\\' {
            escaped = true;
        } else if byte == quote {
            return Some(cursor);
        }
        cursor += 1;
    }
    None
}

fn matching_paren(bytes: &[u8], open: usize) -> Option<usize> {
    let mut depth = 0_u32;
    let mut cursor = open;
    let mut quote = None;
    let mut escaped = false;
    while cursor < bytes.len() {
        let byte = bytes[cursor];
        if let Some(active_quote) = quote {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == active_quote {
                quote = None;
            }
            cursor += 1;
            continue;
        }
        if matches!(byte, b'\'' | b'"' | b'`') {
            quote = Some(byte);
        } else if byte == b'(' {
            depth = depth.saturating_add(1);
        } else if byte == b')' {
            depth = depth.saturating_sub(1);
            if depth == 0 {
                return Some(cursor);
            }
        }
        cursor += 1;
    }
    None
}

fn comment_ranges(bytes: &[u8]) -> Vec<Range<usize>> {
    let mut ranges = Vec::new();
    let mut cursor = 0;
    let mut quote = None;
    let mut escaped = false;
    while cursor < bytes.len() {
        let byte = bytes[cursor];
        if let Some(active_quote) = quote {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == active_quote {
                quote = None;
            }
            cursor += 1;
            continue;
        }
        if matches!(byte, b'\'' | b'"' | b'`') {
            quote = Some(byte);
            cursor += 1;
            continue;
        }
        if bytes.get(cursor..cursor + 2) == Some(b"//") {
            let start = cursor;
            cursor += 2;
            while cursor < bytes.len() && bytes[cursor] != b'\n' {
                cursor += 1;
            }
            ranges.push(start..cursor);
        } else if bytes.get(cursor..cursor + 2) == Some(b"/*") {
            let start = cursor;
            cursor += 2;
            while cursor + 1 < bytes.len() && bytes.get(cursor..cursor + 2) != Some(b"*/") {
                cursor += 1;
            }
            cursor = (cursor + 2).min(bytes.len());
            ranges.push(start..cursor);
        } else {
            cursor += 1;
        }
    }
    ranges
}

#[cfg(test)]
mod tests {
    use super::extract;

    fn raws(source: &str) -> Vec<&str> {
        extract(source).into_iter().map(|candidate| candidate.raw()).collect()
    }

    #[test]
    fn extracts_only_static_class_attributes() {
        let source =
            r#"<div class="flex p-4" title="text-red-500"></div> const value = "bg-blue-500";"#;
        let candidates = raws(source);

        assert_eq!(candidates, vec!["flex", "p-4"]);
    }

    #[test]
    fn extracts_known_helper_literals_without_evaluating_code() {
        let source = r#"
            const classes = clsx("p-4", active && "bg-red-500", `text-${tone}`);
            const variant = cva("rounded", { variants: { size: { sm: "w-4" } } });
            const unrelated = "text-blue-500";
        "#;
        let candidates = raws(source);

        assert_eq!(candidates, vec!["p-4", "bg-red-500", "rounded", "w-4"]);
    }

    #[test]
    fn preserves_exact_source_spans() {
        let source = r#"<div className='hover:bg-red-500/50'></div>"#;
        let candidate = extract(source).into_iter().next().expect("candidate is present");

        let start = usize::try_from(candidate.span().start()).expect("span fits");
        let end = usize::try_from(candidate.span().end()).expect("span fits");
        assert_eq!(&source[start..end], candidate.raw());
    }

    #[test]
    fn ignores_dynamic_template_attributes() {
        let source = r#"<div className={`p-${size} text-red-500`}></div>"#;

        assert!(extract(source).is_empty());
    }

    #[test]
    fn ignores_class_like_text_inside_comments() {
        let source = r#"
            // clsx("p-4")
            /* <div class="flex"></div> */
            const classes = clsx("p-8");
        "#;

        assert_eq!(raws(source), vec!["p-8"]);
    }
}
