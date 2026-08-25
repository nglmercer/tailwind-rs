//! Declarative, runtime-independent configuration loading for host adapters.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::{collections::BTreeMap, error::Error, fmt, fs, path::Path};

use serde::Deserialize;
use utilitycss_css_ir::CssSerializationMode;
use utilitycss_theme::Theme;

/// A validated configuration file ready to be translated into compiler options.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigFile {
    theme: Theme,
    serialization_mode: CssSerializationMode,
}

impl ConfigFile {
    /// Returns the configured theme.
    #[must_use]
    pub fn theme(&self) -> &Theme {
        &self.theme
    }

    /// Returns the configured output mode.
    #[must_use]
    pub const fn serialization_mode(&self) -> CssSerializationMode {
        self.serialization_mode
    }
}

impl Default for ConfigFile {
    fn default() -> Self {
        Self { theme: Theme::default(), serialization_mode: CssSerializationMode::Minified }
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
    Ok(ConfigFile { theme: builder.build(), serialization_mode: mode })
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
    mode: Option<String>,
    #[serde(default)]
    theme: RawTheme,
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

    use super::{parse_json, ConfigError};

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
    fn rejects_unknown_output_modes() {
        let error = parse_json(r#"{"mode":"compact"}"#).expect_err("mode is unsupported");

        assert!(matches!(error, ConfigError::InvalidMode(mode) if mode == "compact"));
    }
}
