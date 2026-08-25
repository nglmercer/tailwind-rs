import assert from "node:assert/strict";
import test from "node:test";

import { createCompiler } from "../dist/index.js";

test("forwards lifecycle calls and normalizes a native result", () => {
  const calls = [];
  class FakeNativeCompiler {
    updateSource(id, content, path) {
      calls.push(["updateSource", id, content, path]);
    }

    removeSource(id) {
      calls.push(["removeSource", id]);
      return true;
    }

    build() {
      return {
        css: ".flex{display:flex;}",
        diagnostics: [],
        stats: {
          sourcesScanned: 1,
          bytesScanned: 5,
          candidatesFound: 1,
          uniqueCandidates: 1,
          candidatesParsed: 1,
          cacheHits: 0,
          rulesGenerated: 1,
          rulesRemoved: 0
        }
      };
    }
  }

  const compiler = createCompiler({ native: FakeNativeCompiler });
  compiler.updateSource("src/app.html", "flex", "src/app.html");
  assert.equal(compiler.removeSource("src/old.html"), true);
  assert.equal(compiler.build().css, ".flex{display:flex;}");
  assert.deepEqual(calls, [
    ["updateSource", "src/app.html", "flex", "src/app.html"],
    ["removeSource", "src/old.html"]
  ]);
});
