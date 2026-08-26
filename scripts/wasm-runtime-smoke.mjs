import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const bindingsDirectory = process.env.UTILITYCSS_WASM_BINDINGS
  ? process.env.UTILITYCSS_WASM_BINDINGS
  : fileURLToPath(new URL("../target/wasm-bindgen", import.meta.url));
const { WasmCompiler } = await import(pathToFileURL(join(bindingsDirectory, "utilitycss_wasm.js")).href);
const compiler = new WasmCompiler(false);
compiler.update_source("src/app.html", '<div class="p-4"></div>');
const first = compiler.build();
if (!first.includes(".p-4{padding:1rem;}")) {
  throw new Error(`WASM compiler emitted unexpected initial CSS: ${first}`);
}
if (!compiler.remove_source("src/app.html")) {
  throw new Error("WASM compiler did not report the source removal");
}
const second = compiler.build();
if (second !== "") {
  throw new Error(`WASM compiler retained CSS after removal: ${second}`);
}
console.log("WASM runtime smoke passed");
