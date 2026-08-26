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

test("normalizes module IDs and removes deleted source state", async () => {
  const removed = [];
  class FakeNativeCompiler {
    updateSource() {}

    removeSource(id) {
      removed.push(id);
      return true;
    }

    build() {
      return {
        css: "",
        diagnostics: [],
        stats: {
          sourcesScanned: 0,
          bytesScanned: 0,
          candidatesFound: 0,
          uniqueCandidates: 0,
          candidatesParsed: 0,
          cacheHits: 0,
          rulesGenerated: 0,
          rulesRemoved: 0
        }
      };
    }
  }

  const plugin = utilitycss({ native: FakeNativeCompiler });
  await plugin.handleHotUpdate({
    file: "/@fs/C:\\project\\App.tsx?vue&type=template",
    event: { type: "delete" },
    modules: [],
    read: async () => {
      throw new Error("deleted files must not be read");
    },
    server: {
      moduleGraph: {
        getModuleById: async () => undefined,
        invalidateModule: () => {}
      }
    }
  });

  assert.deepEqual(removed, ["C:/project/App.tsx"]);
});

test("removes deleted sources from Rollup watcher notifications", () => {
  const removed = [];
  class FakeNativeCompiler {
    updateSource() {}
    removeSource(id) {
      removed.push(id);
      return true;
    }
    build() {
      return {
        css: "",
        diagnostics: [],
        stats: {
          sourcesScanned: 0,
          bytesScanned: 0,
          candidatesFound: 0,
          uniqueCandidates: 0,
          candidatesParsed: 0,
          cacheHits: 0,
          rulesGenerated: 0,
          rulesRemoved: 0
        }
      };
    }
  }

  const plugin = utilitycss({ native: FakeNativeCompiler });
  plugin.watchChange("src/removed.html?direct", { event: "delete" });
  assert.deepEqual(removed, ["src/removed.html"]);
});

test("forwards compiler diagnostics to the Vite hook context", async () => {
  const warnings = [];
  class FakeNativeCompiler {
    updateSource() {}
    removeSource() {
      return false;
    }
    build() {
      return {
        css: "",
        diagnostics: [{
          severity: "warning",
          code: "fixture.warning",
          message: "fixture warning",
          source: "src/app.html",
          start: 4,
          end: 8,
          help: "fix the fixture"
        }],
        stats: {
          sourcesScanned: 1,
          bytesScanned: 1,
          candidatesFound: 1,
          uniqueCandidates: 1,
          candidatesParsed: 1,
          cacheHits: 0,
          rulesGenerated: 0,
          rulesRemoved: 0
        }
      };
    }
  }

  const plugin = utilitycss({ native: FakeNativeCompiler });
  await plugin.transform.call(
    { warn: (message) => warnings.push(message), error: () => { throw new Error("unexpected error"); } },
    "<div />",
    "src/app.html"
  );

  assert.deepEqual(warnings, [
    "src/app.html:4-8: fixture warning [fixture.warning]; fix the fixture"
  ]);
});
