import assert from "node:assert/strict";
import test from "node:test";

import { createWasmCompiler } from "../dist/index.js";

test("forwards the WASM compiler surface", () => {
  class FakeCompiler {
    updateSource() {}
    removeSource() {
      return true;
    }
    build() {
      return ".flex{display:flex;}";
    }
  }

  const compiler = createWasmCompiler({ WasmCompiler: FakeCompiler });
  compiler.updateSource("src/app.html", "flex");
  assert.equal(compiler.removeSource("src/app.html"), true);
  assert.equal(compiler.build(), ".flex{display:flex;}");
});
