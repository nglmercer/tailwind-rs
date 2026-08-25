# Configuration Specification

## Goals

Configuration should be:

- deterministic,
- runtime-independent,
- cacheable,
- serializable where practical,
- usable from CSS-first workflows,
- extensible without arbitrary code execution in core.

## Configuration layers

Suggested precedence:

1. built-in defaults,
2. preset(s),
3. project configuration,
4. inline compiler options,
5. command-specific overrides.

Later layers override earlier layers according to field-specific rules.

## CSS-first configuration

A CSS-based configuration format is attractive because it works across runtimes.

Conceptual example:

```css
@theme {
  --color-brand-500: oklch(62% 0.2 260);
  --spacing: 0.25rem;
  --breakpoint-md: 48rem;
}
```

The parser should lower this into a typed compiled theme.

## Structured configuration

A serializable JSON/TOML configuration MAY also exist.

Example:

```json
{
  "theme": {
    "spacingBase": "0.25rem"
  },
  "features": {
    "arbitraryValues": true
  }
}
```

## JavaScript configuration

Core MUST NOT require executing JavaScript.

A Node adapter may offer an optional JS configuration bridge later, but it must resolve JS objects into a plain serialized config before entering core.

## Compiled config

Hot paths should use immutable compiled config.

Example conceptual type:

```rust
pub struct CompiledConfig {
    pub theme: CompiledTheme,
    pub utilities: UtilityRegistry,
    pub variants: VariantRegistry,
    pub features: FeatureSet,
    pub fingerprint: ConfigFingerprint,
}
```

## Fingerprinting

The fingerprint should change when semantic output can change.

It should not depend on unstable memory addresses or unordered serialization.

## Validation

Configuration errors should be detected before compiling many candidates.

Examples:

- duplicate variant name,
- invalid breakpoint,
- invalid token syntax,
- conflicting registry entry,
- unsupported feature combination.

## Extension policy

Extension points should prefer declarative descriptions.

Native Rust extension APIs may be added for embedding use cases.

Cross-runtime plugin APIs should use a versioned protocol if introduced.
