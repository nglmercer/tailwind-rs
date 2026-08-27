# utilitycss

`utilitycss` is a runtime-agnostic utility CSS compiler platform written in Rust.

It treats utility class names as a small domain-specific language and is designed to serve native Rust applications, a CLI, and thin integrations for Node.js, Bun, Deno, Vite, and SWC-based toolchains. The compiler core owns semantics; host runtimes own I/O and lifecycle integration.

> Status: production-readiness implementation in progress. The workspace now includes SWC AST extraction, Vue/Svelte/Astro static framework extraction, versioned registry presets/plugins, an LSP adapter, conformance fixtures, native extraction smoke coverage, and malformed-input property tests. Full Tailwind compatibility, broader framework semantics, and release hardening still require their explicit gates; `utilitycss` remains pre-1.0.

## Design goals

- **Compiler first:** scanning, parsing, theme resolution, semantic lowering, and CSS emission are core concerns.
- **Runtime agnostic:** the semantic core MUST NOT depend on Node.js, Bun, Deno, Vite, SWC, or a browser runtime.
- **Structured internals:** candidates are parsed into explicit representations before CSS generation.
- **Deterministic output:** identical semantic inputs MUST produce byte-for-byte stable CSS.
- **Incremental by design:** source updates SHOULD invalidate only the affected candidates and rules.
- **Thin adapters:** bindings and build-tool integrations map host APIs onto the same compiler behavior.
- **Useful diagnostics:** errors should explain what failed, where it failed, and how to correct it when possible.

## Compiler model

Source such as:

```html
<div class="flex gap-4 p-4 hover:bg-brand-600 md:grid"></div>
```

is intended to pass through this pipeline:

```text
source bytes
    -> scanner
    -> candidate parser
    -> theme/config resolution
    -> utility and variant resolver
    -> CSS intermediate representation
    -> deterministic ordering and emission
```

An illustrative result is:

```css
.flex { display: flex; }
.gap-4 { gap: 1rem; }
.p-4 { padding: 1rem; }
/* variant-generated rules are omitted */
```

The current CLI can emit this same semantic subset with `cargo run -p utilitycss-cli -- build <input>`.

## Architecture

Host tools such as the CLI, Vite, Node.js, Bun, Deno, and SWC integrations sit at the edge of the system:

```text
host tools -> bindings/adapters -> compiler facade -> semantic crates -> CSS IR -> emitter
```

The core boundary is deliberate:

- scanners accept source content supplied by the host and return candidates with spans;
- the DSL parser produces a stable candidate AST;
- configuration and theme data are compiled into typed representations;
- utilities and variants resolve candidates into semantic CSS behavior;
- the CSS IR carries declarations, wrappers, ordering metadata, and source attribution;
- the emitter produces deterministic CSS;
- adapters provide filesystem, watch-mode, process, and host-runtime behavior outside the core.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/CRATE_LAYOUT.md`](./docs/CRATE_LAYOUT.md) for the detailed boundaries.

## Current implementation

The initial workspace is intentionally small and runtime-independent:

- [`utilitycss-span`](./crates/utilitycss-span/) — stable source IDs and half-open byte spans.
- [`utilitycss-diagnostics`](./crates/utilitycss-diagnostics/) — typed, source-aware diagnostics.
- [`utilitycss-scanner`](./crates/utilitycss-scanner/) — language-agnostic candidate discovery with spans.
- [`utilitycss-extractor`](./crates/utilitycss-extractor/) — conservative static extraction from class attributes and common class helpers.
- [`utilitycss-swc`](./crates/utilitycss-swc/) — SWC AST extraction for JavaScript, TypeScript, JSX, and TSX with byte-accurate spans.
- [`utilitycss-syntax`](./crates/utilitycss-syntax/) — borrowed candidate AST and DSL parser.
- [`utilitycss-theme`](./crates/utilitycss-theme/) — deterministic typed design tokens.
- [`utilitycss-utilities`](./crates/utilitycss-utilities/) — extensible initial utility registry and lowering.
- [`utilitycss-variants`](./crates/utilitycss-variants/) — selector and wrapper transformations.
- [`utilitycss-css-ir`](./crates/utilitycss-css-ir/) — ordered CSS rules and pretty/minified serialization.
- [`utilitycss-stylesheet`](./crates/utilitycss-stylesheet/) — token-aware authored CSS transformation and `@apply` composition.
- [`utilitycss-compiler`](./crates/utilitycss-compiler/) — source indexes, semantic cache, and compiler facade.
- [`utilitycss-introspect`](./crates/utilitycss-introspect/) — discoverable explain/validate/capability API boundary.
- [`utilitycss-compat`](./crates/utilitycss-compat/) — explicit compatibility profiles and reports.
- [`utilitycss-config`](./crates/utilitycss-config/) — declarative JSON configuration loader.
- [`utilitycss-cli`](./crates/utilitycss-cli/) — native build/watch adapter.
- [`utilitycss-napi`](./crates/utilitycss-napi/) and [`utilitycss-wasm`](./crates/utilitycss-wasm/) — thin native/WASM bindings.
- [`utilitycss-protocol`](./crates/utilitycss-protocol/) — versioned typed/JSON transport messages for external hosts.
- [`utilitycss-lsp`](./crates/utilitycss-lsp/) — stdio Language Server Protocol adapter with diagnostics, completion, and hover.
- [`utilitycss-bench`](./crates/utilitycss-bench/) — dependency-free scanner/parser benchmark harness.
- [`@utilitycss/node`](./packages/utilitycss-node/) — generic JavaScript lifecycle/compiler adapter.
- [`@utilitycss/bun`](./packages/utilitycss-bun/) — Bun bundler, fullstack, and HMR plugin.
- [`@utilitycss/vite`](./packages/utilitycss-vite/) — Vite lifecycle adapter.
- [`@utilitycss/wasm`](./packages/utilitycss-wasm/) — TypeScript wrapper for generated WASM bindings.

The facade currently compiles the documented vNext utility and variant subset and exposes the same
registry through explain, validate, completion, hover, capability, and compatibility APIs. It
remains intentionally conservative: scanner false positives are ignored, unknown syntax is
reported as structured diagnostics when appropriate, and arbitrary CSS fragments are validated
before lowering. See [`docs/PRODUCTION_CONTRACT.md`](./docs/PRODUCTION_CONTRACT.md) for the
support and release contract.

## Compatibility

The project is inspired by utility-first CSS ergonomics, but it is **not** a drop-in Tailwind-compatible implementation. Any compatibility behavior MUST be published as an explicit preset with documented grammar, theme tokens, utilities, variants, ordering, and CSS semantics.

The same semantic input SHOULD produce equivalent output through native Rust, the CLI, Node.js, Bun, Deno, and Vite. Adapter APIs MAY differ; compiler meaning MUST NOT.

## Roadmap

The roadmap is organized around compiler risk:

1. **Foundation** — workspace, invariants, diagnostics, minimal CSS IR, CI, and benchmarks.
2. **Scanner and parser** — source scanning, escapes, candidate spans, and the class DSL AST.
3. **Utility compiler** — theme resolution, core utility families, arbitrary values, and ordering.
4. **Variants and incremental compilation** — variant composition, invalidation, and watch benchmarks.
5. **CLI and bindings** — native CLI, N-API, WASM where useful, and a versioned protocol.
6. **Host adapters** — Vite integration plus Node/Bun/Deno lifecycle and invalidation bridges.
7. **Ecosystem** — AST-assisted extraction, framework adapters, declarative extensions, IDE services, and compatibility presets.

The detailed phase documents and release milestones are in [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Documentation

Start with [`LLMS.md`](./LLMS.md) for agent guidance, [`docs/VISION.md`](./docs/VISION.md) for goals and non-goals, and [`docs/SPECS.md`](./docs/SPECS.md) for requirements.

### Repository guidance

- [`README.md`](./README.md) — project overview and documentation index.
- [`AGENTS.md`](./AGENTS.md) — repository rules for contributors and coding agents.
- [`LLMS.md`](./LLMS.md) — instructions and priorities for autonomous coding agents.
- [`MANIFEST.json`](./MANIFEST.json) — machine-readable inventory of the repository documentation.

### Product and compiler design

- [`docs/VISION.md`](./docs/VISION.md) — product vision, principles, goals, and v1 non-goals.
- [`docs/SPECS.md`](./docs/SPECS.md) — functional and non-functional requirements.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — layers and responsibilities.
- [`docs/CLASS_DSL_SPEC.md`](./docs/CLASS_DSL_SPEC.md) — candidate grammar and parsing rules.
- [`docs/CLASS_DSL.ebnf`](./docs/CLASS_DSL.ebnf) — normative versioned grammar productions.
- [`docs/COMPILER_PIPELINE.md`](./docs/COMPILER_PIPELINE.md) — scan-to-CSS pipeline.
- [`docs/CONFIGURATION.md`](./docs/CONFIGURATION.md) — configuration, merging, and validation.
- [`docs/CAPABILITIES.md`](./docs/CAPABILITIES.md) — generated manifests and LLM/IDE metadata.
- [`docs/MIGRATION_VNEXT.md`](./docs/MIGRATION_VNEXT.md) — vNext grammar and API migration notes.
- [`docs/CRATE_LAYOUT.md`](./docs/CRATE_LAYOUT.md) — proposed Rust workspace boundaries.
- [`docs/API_DESIGN.md`](./docs/API_DESIGN.md) — core API and serialized type guidance.

### Integrations and operations

- [`docs/ADAPTERS.md`](./docs/ADAPTERS.md) — Node.js, Bun, Deno, Vite, and SWC adapter plans.
- [`docs/COMPATIBILITY.md`](./docs/COMPATIBILITY.md) — compatibility and conformance policy.
- [`docs/OBSERVABILITY.md`](./docs/OBSERVABILITY.md) — optional statistics, tracing, and privacy rules.
- [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md) — performance targets and benchmark guidance.
- [`docs/TESTING.md`](./docs/TESTING.md) — unit, integration, snapshot, fuzz, and conformance strategy.
- [`docs/PRODUCTION_TEST_MATRIX.md`](./docs/PRODUCTION_TEST_MATRIX.md) — executable local and CI test gates.
- [`docs/SECURITY.md`](./docs/SECURITY.md) — threat model and safe handling of untrusted input.
- [`docs/CODE_STYLE.md`](./docs/CODE_STYLE.md) — Rust, TypeScript, and JavaScript conventions.

### Project process and reference

- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phases, exit criteria, and release milestones.
- [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) — change, review, and RFC/ADR expectations.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — accepted architectural decisions.
- [`docs/RELEASE.md`](./docs/RELEASE.md) — versioning, protocols, and release checklist.
- [`docs/GLOSSARY.md`](./docs/GLOSSARY.md) — canonical terminology.

### Roadmap phases

- [`docs/roadmap/PHASE_0_FOUNDATION.md`](./docs/roadmap/PHASE_0_FOUNDATION.md)
- [`docs/roadmap/PHASE_1_SCANNER_PARSER.md`](./docs/roadmap/PHASE_1_SCANNER_PARSER.md)
- [`docs/roadmap/PHASE_2_UTILITY_COMPILER.md`](./docs/roadmap/PHASE_2_UTILITY_COMPILER.md)
- [`docs/roadmap/PHASE_3_VARIANTS_INCREMENTAL.md`](./docs/roadmap/PHASE_3_VARIANTS_INCREMENTAL.md)
- [`docs/roadmap/PHASE_4_BINDINGS_CLI.md`](./docs/roadmap/PHASE_4_BINDINGS_CLI.md)
- [`docs/roadmap/PHASE_5_ADAPTERS.md`](./docs/roadmap/PHASE_5_ADAPTERS.md)
- [`docs/roadmap/PHASE_6_ECOSYSTEM.md`](./docs/roadmap/PHASE_6_ECOSYSTEM.md)

### Reusable templates

- [`docs/templates/ADR_TEMPLATE.md`](./docs/templates/ADR_TEMPLATE.md)
- [`docs/templates/RFC_TEMPLATE.md`](./docs/templates/RFC_TEMPLATE.md)
- [`docs/templates/PR_CHECKLIST.md`](./docs/templates/PR_CHECKLIST.md)

## Contributing

Before implementation work, read [`LLMS.md`](./LLMS.md), [`docs/VISION.md`](./docs/VISION.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), and the relevant specification and roadmap phase. Externally visible grammar, configuration, ordering, API, or architecture changes SHOULD be recorded through the RFC/ADR process described in [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md).

The baseline formatting, lint, test, and benchmark commands are defined in [`AGENTS.md`](./AGENTS.md) and are runnable against the current workspace.

## Bun example

`utilitycss` also provides an `@apply`-compatible composition directive backed by the Rust utility
registry:

```css
.button {
  @apply flex items-center gap-2 rounded bg-brand-600 p-4 text-white;
}
```

See [`docs/APPLY.md`](./docs/APPLY.md) for supported variants, diagnostics, ordering, adapter APIs,
and compatibility limitations.

`@utilitycss/node` is the generic JavaScript compiler lifecycle API. `@utilitycss/bun` integrates
that API with Bun's bundler, fullstack server, and HMR lifecycle:

```bash
bun add @utilitycss/bun
```

```toml
[serve.static]
plugins = ["@utilitycss/bun"]
```

```html
<link rel="stylesheet" href="utilitycss" />
```

Development can run with `bun --hot src/server.ts`; the plugin generates a virtual stylesheet from
the current Bun module graph and does not require a second watcher or `public/utilitycss.css`.
Production builds should pass `utilitycss()` explicitly to `Bun.build()`.

[`examples/bun`](./examples/bun/) is a Flowbite/daisyUI-parity gallery — 38 components (buttons/groups/dropdowns, badges/avatars/accordion, cards/pricing/carousel/jumbotron, breadcrumbs/pagination/tabs/navbar/sidebar/stepper, forms/inputs/toggles, alerts/banner/progress/spinner/skeleton/rating/timeline/list/toast, table/modal/drawer/popover/tooltip) built with Preact and Bun HMR. Components live in `src/components/*` and are styled via deterministic `utilitycss` utilities + `@apply` recipes. Its README includes setup, `bun run verify`, the production build, HMR, and packed integration details.

## Local validation

From the repository root:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
cargo bench -p utilitycss-bench
```

The conformance fixtures can be run directly with:

```bash
cargo test -p utilitycss-compiler --test conformance
cargo test -p utilitycss-swc
cargo test -p utilitycss-lsp
```

These commands validate the current Rust workspace. They do not imply that every later roadmap feature is implemented.

For the reproducible local release gate, run:

```bash
npm run release:check
```

This reports unavailable external native architectures as `SKIP`; skipped platform checks are not
release evidence.

JavaScript adapter checks use npm:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

The native N-API package requires a platform binary produced from `utilitycss-napi` before the default Node loader can be used. Wrapper tests inject a fake native constructor so lifecycle behavior remains testable without that binary.

## Project vocabulary

The project uses RFC 2119-style requirement words consistently: **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY**. The full terminology is maintained in [`docs/GLOSSARY.md`](./docs/GLOSSARY.md).
