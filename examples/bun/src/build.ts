import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCompiler, type BuildResult } from "../../../packages/utilitycss-node/dist/index.js";
import { Compiler as NativeCompiler } from "../../../packages/utilitycss-napi/index.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(projectRoot, "src", "index.html");
const appPath = join(projectRoot, "src", "app.js");
const cssPath = join(projectRoot, "public", "utilitycss.css");

const compilerSources = [
  { id: "examples/bun/src/index.html", path: sourcePath },
  { id: "examples/bun/src/app.js", path: appPath }
];

/** Compiles the example page and writes its CSS asset. */
export async function buildCss(): Promise<BuildResult> {
  const compiler = createCompiler({ pretty: true, native: NativeCompiler });
  for (const sourceFile of compilerSources) {
    const source = await Bun.file(sourceFile.path).text();
    compiler.updateSource(sourceFile.id, source, sourceFile.path);
  }
  const result = compiler.build();
  compiler.dispose();

  if (result.diagnostics.length > 0) {
    const details = result.diagnostics
      .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
      .join("\n");
    throw new Error(`utilitycss compilation failed:\n${details}`);
  }

  await mkdir(dirname(cssPath), { recursive: true });
  await Bun.write(cssPath, result.css);
  return result;
}

if (import.meta.main) {
  const result = await buildCss();
  console.log(`Generated ${result.stats.rulesGenerated} CSS rules at ${cssPath}`);
}
