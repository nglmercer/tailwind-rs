//! Typed, deterministic theme tokens used during semantic utility resolution.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::collections::BTreeMap;

/// Design tokens consumed by the initial utility compiler.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Theme {
    colors: BTreeMap<String, String>,
    spacing: BTreeMap<String, String>,
    breakpoints: BTreeMap<String, String>,
    radii: BTreeMap<String, String>,
    widths: BTreeMap<String, String>,
    heights: BTreeMap<String, String>,
}

impl Theme {
    /// Returns a builder pre-populated with the built-in baseline tokens.
    #[must_use]
    pub fn builder() -> ThemeBuilder {
        ThemeBuilder::with_defaults()
    }

    /// Looks up a color token by name.
    #[must_use]
    pub fn color(&self, key: &str) -> Option<&str> {
        self.colors.get(key).map(String::as_str)
    }

    /// Looks up a spacing token by name.
    #[must_use]
    pub fn spacing(&self, key: &str) -> Option<&str> {
        self.spacing.get(key).map(String::as_str)
    }

    /// Looks up a responsive breakpoint by name.
    #[must_use]
    pub fn breakpoint(&self, key: &str) -> Option<&str> {
        self.breakpoints.get(key).map(String::as_str)
    }

    /// Looks up a border-radius token by name.
    #[must_use]
    pub fn radius(&self, key: &str) -> Option<&str> {
        self.radii.get(key).map(String::as_str)
    }

    /// Looks up a width token by name.
    #[must_use]
    pub fn width(&self, key: &str) -> Option<&str> {
        self.widths.get(key).map(String::as_str)
    }

    /// Looks up a height token by name.
    #[must_use]
    pub fn height(&self, key: &str) -> Option<&str> {
        self.heights.get(key).map(String::as_str)
    }

    /// Returns a stable fingerprint for all theme tokens.
    #[must_use]
    pub fn fingerprint(&self) -> u64 {
        let mut hash = 0xcbf29ce484222325_u64;
        for map in [
            &self.colors,
            &self.spacing,
            &self.breakpoints,
            &self.radii,
            &self.widths,
            &self.heights,
        ] {
            for (key, value) in map {
                hash = fnv1a(hash, key.as_bytes());
                hash = fnv1a(hash, &[0]);
                hash = fnv1a(hash, value.as_bytes());
                hash = fnv1a(hash, &[0xff]);
            }
            hash = fnv1a(hash, &[0xfe]);
        }
        hash
    }
}

impl Default for Theme {
    fn default() -> Self {
        Self::builder().build()
    }
}

/// A builder for deterministic theme tokens.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ThemeBuilder {
    colors: BTreeMap<String, String>,
    spacing: BTreeMap<String, String>,
    breakpoints: BTreeMap<String, String>,
    radii: BTreeMap<String, String>,
    widths: BTreeMap<String, String>,
    heights: BTreeMap<String, String>,
}

impl ThemeBuilder {
    /// Creates a builder with the built-in baseline tokens.
    #[must_use]
    pub fn new() -> Self {
        Self::with_defaults()
    }

    fn with_defaults() -> Self {
        let mut builder = Self::default();
        for (key, value) in [
            ("0", "0px"),
            ("px", "1px"),
            ("0.5", "0.125rem"),
            ("1", "0.25rem"),
            ("2", "0.5rem"),
            ("3", "0.75rem"),
            ("4", "1rem"),
            ("6", "1.5rem"),
            ("8", "2rem"),
            ("12", "3rem"),
            ("16", "4rem"),
            ("24", "6rem"),
            ("32", "8rem"),
        ] {
            builder = builder.spacing(key, value);
        }
        for (key, value) in [
            ("transparent", "transparent"),
            ("black", "#000"),
            ("white", "#fff"),
            ("red-500", "#ef4444"),
            ("brand-600", "oklch(55% 0.2 260)"),
        ] {
            builder = builder.color(key, value);
        }
        for (key, value) in [("sm", "640px"), ("md", "768px"), ("lg", "1024px"), ("xl", "1280px")] {
            builder = builder.breakpoint(key, value);
        }
        for (key, value) in [
            ("none", "0px"),
            ("sm", "0.125rem"),
            ("DEFAULT", "0.25rem"),
            ("md", "0.375rem"),
            ("lg", "0.5rem"),
            ("full", "9999px"),
        ] {
            builder = builder.radius(key, value);
        }
        for (key, value) in [("auto", "auto"), ("full", "100%"), ("screen", "100vw")] {
            builder = builder.width(key, value);
        }
        for (key, value) in [("auto", "auto"), ("full", "100%"), ("screen", "100vh")] {
            builder = builder.height(key, value);
        }
        builder
    }

    /// Inserts or replaces a color token.
    #[must_use]
    pub fn color(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.colors.insert(key.into(), value.into());
        self
    }

    /// Inserts or replaces a spacing token.
    #[must_use]
    pub fn spacing(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.spacing.insert(key.into(), value.into());
        self
    }

    /// Inserts or replaces a breakpoint token.
    #[must_use]
    pub fn breakpoint(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.breakpoints.insert(key.into(), value.into());
        self
    }

    /// Inserts or replaces a border-radius token.
    #[must_use]
    pub fn radius(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.radii.insert(key.into(), value.into());
        self
    }

    /// Inserts or replaces a width token.
    #[must_use]
    pub fn width(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.widths.insert(key.into(), value.into());
        self
    }

    /// Inserts or replaces a height token.
    #[must_use]
    pub fn height(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.heights.insert(key.into(), value.into());
        self
    }

    /// Builds an immutable theme.
    #[must_use]
    pub fn build(self) -> Theme {
        Theme {
            colors: self.colors,
            spacing: self.spacing,
            breakpoints: self.breakpoints,
            radii: self.radii,
            widths: self.widths,
            heights: self.heights,
        }
    }
}

fn fnv1a(mut hash: u64, bytes: &[u8]) -> u64 {
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::Theme;

    #[test]
    fn builtins_provide_initial_tokens() {
        let theme = Theme::default();

        assert_eq!(theme.spacing("4"), Some("1rem"));
        assert_eq!(theme.color("red-500"), Some("#ef4444"));
        assert_eq!(theme.breakpoint("md"), Some("768px"));
        assert_eq!(theme.radius("DEFAULT"), Some("0.25rem"));
    }

    #[test]
    fn custom_tokens_change_a_stable_fingerprint() {
        let first = Theme::default().fingerprint();
        let second = Theme::builder().color("brand-500", "#123456").build().fingerprint();

        assert_ne!(first, second);
    }
}
