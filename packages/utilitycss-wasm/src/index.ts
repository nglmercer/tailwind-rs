/** The generated WASM compiler constructor surface. */
export interface WasmCompilerConstructor {
  new (pretty: boolean): WasmCompiler;
}

/** The generated WASM compiler methods consumed by this wrapper. */
export interface WasmCompiler {
  updateSource(id: string, content: string): void;
  removeSource(id: string): boolean;
  build(): string;
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
