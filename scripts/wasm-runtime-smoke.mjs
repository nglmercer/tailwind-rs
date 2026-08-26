import { WasmCompiler } from "../target/wasm-bindgen/utilitycss_wasm.js";
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
