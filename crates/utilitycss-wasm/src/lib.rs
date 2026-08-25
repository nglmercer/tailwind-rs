//! Thin WebAssembly bindings over the runtime-independent compiler facade.

#![deny(missing_docs)]

use utilitycss_compiler::{Compiler, CompilerConfig, SourceInput};
use utilitycss_css_ir::CssSerializationMode;
use utilitycss_span::SourceId;
use wasm_bindgen::prelude::*;

/// A reusable WebAssembly-facing compiler instance.
#[wasm_bindgen]
pub struct WasmCompiler {
    inner: Compiler,
}

#[wasm_bindgen]
impl WasmCompiler {
    /// Creates a compiler, optionally selecting readable CSS output.
    #[wasm_bindgen(constructor)]
    pub fn new(pretty: bool) -> Self {
        let mode =
            if pretty { CssSerializationMode::Pretty } else { CssSerializationMode::Minified };
        Self { inner: Compiler::new(CompilerConfig::new().with_serialization_mode(mode)) }
    }

    /// Inserts or replaces one source unit.
    pub fn update_source(&mut self, id: String, content: String) -> Result<(), JsValue> {
        self.inner
            .update_source(SourceInput::new(SourceId::new(id), content))
            .map_err(|error| JsValue::from_str(&error.to_string()))
    }

    /// Removes one source unit and returns whether it existed.
    pub fn remove_source(&mut self, id: String) -> bool {
        self.inner.remove_source(&SourceId::new(id))
    }

    /// Builds the current sources and returns serialized CSS.
    pub fn build(&mut self) -> String {
        self.inner.build().css().to_owned()
    }
}
