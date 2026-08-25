import assert from "node:assert/strict";
import test from "node:test";

import { utilitycss } from "../dist/index.js";

test("keeps one compiler across transforms and invalidates the virtual module", async () => {
  const updates = [];
  let invalidated = false;
  class FakeNativeCompiler {
    updateSource(id, content, path) {
      updates.push([id, content, path]);
    }

    removeSource() {
      return false;
    }

    build() {
      return {
        css: ".p-4{padding:1rem;}",
        diagnostics: [],
        stats: {
          sourcesScanned: 0,
          bytesScanned: 0,
          candidatesFound: 0,
          uniqueCandidates: 1,
          candidatesParsed: 0,
          cacheHits: 1,
          rulesGenerated: 1,
          rulesRemoved: 0
        }
      };
    }
  }

  const plugin = utilitycss({ native: FakeNativeCompiler });
  await plugin.transform("<div class=\"p-4\" />", "src/app.tsx");
  const modules = [{ id: "virtual" }];
  const returned = await plugin.handleHotUpdate({
    file: "src/app.tsx",
    modules,
    read: async () => "<div class=\"p-4\" />",
    server: {
      moduleGraph: {
        getModuleById: async () => ({ id: "\u0000virtual:utilitycss.css" }),
        invalidateModule: () => {
          invalidated = true;
        }
      }
    }
  });

  assert.deepEqual(returned, modules);
  assert.equal(plugin.load("\u0000virtual:utilitycss.css"), ".p-4{padding:1rem;}");
  assert.equal(updates.length, 2);
  assert.equal(invalidated, true);
});
