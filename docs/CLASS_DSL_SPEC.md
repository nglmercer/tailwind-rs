# Class DSL Specification

## Purpose

Utility class names form a small domain-specific language.

The parser must treat them as structured syntax, not opaque strings.

## Informal grammar

Initial conceptual grammar:

```ebnf
candidate       = [important], variant_chain, utility ;
variant_chain   = { variant, ":" } ;
variant         = identifier | arbitrary_variant ;
utility         = [negative], utility_name, [value_part], [modifier] ;
value_part      = "-", value ;
modifier        = "/", value ;
value           = identifier | arbitrary_value ;
arbitrary_value = "[", arbitrary_content, "]" ;
important       = "!" ;
negative        = "-" ;
```

Exact grammar may evolve through RFC.

## Examples

```text
flex
p-4
-px-2
bg-red-500
bg-red-500/50
hover:bg-red-500
md:hover:bg-red-500/50
w-[37px]
grid-cols-[1fr_2fr]
data-[state=open]:opacity-100
```

## AST

Suggested shape:

```rust
pub struct CandidateAst<'a> {
    pub raw: &'a str,
    pub important: bool,
    pub variants: Vec<VariantAst<'a>>,
    pub utility: UtilityAst<'a>,
}

pub struct UtilityAst<'a> {
    pub negative: bool,
    pub family: &'a str,
    pub value: Option<ValueAst<'a>>,
    pub modifier: Option<ValueAst<'a>>,
}
```

Use borrowed slices where this materially reduces allocations and lifetime complexity remains manageable.

## Escaping

The DSL must define escaping for:

- `:`
- `/`
- `[`
- `]`
- whitespace
- backslash
- quotes inside arbitrary values when supported.

Do not infer escape behavior independently in multiple crates.

## Arbitrary values

Arbitrary values are powerful and security-sensitive.

The parser may accept broad arbitrary content, but semantic utilities MUST validate the subset they can safely lower.

Example:

```text
w-[calc(100%-2rem)]
```

could be allowed for sizing.

A color utility may allow:

```text
bg-[#ff00aa]
bg-[oklch(70%_0.2_30)]
```

Unknown or malformed values should produce either:

- a structured invalid-candidate result, or
- a diagnostic,

depending on API mode.

## Dynamic strings

The default compiler is static.

This cannot be fully discovered:

```tsx
`bg-${color}-500`
```

because the complete candidate does not exist in source text.

Optional AST-assisted extraction may recognize constrained patterns, but the base scanner MUST NOT execute program logic.

## Variant order

Variant composition order must be explicit.

Example:

```text
md:hover:bg-red-500
```

is not equivalent to arbitrary reordering.

The parser preserves author order. Semantic normalization may assign an internal canonical order only if output semantics remain correct.

## Unknown syntax

The scanner can be permissive.

The parser and resolver should distinguish:

- not a candidate,
- syntactically invalid candidate,
- syntactically valid but unknown utility,
- known utility with invalid value,
- unsupported variant composition.

## Stability

The grammar is considered unstable before `1.0`.

Any syntax change after stabilization requires:

- migration notes,
- compatibility analysis,
- version policy review.
