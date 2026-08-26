import { resolve } from "node:path";
import { utilitycss } from "../../../packages/utilitycss-bun/src/index.ts";

const projectRoot = resolve(import.meta.dir, "..");
const outputDirectory = resolve(projectRoot, "dist");

export interface ProductionBuildOptions {
  readonly write?: boolean;
}

/** Builds the fullstack example with Bun's bundler and the utilitycss plugin. */
export async function buildProduction(options: ProductionBuildOptions = {}) {
  const buildOptions = {
    entrypoints: [resolve(projectRoot, "src", "server.ts")],
    outdir: outputDirectory,
    target: "bun",
    minify: true,
    plugins: [utilitycss({ pretty: false })],
    write: options.write ?? true
  } as Bun.BuildConfig & { write?: boolean };

  return Bun.build(buildOptions);
}

if (import.meta.main) {
  const result = await buildProduction();
  if (!result.success) {
    throw new Error(`Bun production build failed:\n${result.logs.map((log) => log.message).join("\n")}`);
  }

  const cssOutputs = await Promise.all(
    result.outputs.filter((output) => output.path.endsWith(".css")).map((output) => output.text())
  );
  const css = cssOutputs.join("\n");
  if (!css.includes(".p-4") || !css.includes(".flex")) {
    throw new Error("Bun production build did not include generated utilitycss CSS");
  }
  console.log(`Bun production build passed with ${result.outputs.length} output assets.`);
}
