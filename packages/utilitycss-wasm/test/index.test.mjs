import assert from "node:assert/strict";
import test from "node:test";

import { createWasmCompiler } from "../dist/index.js";

test("forwards the WASM compiler surface", () => {
  class FakeCompiler {
    updateSource() {}
    updateSourceWithCandidates() {}
    removeSource() {
      return true;
    }
    build() {
      return ".flex{display:flex;}";
    }
    transformStylesheet() {
      return { css: ".button{display:flex;}", diagnostics: [] };
    }
  }

  const compiler = createWasmCompiler({ WasmCompiler: FakeCompiler });
  compiler.updateSource("src/app.html", "flex");
  compiler.updateSourceWithCandidates("src/app.tsx", "p-4", [
    { raw: "p-4", start: 0, end: 3, extractionMode: "ast" }
  ]);
  assert.equal(compiler.removeSource("src/app.html"), true);
  assert.equal(compiler.build(), ".flex{display:flex;}");
  assert.deepEqual(
    compiler.transformStylesheet("styles.css", ".button { @apply flex; }"),
    { css: ".button{display:flex;}", diagnostics: [] }
  );
});
