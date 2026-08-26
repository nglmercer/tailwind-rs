# Production test matrix

The repository uses layered tests so one failing surface is easy to localize.

## Fast local loop

```bash
cargo fmt --all -- --check
cargo test -p utilitycss-swc
cargo test -p utilitycss-extractor
cargo test -p utilitycss-compiler --test conformance
cargo test -p utilitycss-lsp
npm run build --workspace=@utilitycss/node
npm test --workspace=@utilitycss/node
```

The compiler conformance fixtures cover basic utilities, variant ordering, arbitrary values,
multi-source deduplication, and duplicate diagnostic spans. SWC tests cover JSX, TSX, helper calls,
dynamic templates, parser failures, and byte-span round trips. Framework tests cover Vue bindings,
Svelte directives, and Astro `class:list` expressions.

## Full local gate

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
cargo bench -p utilitycss-bench
npm run lint
npm run typecheck
npm run build
npm test
```

## Native adapter gate

The native package must be built for each declared target before running the Node smoke test:

```bash
npm run build:native
npm run build --workspace=@utilitycss/node
npm test --workspace=@utilitycss/node
```

The native test is skipped when no platform binary is installed, but the native CI matrix MUST run
it on Linux, Windows, and macOS. A skipped test is not release evidence.

## Reliability properties

The scanner and candidate parser use `proptest` to exercise arbitrary valid UTF-8 input. The key
properties are that malformed input never panics, candidate spans remain source-valid, and an
incremental rebuild matches a clean rebuild. New compiler or extractor behavior MUST add a focused
fixture or regression test before it is released.
