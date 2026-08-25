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

## SWC

SWC is an optional smart extraction path.

Use cases:

- class helper analysis,
- JSX attribute extraction,
- constrained static expression evaluation,
- framework-specific syntax.

SWC extraction produces candidates. It does not generate CSS semantics independently.

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

This prevents semantic drift.

## Serialization boundary

Bindings should use compact plain data types.

Avoid exposing internal Rust enums directly if doing so would freeze implementation details.

Prefer versioned transport structs where needed.

## Lifecycle

Compiler instances should be reusable and explicitly disposable by hosts.

Adapters should avoid hidden process-global singleton compilers.
