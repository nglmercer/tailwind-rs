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
