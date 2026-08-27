import { buildProduction } from "./production-build.ts";
import { catalog, categoryDefinitions } from "./catalog.ts";
import { formatHashRoute, parseHashRoute } from "./hooks/useHashRoute.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const categoryValues = new Set(categoryDefinitions.map(category => category.value));
const slugs = catalog.map(item => item.slug);
assert(catalog.length >= 10, "catalog should contain at least ten focused component pages");
assert(new Set(slugs).size === slugs.length, "catalog contains duplicate component slugs");
for (const item of catalog) {
  assert(categoryValues.has(item.category), `catalog item ${item.slug} references an unknown category`);
  assert(item.description.trim().length > 0, `catalog item ${item.slug} is missing a description`);
  assert(typeof item.demo === "function", `catalog item ${item.slug} has no reachable demo`);
  const parsed = parseHashRoute(formatHashRoute(item.category, item.slug));
  assert(parsed.category === item.category && parsed.slug === item.slug, `catalog route failed to round-trip for ${item.slug}`);
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
  ".button-success",
  ".button-group",
  ".component-card",
  ".form-input",
  ".badge-success",
  ".badge-brand",
  ".alert",
  ".banner",
  ".pagination-link",
  ".sidebar-link",
  ".progress-bar",
  ".spinner",
  ".timeline",
  ".dropdown-menu",
  ".popover",
  ".tooltip",
  ".carousel-dot",
  ".drawer-panel",
  ".avatar-stack",
  ".tabs",
  ".tab",
  ".tabs-box",
  ".bg-brand-600",
  ".bg-blue-600",
  ".bg-green-600",
  ".hover\\:bg-gray-100:hover",
  ".md\\:grid-cols-3",
  ".aspect-video",
  ".border-gray-200",
  ".sr-only",
  "@media"
];
const missing = expectedOutput.filter(fragment => !css.includes(fragment));
assert(missing.length === 0, `utilitycss output is missing: ${missing.join(", ")}`);
assert(css.includes("background-color:#4f46e5"), "CSS-first brand token was not resolved");
assert(css.includes("border-radius"), "common radius utilities were not emitted");
assert(css.includes("box-shadow"), "common shadow utilities were not emitted");
assert(css.includes("clip:rect(0,0,0,0)"), "screen-reader-only labels are not visually clipped");
assert(css.includes(".button{") && css.includes("border:0"), "button recipe did not reset the native border");
assert(css.includes(".toggle{") && css.includes("padding:0"), "toggle recipe did not reset native button padding");
assert(
  css.includes("--spacing:.25rem") || css.includes("--spacing:0.25rem"),
  "demo CSS does not define the spacing scale used by numeric utilities"
);

const outputKinds = result.outputs.map(output => output.path.split(".").pop()).filter(Boolean);
assert(outputKinds.includes("html"), "Bun production build did not emit the HTML entry asset");
assert(outputKinds.includes("js"), "Bun production build did not emit the Preact JavaScript asset");

console.log(`Bun + Preact component gallery verification passed (${catalog.length} catalog entries).`);
console.log(`Generated stylesheet asset (${css.length} bytes) from the Bun module graph.`);
console.log(`Production assets: ${outputKinds.join(", ")}.`);
