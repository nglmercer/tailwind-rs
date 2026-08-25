# utilitycss

`utilitycss` is a planned, runtime-agnostic utility CSS compiler platform written in Rust.

It treats utility class names as a small domain-specific language and is designed to serve native Rust applications, a CLI, and thin integrations for Node.js, Bun, Deno, Vite, and SWC-based toolchains. The compiler core owns semantics; host runtimes own I/O and lifecycle integration.

> Status: documentation and architecture phase. This repository currently contains the project specifications and contributor guidance; the Cargo workspace and implementation are planned work. `utilitycss` is the working package name and may change before the first stable release.

## Design goals

- **Compiler first:** scanning, parsing, theme resolution, semantic lowering, and CSS emission are core concerns.
- **Runtime agnostic:** the semantic core MUST NOT depend on Node.js, Bun, Deno, Vite, SWC, or a browser runtime.
- **Structured internals:** candidates are parsed into explicit representations before CSS generation.
- **Deterministic output:** identical semantic inputs MUST produce byte-for-byte stable CSS.
- **Incremental by design:** source updates should invalidate only the affected candidates and rules.
- **Thin adapters:** bindings and build-tool integrations map host APIs onto the same compiler behavior.
- **Useful diagnostics:** errors should explain what failed, where it failed, and how to correct it when possible.

## Compiler model

Source such as:

```html
<div class="flex gap-4 p-4 hover:bg-brand-600 md:grid">
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
.gap-4 { gap: calc(var(--spacing) * 4); }
.p-4 { padding: calc(var(--spacing) * 4); }
/* variant-generated rules are omitted */
```

The example describes the intended model, not a currently runnable command in this repository.

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

## Compatibility

The project is inspired by utility-first CSS ergonomics, but it is **not** a drop-in Tailwind-compatible implementation. Any compatibility behavior MUST be published as an explicit preset with documented grammar, theme tokens, utilities, variants, ordering, and CSS semantics.

The same semantic input should produce equivalent output through native Rust, the CLI, Node.js, Bun, Deno, and Vite. Adapter APIs may differ; compiler meaning must not.

## Roadmap

The roadmap is organized around compiler risk:

1. **Foundation** — workspace, invariants, diagnostics, minimal CSS IR, CI, and benchmarks.
2. **Scanner and parser** — source scanning, escapes, candidate spans, and the class DSL AST.
3. **Utility compiler** — theme resolution, core utility families, arbitrary values, and ordering.
4. **Variants and incremental compilation** — variant composition, invalidation, and watch benchmarks.
5. **CLI and bindings** — native CLI, N-API, WASM where useful, and a versioned protocol.
6. **Host adapters** — Vite integration plus Node/Bun/Deno lifecycle and invalidation bridges.
7. **Ecosystem** — optional AST-assisted extraction, extensions, IDE services, and compatibility presets.

The detailed phase documents and release milestones are in [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Documentation

Start with [`LLMS.md`](./LLMS.md) for agent guidance, [`docs/VISION.md`](./docs/VISION.md) for goals and non-goals, and [`docs/SPECS.md`](./docs/SPECS.md) for requirements.

### Repository guidance

- [`AGENTS.md`](./AGENTS.md) — repository rules for contributors and coding agents.
- [`LLMS.md`](./LLMS.md) — instructions and priorities for autonomous coding agents.
- [`MANIFEST.json`](./MANIFEST.json) — machine-readable inventory of the repository documentation.

### Product and compiler design

- [`docs/VISION.md`](./docs/VISION.md) — product vision, principles, goals, and v1 non-goals.
- [`docs/SPECS.md`](./docs/SPECS.md) — functional and non-functional requirements.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — layers and responsibilities.
- [`docs/CLASS_DSL_SPEC.md`](./docs/CLASS_DSL_SPEC.md) — candidate grammar and parsing rules.
- [`docs/COMPILER_PIPELINE.md`](./docs/COMPILER_PIPELINE.md) — scan-to-CSS pipeline.
- [`docs/CONFIGURATION.md`](./docs/CONFIGURATION.md) — configuration, merging, and validation.
- [`docs/CRATE_LAYOUT.md`](./docs/CRATE_LAYOUT.md) — proposed Rust workspace boundaries.
- [`docs/API_DESIGN.md`](./docs/API_DESIGN.md) — core API and serialized type guidance.

### Integrations and operations

- [`docs/ADAPTERS.md`](./docs/ADAPTERS.md) — Node.js, Bun, Deno, Vite, and SWC adapter plans.
- [`docs/COMPATIBILITY.md`](./docs/COMPATIBILITY.md) — compatibility and conformance policy.
- [`docs/OBSERVABILITY.md`](./docs/OBSERVABILITY.md) — optional statistics, tracing, and privacy rules.
- [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md) — performance targets and benchmark guidance.
- [`docs/TESTING.md`](./docs/TESTING.md) — unit, integration, snapshot, fuzz, and conformance strategy.
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

Once the Cargo workspace exists, the baseline formatting, lint, test, and benchmark commands are defined in [`AGENTS.md`](./AGENTS.md). Do not treat those commands as available until the implementation phase creates the workspace.

## Project vocabulary

The project uses RFC 2119-style requirement words consistently: **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY**. The full terminology is maintained in [`docs/GLOSSARY.md`](./docs/GLOSSARY.md).
