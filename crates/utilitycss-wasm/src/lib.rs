//! Thin WebAssembly bindings over the runtime-independent compiler facade.

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use serde::{Deserialize, Serialize};
use utilitycss_compiler::{CandidateInput, Compiler, CompilerConfig, SourceInput};
use utilitycss_css_ir::CssSerializationMode;
use utilitycss_scanner::ExtractionMode;
use utilitycss_span::{SourceId, Span};
use utilitycss_stylesheet::{transform_stylesheet, StylesheetInput};
use wasm_bindgen::prelude::*;

/// A reusable WebAssembly-facing compiler instance.
#[wasm_bindgen]
pub struct WasmCompiler {
    inner: Compiler,
}

#[derive(Serialize)]
struct WasmDiagnostic {
    severity: String,
    code: String,
    message: String,
    source: Option<String>,
    start: Option<u32>,
    end: Option<u32>,
    help: Option<String>,
    explanation: Option<String>,
    suggestions: Vec<String>,
}

#[derive(Serialize)]
struct WasmStylesheetResult {
    css: String,
    diagnostics: Vec<WasmDiagnostic>,
}

#[derive(Deserialize)]
struct WasmCandidateInput {
    raw: String,
    start: u32,
    end: u32,
    #[serde(default, rename = "extractionMode")]
    extraction_mode: Option<String>,
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

    /// Inserts or replaces one source unit using the language-agnostic scanner.
    ///
    /// This is intentionally a raw scanner surface. Host applications that can parse their
    /// source language should use [`Self::update_source_with_candidates`] to preserve the same
    /// candidate-selection semantics as the native AST adapters.
    pub fn update_source(&mut self, id: String, content: String) -> Result<(), JsValue> {
        self.inner
            .update_source(SourceInput::new(SourceId::new(id), content))
            .map_err(|error| JsValue::from_str(&error.to_string()))
    }

    /// Inserts or replaces one source unit using host-selected candidate spans.
    ///
    /// Each item must contain `raw`, `start`, and `end` fields. `extractionMode` is optional and
    /// defaults to `text`; accepted values are `text`, `static`, `ast`, and `hybrid`.
    #[wasm_bindgen(js_name = updateSourceWithCandidates)]
    pub fn update_source_with_candidates(
        &mut self,
        id: String,
        content: String,
        candidates: JsValue,
    ) -> Result<(), JsValue> {
        let inputs = serde_wasm_bindgen::from_value::<Vec<WasmCandidateInput>>(candidates)
            .map_err(|error| JsValue::from_str(&format!("invalid candidate list: {error}")))?
            .into_iter()
            .map(|candidate| {
                let span = Span::new(candidate.start, candidate.end)
                    .ok_or_else(|| "candidate start must not exceed candidate end".to_owned())?;
                let mode = candidate
                    .extraction_mode
                    .as_deref()
                    .map_or(Some(ExtractionMode::Text), ExtractionMode::parse)
                    .ok_or_else(|| "unknown candidate extraction mode".to_owned())?;
                Ok(CandidateInput::new(candidate.raw, span).with_extraction_mode(mode))
            })
            .collect::<Result<Vec<_>, String>>()
            .map_err(|error| JsValue::from_str(&error))?;

        self.inner
            .update_source_with_candidates(SourceInput::new(SourceId::new(id), content), inputs)
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

    /// Explains one candidate and returns a JavaScript object with parsed and semantic details.
    pub fn explain(&self, candidate: String) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.inner.explain_candidate(&candidate))
            .map_err(|error| JsValue::from_str(&error.to_string()))
    }

    /// Validates one candidate and returns a JavaScript object with diagnostics and alternatives.
    pub fn validate(&self, candidate: String) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(
            &self.inner.validate(utilitycss_compiler::ExplainRequest::new(&candidate)),
        )
        .map_err(|error| JsValue::from_str(&error.to_string()))
    }

    /// Returns the active capability manifest as a JSON string.
    pub fn capabilities(&self) -> String {
        self.inner.capability_manifest_json()
    }

    /// Transforms authored CSS and returns CSS plus structured diagnostics.
    #[wasm_bindgen(js_name = transformStylesheet)]
    pub fn transform_stylesheet(
        &mut self,
        id: String,
        content: String,
    ) -> Result<JsValue, JsValue> {
        let output =
            transform_stylesheet(&mut self.inner, StylesheetInput::new(SourceId::new(id), content));
        let diagnostics = output
            .diagnostics()
            .iter()
            .map(|diagnostic| WasmDiagnostic {
                severity: format!("{:?}", diagnostic.severity()).to_ascii_lowercase(),
                code: diagnostic.code().to_string(),
                message: diagnostic.message().to_owned(),
                source: diagnostic.source().map(ToString::to_string),
                start: diagnostic.span().map(|span| span.start()),
                end: diagnostic.span().map(|span| span.end()),
                help: diagnostic.help().map(str::to_owned),
                explanation: diagnostic.explanation().map(str::to_owned),
                suggestions: diagnostic
                    .suggestions()
                    .iter()
                    .map(|suggestion| suggestion.replacement.clone())
                    .collect(),
            })
            .collect();
        serde_wasm_bindgen::to_value(&WasmStylesheetResult {
            css: output.css().to_owned(),
            diagnostics,
        })
        .map_err(|error| JsValue::from_str(&error.to_string()))
    }
}
