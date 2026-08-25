# Phase 6 — Smart Extraction and Ecosystem

## Objective

Expand capabilities without compromising the simple compiler core.

## SWC smart extractor

The first increment is a dependency-free static extractor for quoted class attributes and known
class helper calls. It feeds candidate text and spans toward the same compiler pipeline and does
not evaluate expressions. A full SWC AST adapter remains optional until its dependency and
version-isolation costs are justified.

Potentially understand:

```tsx
className="p-4"
clsx("p-4", active && "bg-red-500")
cva(...)
```

Only statically provable candidates should be emitted.

Do not execute user code.

## Framework extractors

Possible adapters:

- React/JSX,
- Solid,
- Vue,
- Svelte,
- templating languages.

The text scanner remains the baseline.

## Plugin system

Before implementing plugins, answer:

- trusted native vs portable plugins?
- can plugins define utilities?
- can plugins define variants?
- can they affect ordering?
- how are plugin versions isolated?
- how is determinism preserved?

Prefer declarative plugin descriptions where possible.

## IDE services

Potential shared services:

- candidate parse API,
- validation,
- completion metadata,
- hover docs,
- class-to-generated-CSS preview.

## Compatibility presets

May add opt-in syntax/theme presets for migration from other utility frameworks.

Do not claim full compatibility without a conformance suite.

## Exit criteria

This phase is iterative. Features graduate when they have:

- stable semantics,
- tests,
- performance data,
- documentation,
- adapter/core boundary compliance.
