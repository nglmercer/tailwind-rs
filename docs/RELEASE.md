# Release and Versioning

## Versioning

Use semantic versioning.

Before `1.0`, treat minor versions as potentially breaking but document migrations.

After `1.0`:

- patch: bug fixes, no intentional public breakage,
- minor: backward-compatible features,
- major: breaking public API or stabilized grammar changes.

## Version surfaces

Version separately or in a coordinated workspace:

- Rust crates,
- CLI,
- Node/Bun package,
- WASM/Deno package,
- Vite plugin.

Prefer synchronized core semantic versions to reduce compatibility confusion.

## Protocol compatibility

Bindings/adapters that communicate through serialized data should expose a protocol/schema version.

## Release checklist

- all CI green,
- full test suite,
- adapter conformance suite,
- benchmark comparison,
- changelog,
- migration notes for breaking changes,
- docs match implementation,
- package smoke tests,
- reproducible build checks where practical.

## Artifact validation

The native package uses N-API's platform-package layout. Each advertised target
MUST be built in its native CI job. The CI workflow uploads those artifacts and
assembles them in a separate packaging job. After all target artifacts are present,
run `npm run prepare:release --workspace=@utilitycss/napi`; this copies binaries into
the four `packages/utilitycss-napi/npm/*` packages and adds them as optional
dependencies of the public `@utilitycss/napi` package. Publish those platform
packages and the root package from the same immutable tag.

Before publishing, run `cargo package --allow-dirty --workspace`,
`npm run validate:packages`, and `npm run smoke:packed-node` in a clean checkout
that contains a native artifact. The smoke test MUST install packed tarballs in
a separate temporary project and compile CSS without workspace symlinks.

## Changelog categories

- Added
- Changed
- Fixed
- Performance
- Deprecated
- Removed
- Security

## Deprecation

After `1.0`, deprecated APIs should normally survive at least one minor release before removal in a major release.

## Grammar stability

Class DSL syntax is a public API.

A syntax change can be more disruptive than a Rust API change and must be treated accordingly.

## Release channels

Possible future channels:

- stable,
- beta,
- nightly/next.

Do not create channels until there is a concrete user need.
