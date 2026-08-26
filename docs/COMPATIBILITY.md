# Compatibility Policy

## Default stance

The project is not automatically Tailwind-compatible.

Similarity of syntax does not imply compatibility.

## Compatibility dimensions

A compatibility preset may define:

- candidate grammar,
- default theme tokens,
- utility names,
- variant names,
- ordering behavior,
- generated CSS semantics.

## Conformance

Any compatibility claim must have fixtures.

Prefer statements like:

> Supports the documented subset X.

Avoid:

> Drop-in compatible.

unless demonstrated by broad conformance testing.

## Host compatibility

Semantic output must be consistent across:

- Rust native,
- CLI,
- Node,
- Bun,
- Deno,
- Vite.

Host APIs can differ, compiler meaning cannot.

## Browser support

Generated CSS browser support is part of the serializer/config policy. The supported deterministic
targets are `modern`, `evergreen`, `safari-15`, and `legacy`. The compiler analyzes the CSS IR and
reports unsupported feature use without silently changing semantics; a future lowering pass MAY
add explicit fallbacks. Browser policy is included in config fingerprints and capability manifests.
