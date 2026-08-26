/** The generated WASM compiler constructor surface. */
export interface WasmCompilerConstructor {
  new (pretty: boolean): WasmCompiler;
}

/** The generated WASM compiler methods consumed by this wrapper. */
export interface WasmCompiler {
  updateSource(id: string, content: string): void;
  removeSource(id: string): boolean;
  build(): string;
  explain(candidate: string): Readonly<Record<string, unknown>>;
  validate(candidate: string): Readonly<Record<string, unknown>>;
  capabilities(): string;
  transformStylesheet(id: string, content: string): StylesheetResult;
}

/** A normalized stylesheet transformation result from WASM. */
export interface StylesheetResult {
  readonly css: string;
  readonly diagnostics: readonly Diagnostic[];
}

/** A diagnostic returned by the WASM stylesheet transformer. */
export interface Diagnostic {
  readonly severity?: "error" | "warning" | "note" | "help";
  readonly code: string;
  readonly message: string;
  readonly source?: string;
  readonly start?: number;
  readonly end?: number;
  readonly help?: string;
  readonly explanation?: string;
  readonly suggestions?: readonly string[];
}

/** A generated WASM module containing the compiler constructor. */
export interface WasmModule {
  readonly WasmCompiler: WasmCompilerConstructor;
}

/** Creates a compiler wrapper from an initialized wasm-bindgen module. */
export function createWasmCompiler(module: WasmModule, pretty = false): WasmCompiler {
  if (typeof module.WasmCompiler !== "function") {
    throw new Error("WASM module does not export WasmCompiler");
  }
  return new module.WasmCompiler(pretty);
}
