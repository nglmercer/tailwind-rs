//! Declarative, runtime-independent configuration loading for host adapters.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::{collections::BTreeMap, error::Error, fmt, fs, path::Path};

use serde::Deserialize;
use utilitycss_css_ir::CssSerializationMode;
use utilitycss_theme::Theme;
use utilitycss_utilities::{ColorKind, Dimension, SpacingEdge, UtilityDefinition, UtilityRegistry};
use utilitycss_variants::{VariantDefinition, VariantRegistry};

/// A named compatibility profile applied before user extensions.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum CompatibilityPreset {
    /// The native utilitycss baseline semantics.
    #[default]
    UtilityCss,
    /// The documented Tailwind-inspired subset implemented by this release.
    TailwindV4Subset,
}

/// A validated configuration file ready to be translated into compiler options.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigFile {
    preset: CompatibilityPreset,
    theme: Theme,
    utilities: UtilityRegistry,
    variants: VariantRegistry,
    serialization_mode: CssSerializationMode,
}

impl ConfigFile {
    /// Returns the selected compatibility profile.
    #[must_use]
    pub const fn preset(&self) -> CompatibilityPreset {
        self.preset
    }

    /// Returns the configured theme.
    #[must_use]
    pub fn theme(&self) -> &Theme {
        &self.theme
    }

    /// Returns the utility registry after preset and plugin extensions are applied.
    #[must_use]
    pub const fn utilities(&self) -> &UtilityRegistry {
        &self.utilities
    }

    /// Returns the variant registry after preset and plugin extensions are applied.
    #[must_use]
    pub const fn variants(&self) -> &VariantRegistry {
        &self.variants
    }

    /// Returns the configured output mode.
    #[must_use]
    pub const fn serialization_mode(&self) -> CssSerializationMode {
        self.serialization_mode
    }
}

impl Default for ConfigFile {
    fn default() -> Self {
        Self {
            preset: CompatibilityPreset::UtilityCss,
            theme: Theme::default(),
            utilities: UtilityRegistry::default(),
            variants: VariantRegistry::default(),
            serialization_mode: CssSerializationMode::Minified,
        }
    }
}

/// Errors raised while loading or validating configuration.
#[derive(Debug)]
pub enum ConfigError {
    /// The JSON document could not be decoded.
    InvalidJson(String),
    /// The configuration file could not be read.
    Io {
        /// Path that failed to load.
        path: String,
        /// Host I/O error message.
        message: String,
    },
    /// The configured output mode is not recognized.
    InvalidMode(String),
    /// The configured compatibility profile is not recognized.
    InvalidPreset(String),
    /// A plugin utility or variant definition is invalid.
    InvalidPlugin {
        /// User-provided utility or variant name.
        name: String,
        /// Validation failure detail.
        message: String,
    },
}

impl fmt::Display for ConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidJson(message) => {
                write!(formatter, "invalid JSON configuration: {message}")
            }
            Self::Io { path, message } => {
                write!(formatter, "could not read configuration `{path}`: {message}")
            }
            Self::InvalidMode(mode) => write!(formatter, "invalid output mode `{mode}`"),
            Self::InvalidPreset(preset) => {
                write!(formatter, "invalid compatibility preset `{preset}`")
            }
            Self::InvalidPlugin { name, message } => {
                write!(formatter, "invalid plugin definition `{name}`: {message}")
            }
        }
    }
}

impl Error for ConfigError {}

/// Parses a JSON configuration document.
pub fn parse_json(input: &str) -> Result<ConfigFile, ConfigError> {
    let raw: RawConfig =
        serde_json::from_str(input).map_err(|error| ConfigError::InvalidJson(error.to_string()))?;
    let mode = match raw.mode.as_deref() {
        None | Some("minified") => CssSerializationMode::Minified,
        Some("pretty") => CssSerializationMode::Pretty,
        Some(mode) => return Err(ConfigError::InvalidMode(mode.to_owned())),
    };

    let preset = match raw.preset.as_deref() {
        None | Some("utilitycss") => CompatibilityPreset::UtilityCss,
        Some("tailwind-v4-subset") => CompatibilityPreset::TailwindV4Subset,
        Some(preset) => return Err(ConfigError::InvalidPreset(preset.to_owned())),
    };

    let mut builder = Theme::builder();
    for (key, value) in raw.theme.colors {
        builder = builder.color(key, value);
    }
    for (key, value) in raw.theme.spacing {
        builder = builder.spacing(key, value);
    }
    for (key, value) in raw.theme.breakpoints {
        builder = builder.breakpoint(key, value);
    }
    for (key, value) in raw.theme.radii {
        builder = builder.radius(key, value);
    }
    for (key, value) in raw.theme.widths {
        builder = builder.width(key, value);
    }
    for (key, value) in raw.theme.heights {
        builder = builder.height(key, value);
    }
    let mut utilities = UtilityRegistry::default();
    for (name, definition) in raw.utilities {
        utilities.register(name.clone(), utility_definition(&name, definition)?);
    }
    let mut variants = VariantRegistry::default();
    for (name, definition) in raw.variants {
        variants.register(name.clone(), variant_definition(&name, definition)?);
    }
    Ok(ConfigFile { preset, theme: builder.build(), utilities, variants, serialization_mode: mode })
}

/// Loads and parses a JSON configuration file from disk.
pub fn load(path: impl AsRef<Path>) -> Result<ConfigFile, ConfigError> {
    let path = path.as_ref();
    let input = fs::read_to_string(path).map_err(|error| ConfigError::Io {
        path: path.display().to_string(),
        message: error.to_string(),
    })?;
    parse_json(&input)
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct RawConfig {
    #[serde(default)]
    preset: Option<String>,
    #[serde(default)]
    mode: Option<String>,
    #[serde(default)]
    theme: RawTheme,
    #[serde(default)]
    utilities: BTreeMap<String, RawUtilityDefinition>,
    #[serde(default)]
    variants: BTreeMap<String, RawVariantDefinition>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
enum RawUtilityDefinition {
    Static { property: String, value: String, order: u16 },
    Spacing { margin: bool, edge: String, order: u16 },
    Gap { edge: String, order: u16 },
    Size { dimension: String, order: u16 },
    Color { kind: String, order: u16 },
    Radius { order: u16 },
    AlignItems { order: u16 },
    JustifyContent { order: u16 },
    GridColumns { order: u16 },
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
enum RawVariantDefinition {
    Pseudo { suffix: String, order: u16 },
    Media { name: String, prelude: String, order: u16 },
    Ancestor { prefix: String, order: u16 },
}

fn utility_definition(
    name: &str,
    definition: RawUtilityDefinition,
) -> Result<UtilityDefinition, ConfigError> {
    let invalid = |message: &str| ConfigError::InvalidPlugin {
        name: name.to_owned(),
        message: message.to_owned(),
    };
    match definition {
        RawUtilityDefinition::Static { property, value, order } => {
            Ok(UtilityDefinition::static_declaration(property, value, order))
        }
        RawUtilityDefinition::Spacing { margin, edge, order } => Ok(UtilityDefinition::Spacing {
            margin,
            edge: parse_edge(&edge).ok_or_else(|| invalid("unknown spacing edge"))?,
            order,
        }),
        RawUtilityDefinition::Gap { edge, order } => Ok(UtilityDefinition::Gap {
            edge: parse_edge(&edge).ok_or_else(|| invalid("unknown gap edge"))?,
            order,
        }),
        RawUtilityDefinition::Size { dimension, order } => Ok(UtilityDefinition::Size {
            dimension: parse_dimension(&dimension).ok_or_else(|| invalid("unknown dimension"))?,
            order,
        }),
        RawUtilityDefinition::Color { kind, order } => Ok(UtilityDefinition::Color {
            kind: parse_color_kind(&kind).ok_or_else(|| invalid("unknown color kind"))?,
            order,
        }),
        RawUtilityDefinition::Radius { order } => Ok(UtilityDefinition::Radius { order }),
        RawUtilityDefinition::AlignItems { order } => Ok(UtilityDefinition::AlignItems { order }),
        RawUtilityDefinition::JustifyContent { order } => {
            Ok(UtilityDefinition::JustifyContent { order })
        }
        RawUtilityDefinition::GridColumns { order } => Ok(UtilityDefinition::GridColumns { order }),
    }
}

fn variant_definition(
    name: &str,
    definition: RawVariantDefinition,
) -> Result<VariantDefinition, ConfigError> {
    let invalid = |message: &str| ConfigError::InvalidPlugin {
        name: name.to_owned(),
        message: message.to_owned(),
    };
    match definition {
        RawVariantDefinition::Pseudo { suffix, order } => {
            if !suffix.starts_with(':') {
                return Err(invalid("pseudo suffix must start with `:`"));
            }
            Ok(VariantDefinition::pseudo(suffix, order))
        }
        RawVariantDefinition::Media { name, prelude, order } => {
            if name.is_empty() || prelude.is_empty() {
                return Err(invalid("media name and prelude must not be empty"));
            }
            Ok(VariantDefinition::media(name, prelude, order))
        }
        RawVariantDefinition::Ancestor { prefix, order } => {
            if prefix.is_empty() {
                return Err(invalid("ancestor prefix must not be empty"));
            }
            Ok(VariantDefinition::ancestor(prefix, order))
        }
    }
}

fn parse_edge(value: &str) -> Option<SpacingEdge> {
    Some(match value {
        "all" => SpacingEdge::All,
        "x" => SpacingEdge::X,
        "y" => SpacingEdge::Y,
        "top" => SpacingEdge::Top,
        "right" => SpacingEdge::Right,
        "bottom" => SpacingEdge::Bottom,
        "left" => SpacingEdge::Left,
        _ => return None,
    })
}

fn parse_dimension(value: &str) -> Option<Dimension> {
    Some(match value {
        "width" => Dimension::Width,
        "height" => Dimension::Height,
        "minWidth" => Dimension::MinWidth,
        "maxWidth" => Dimension::MaxWidth,
        "minHeight" => Dimension::MinHeight,
        "maxHeight" => Dimension::MaxHeight,
        _ => return None,
    })
}

fn parse_color_kind(value: &str) -> Option<ColorKind> {
    Some(match value {
        "background" => ColorKind::Background,
        "text" => ColorKind::Text,
        "border" => ColorKind::Border,
        _ => return None,
    })
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct RawTheme {
    #[serde(default)]
    colors: BTreeMap<String, String>,
    #[serde(default)]
    spacing: BTreeMap<String, String>,
    #[serde(default)]
    breakpoints: BTreeMap<String, String>,
    #[serde(default)]
    radii: BTreeMap<String, String>,
    #[serde(default)]
    widths: BTreeMap<String, String>,
    #[serde(default)]
    heights: BTreeMap<String, String>,
}

#[cfg(test)]
mod tests {
    use utilitycss_css_ir::CssSerializationMode;

    use super::{parse_json, CompatibilityPreset, ConfigError};

    #[test]
    fn parses_typed_theme_overrides_and_mode() {
        let config = parse_json(
            r##"{
                "mode": "pretty",
                "theme": {
                    "colors": { "brand-500": "#123456" },
                    "spacing": { "4": "1.25rem" }
                }
            }"##,
        )
        .expect("configuration is valid");

        assert_eq!(config.serialization_mode(), CssSerializationMode::Pretty);
        assert_eq!(config.theme().color("brand-500"), Some("#123456"));
        assert_eq!(config.theme().spacing("4"), Some("1.25rem"));
        assert_eq!(config.theme().spacing("8"), Some("2rem"));
    }

    #[test]
    fn parses_versioned_preset_and_plugin_registries() {
        let config = parse_json(
            r##"{
                "preset": "tailwind-v4-subset",
                "utilities": {
                    "content-center": {
                        "type": "static",
                        "property": "place-content",
                        "value": "center",
                        "order": 63
                    }
                },
                "variants": {
                    "motion-safe": {
                        "type": "media",
                        "name": "media",
                        "prelude": "(prefers-reduced-motion: no-preference)",
                        "order": 170
                    }
                }
            }"##,
        )
        .expect("preset and plugin definitions are valid");

        assert_eq!(config.preset(), CompatibilityPreset::TailwindV4Subset);
        assert!(config.utilities().contains("content-center"));
        assert!(config.variants().get("motion-safe").is_some());
    }

    #[test]
    fn rejects_unknown_presets_and_invalid_plugin_shapes() {
        assert!(matches!(
            parse_json(r#"{"preset":"tailwind"}"#),
            Err(ConfigError::InvalidPreset(preset)) if preset == "tailwind"
        ));
        assert!(matches!(
            parse_json(
                r#"{"variants":{"bad":{"type":"pseudo","suffix":"hover","order":1}}}"#
            ),
            Err(ConfigError::InvalidPlugin { name, .. }) if name == "bad"
        ));
    }

    #[test]
    fn rejects_unknown_output_modes() {
        let error = parse_json(r#"{"mode":"compact"}"#).expect_err("mode is unsupported");

        assert!(matches!(error, ConfigError::InvalidMode(mode) if mode == "compact"));
    }
}
