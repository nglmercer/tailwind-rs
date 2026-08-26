import assert from "node:assert/strict";
import test from "node:test";

let NativeCompiler;
try {
  ({ Compiler: NativeCompiler } = await import("@utilitycss/napi"));
} catch {
  NativeCompiler = undefined;
}

test("native adapter uses SWC extraction for TSX", { skip: !NativeCompiler }, async () => {
  const { createCompiler } = await import("../dist/index.js");
  const compiler = createCompiler({ native: NativeCompiler });

  compiler.updateSource(
    "src/Button.tsx",
    'export const Button = () => <button className={clsx("flex", active && "p-4")}/>;',
    "src/Button.tsx"
  );

  const result = compiler.build();
  assert.match(result.css, /\.flex\{display:flex;\}/);
  assert.match(result.css, /\.p-4\{padding:1rem;\}/);
  assert.equal(result.diagnostics.length, 0);
});

test("native adapter transforms authored @apply CSS", { skip: !NativeCompiler }, async () => {
  const { createCompiler } = await import("../dist/index.js");
  const compiler = createCompiler({ native: NativeCompiler });
  const result = compiler.transformStylesheet(
    "src/app.css",
    ".button { @apply flex p-4 hover:bg-red-500 md:p-8; }",
    "src/app.css"
  );

  assert.match(result.css, /\.button\{display:flex;padding:1rem;\}/);
  assert.match(result.css, /\.button:hover\{background-color:#ef4444;\}/);
  assert.match(result.css, /@media \(min-width: 768px\)\{\.button\{padding:2rem;\}\}/);
  assert.equal(result.diagnostics.length, 0);
});

test("requests host extraction when candidates are not supplied", () => {
  const calls = [];
  class ExtractingCompiler {
    extractCandidates(content, path) {
      assert.equal(path, "src/App.tsx");
      assert.match(content, /className/);
      return [{ raw: "flex", start: 24, end: 28 }];
    }

    updateSource(...args) {
      calls.push(args);
    }

    removeSource() {
      return false;
    }

    build() {
      return {
        css: "",
        diagnostics: [],
        stats: {
          sourcesScanned: 1,
          bytesScanned: 0,
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

  // Importing the adapter here keeps this contract test independent of an installed native binary.
  return import("../dist/index.js").then(({ createCompiler }) => {
    const compiler = createCompiler({ native: ExtractingCompiler });
    compiler.updateSource("src/App.tsx", '<div className="flex" />', "src/App.tsx");
    assert.deepEqual(calls[0][3], [{ raw: "flex", start: 24, end: 28 }]);
  });
});
