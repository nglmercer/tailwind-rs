import { buildProduction } from "./production-build.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const result = await buildProduction({ write: false });
assert(result.success, `Bun production build failed: ${result.logs.map(log => log.message).join("\n")}`);

const cssOutputs = await Promise.all(
  result.outputs
    .filter(output => output.path.endsWith(".css"))
    .map(async output => ({ path: output.path, contents: await output.text() }))
);
const css = cssOutputs.map(output => output.contents).join("\n");
assert(css.length > 0, "Bun production build did not emit a CSS asset");

const expectedOutput = [
  ".button-primary",
  ".button-danger",
  ".component-card",
  ".form-input",
  ".badge-success",
  ".bg-brand-600",
  ".hover\\:bg-gray-100:hover",
  ".md\\:grid-cols-3",
  ".aspect-video",
  ".border-gray-200",
  ".shadow-lg",
  ".sr-only",
  "@media"
];
const missing = expectedOutput.filter(fragment => !css.includes(fragment));
assert(missing.length === 0, `utilitycss output is missing: ${missing.join(", ")}`);
assert(css.includes("background-color:#4f46e5"), "CSS-first brand token was not resolved");
assert(css.includes("border-radius"), "common radius utilities were not emitted");
assert(css.includes("box-shadow"), "common shadow utilities were not emitted");
assert(
  css.includes("--spacing:.25rem") || css.includes("--spacing:0.25rem"),
  "demo CSS does not define the spacing scale used by numeric utilities"
);

const outputKinds = result.outputs.map(output => output.path.split(".").pop()).filter(Boolean);
assert(outputKinds.includes("html"), "Bun production build did not emit the HTML entry asset");
assert(outputKinds.includes("js"), "Bun production build did not emit the Preact JavaScript asset");

console.log("Bun + Preact component demo verification passed.");
console.log(`Generated stylesheet asset (${css.length} bytes) from the Bun module graph.`);
console.log(`Production assets: ${outputKinds.join(", ")}.`);
