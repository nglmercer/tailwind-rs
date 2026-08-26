import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createCompiler, type BuildResult, type Compiler, type CompilerOptions, type Diagnostic } from "@utilitycss/node";
import type { BunPlugin } from "bun";

const DEFAULT_SPECIFIER = "utilitycss";
const VIRTUAL_NAMESPACE = "utilitycss";
const VIRTUAL_PATH = "generated.css";
const SOURCE_FILTER = /\.(?:html?|(?:m|c)?jsx?|(?:m|c)?tsx?|vue|svelte|astro)$/i;

/** Options for the Bun bundler and fullstack adapter. */
export interface UtilityCssBunOptions extends CompilerOptions {
  /** The module specifier used by `<link rel="stylesheet" href="...">`. */
  readonly specifier?: string;
}

/**
 * Creates a Bun plugin that extracts the current build's source graph and
 * exposes the generated stylesheet as a virtual CSS module.
 *
 * A compiler is intentionally created afresh for every Bun build cycle. This
 * makes deleted modules disappear without requiring a second filesystem
 * watcher or adapter-owned stale-source bookkeeping.
 */
export function utilitycss(options: UtilityCssBunOptions = {}): BunPlugin {
  const specifier = options.specifier ?? DEFAULT_SPECIFIER;
  const specifierFilter = new RegExp(`^${escapeRegExp(specifier)}$`);
  let compiler: Compiler | undefined;

  const createBuildCompiler = (): void => {
    compiler?.dispose();
    compiler = createCompiler({ pretty: options.pretty, native: options.native });
  };

  const requireCompiler = (): Compiler => {
    if (!compiler) {
      createBuildCompiler();
    }
    const current = compiler;
    if (!current) {
      throw new Error("utilitycss Bun plugin failed to create a compiler");
    }
    return current;
  };

  return {
    name: "utilitycss-bun",
    setup(build): void {
      build.onStart(createBuildCompiler);

      build.onResolve({ filter: specifierFilter }, () => ({
        namespace: VIRTUAL_NAMESPACE,
        path: VIRTUAL_PATH
      }));

      build.onLoad({ filter: SOURCE_FILTER, namespace: "file" }, async ({ path }) => {
        const sourceId = normalizeModuleId(path);
        const source = await Bun.file(path).text();
        requireCompiler().updateSource(sourceId, source, sourceId);

        // Returning undefined preserves Bun's native loader and parser for the
        // module. The adapter only observes source content for extraction.
        return undefined;
      });

      build.onLoad({ filter: /^generated\.css$/, namespace: VIRTUAL_NAMESPACE }, async ({ defer }) => {
        await defer();
        const result = requireCompiler().build();
        reportDiagnostics(result);
        return { contents: result.css, loader: "css" };
      });
    }
  };
}

/** The zero-options plugin used by Bun's `bunfig.toml` loader. */
const defaultPlugin = utilitycss();

export default defaultPlugin;

function reportDiagnostics(result: BuildResult): void {
  const errors: string[] = [];
  const nonErrors: string[] = [];

  for (const diagnostic of result.diagnostics) {
    const formatted = formatDiagnostic(diagnostic);
    if (diagnostic.severity === "error" || diagnostic.severity === undefined) {
      errors.push(formatted);
    } else {
      nonErrors.push(formatted);
    }
  }

  for (const diagnostic of nonErrors) {
    console.warn(diagnostic);
  }

  if (errors.length > 0) {
    throw new Error(`utilitycss compilation failed:\n${errors.join("\n")}`);
  }
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  const source = diagnostic.source ?? "<utilitycss>";
  const span = diagnostic.start === undefined
    ? ""
    : `:${diagnostic.start}-${diagnostic.end ?? diagnostic.start}`;
  const help = diagnostic.help ? `\n  help: ${diagnostic.help}` : "";
  return `${source}${span}: ${diagnostic.message} [${diagnostic.code}]${help}`;
}

function normalizeModuleId(id: string): string {
  let normalized = id.replaceAll("\\", "/");
  const queryStart = normalized.search(/[?#]/);
  if (queryStart !== -1) {
    normalized = normalized.slice(0, queryStart);
  }
  if (normalized.startsWith("file://")) {
    try {
      normalized = fileURLToPath(normalized).replaceAll("\\", "/");
    } catch {
      // Preserve a normalized non-file URL when Bun supplies a virtual ID.
    }
  }
  if (normalized.startsWith("/@fs/")) {
    normalized = normalized.slice(5);
  }
  if (!normalized.startsWith("\0") && !normalized.startsWith("bun:")) {
    try {
      normalized = realpathSync(normalized).replaceAll("\\", "/");
    } catch {
      // Bun may expose a virtual or just-created module before realpath works.
    }
  }
  return normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
