# Runtime and Build Tool Adapters

## Principle

Adapters integrate host lifecycle APIs with the compiler.

Adapters MUST NOT own compiler semantics.

## Core API shape

All adapters should converge on a small common operation set:

```text
create compiler
compile source/candidates
update source
remove source
update config
get CSS
get diagnostics
dispose
```

## Node.js

Preferred native path: N-API.

Advantages:

- no separate Node ABI rebuild per version,
- strong performance,
- usable from Bun when compatible.

Package should expose TypeScript types.

Example conceptual API:

```ts
const compiler = createCompiler(options)
compiler.updateSource("src/app.tsx", code)
const result = compiler.build()
```

## Bun

First try to use the same N-API package.

Only create a Bun-specific native adapter if measured incompatibilities require it.

A Bun plugin wrapper may still be useful for lifecycle integration.

## Deno

Preferred options:

1. WASM with a JS/TS wrapper,
2. npm compatibility using the Node package where supported,
3. native FFI only if there is a strong reason.

Avoid making Deno support dependent on Node globals.

## Vite

The Vite adapter should:

- initialize one compiler instance,
- translate file changes into incremental updates,
- invalidate virtual CSS modules as needed,
- preserve source errors,
- keep dev and build semantics aligned.

Potential virtual module:

```text
virtual:utilitycss.css
```

or a transform based on a CSS entry directive.

The plugin should avoid rescanning the full project on every HMR update.

## SWC and framework extraction

`utilitycss-swc` is the production JavaScript-family extraction path. The CLI and N-API binding use
it automatically for JavaScript, TypeScript, JSX, and TSX inputs when the host does not provide
candidate spans.

Use cases:

- class helper analysis,
- JSX attribute extraction,
- constrained static expression evaluation,
- framework-specific syntax.

SWC extraction produces candidates. It does not generate CSS semantics independently. Vue, Svelte,
and Astro markup use the conservative framework extractor for static `:class`, `class:`, and
`class:list` forms; dynamic bindings remain intentionally unsupported.

```text
SWC AST
  ↓
candidate extractor
  ↓
CandidateInput[]
  ↓
normal compiler pipeline
```

## PostCSS

A compatibility adapter MAY be added later.

It should be implemented as an adapter around the compiler, not as the canonical architecture.

## Adapter conformance tests

Every adapter must pass the same behavior fixtures:

- input candidates,
- config,
- expected diagnostics,
- expected CSS.

The Rust conformance fixtures live under `crates/utilitycss-compiler/tests/fixtures`. Native Node
smoke coverage is run after a platform N-API build; the regular JavaScript tests use injectable
fakes so they remain runnable without a native binary.

This prevents semantic drift.

## Serialization boundary

Bindings should use compact plain data types.

Avoid exposing internal Rust enums directly if doing so would freeze implementation details.

Prefer versioned transport structs where needed.

## Lifecycle

Compiler instances should be reusable and explicitly disposable by hosts.

Adapters should avoid hidden process-global singleton compilers.
