import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCompiler,
  type BuildResult,
  type Compiler,
  type CompilerOptions,
  type Diagnostic,
  type StylesheetResult
} from "@utilitycss/node";
import type { BunPlugin } from "bun";

const DEFAULT_SPECIFIER = "utilitycss";
const VIRTUAL_NAMESPACE = "utilitycss";
const VIRTUAL_PATH = "generated.css";
const SOURCE_FILTER = /\.(?:html?|(?:m|c)?jsx?|(?:m|c)?tsx?|vue|svelte|astro)$/i;
const CSS_FILTER = /\.css$/i;

/** Options for the Bun bundler and fullstack adapter. */
export interface UtilityCssBunOptions extends CompilerOptions {
  /** The module specifier used by `<link rel="stylesheet" href="...">`. */
  readonly specifier?: string;
}

/**
 * Creates a Bun plugin that extracts the current build's source graph and
 * exposes the generated stylesheet as a virtual CSS module.
 *
 * The compiler is recreated for each Bun build cycle and rehydrated from the latest source
 * snapshot. Bun may omit unchanged modules during incremental rebuilds, so source contents are
 * retained independently of callback order.
 */
export function utilitycss(options: UtilityCssBunOptions = {}): BunPlugin {
  const specifier = options.specifier ?? DEFAULT_SPECIFIER;
  const specifierFilter = new RegExp(`^${escapeRegExp(specifier)}$`);
  let compiler: Compiler | undefined;
  const moduleSources = new Map<string, string>();
  const moduleDependencies = new Map<string, Set<string>>();

  const createBuildCompiler = (): void => {
    compiler?.dispose();
    compiler = createCompiler({ pretty: options.pretty, native: options.native });
    for (const [id, source] of moduleSources) {
      requireCompiler().updateSource(id, source, id);
    }
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

  const pruneSourceGraph = (entrypoints: readonly string[]): void => {
    const roots = entrypoints
      .map((entrypoint) => {
        try {
          return normalizeModuleId(Bun.resolveSync(entrypoint, process.cwd()));
        } catch {
          return normalizeModuleId(entrypoint);
        }
      })
      .filter((entrypoint) => moduleSources.has(entrypoint));
    const reachable = reachableModules(moduleSources, moduleDependencies, roots);
    for (const id of moduleSources.keys()) {
      if (!reachable.has(id)) {
        moduleSources.delete(id);
        moduleDependencies.delete(id);
        compiler?.removeSource(id);
      }
    }
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
        moduleSources.set(sourceId, source);
        moduleDependencies.set(sourceId, resolveDependencies(sourceId, source));
        requireCompiler().updateSource(sourceId, source, sourceId);

        // Returning undefined preserves Bun's native loader and parser for the
        // module. The adapter only observes source content for extraction.
        return undefined;
      });

      build.onLoad({ filter: CSS_FILTER, namespace: "file" }, async ({ path }) => {
        const sourceId = normalizeModuleId(path);
        const source = await Bun.file(path).text();
        const result: StylesheetResult = requireCompiler().transformStylesheet(sourceId, source, path);
        reportDiagnostics(result);
        return { contents: result.css, loader: "css" };
      });

      build.onEnd(() => {
        pruneSourceGraph(build.config.entrypoints);
      });

      build.onLoad({ filter: /^generated\.css$/, namespace: VIRTUAL_NAMESPACE }, async ({ defer }) => {
        await defer();
        pruneSourceGraph(build.config.entrypoints);
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

function reportDiagnostics(result: Pick<BuildResult | StylesheetResult, "diagnostics">): void {
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

function resolveDependencies(id: string, source: string): Set<string> {
  const dependencies = new Set<string>();
  const specifiers = [
    ...source.matchAll(/(?:import\s+(?:[^"'`]*?\s+from\s+|)|export\s+[^"'`]*?\s+from\s+|require\s*\(|import\s*\()\s*["']([^"']+)["']/g),
    ...source.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)
  ];
  for (const match of specifiers) {
    const specifier = match[1];
    if (!specifier.startsWith(".")) {
      continue;
    }
    try {
      dependencies.add(normalizeModuleId(Bun.resolveSync(specifier, dirname(id))));
    } catch {
      // Bun's resolver will report unresolved imports through its normal build diagnostics.
    }
  }
  return dependencies;
}

function reachableModules(
  sources: ReadonlyMap<string, string>,
  dependencies: ReadonlyMap<string, ReadonlySet<string>>,
  configuredRoots: readonly string[]
): Set<string> {
  const imported = new Set<string>();
  for (const dependencySet of dependencies.values()) {
    for (const dependency of dependencySet) {
      if (sources.has(dependency)) {
        imported.add(dependency);
      }
    }
  }
  const roots = configuredRoots.length > 0
    ? [...configuredRoots]
    : [...sources.keys()].filter((id) => !imported.has(id));
  if (roots.length === 0) {
    return new Set(sources.keys());
  }
  const reachable = new Set<string>();
  const pending = [...roots];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || reachable.has(current)) {
      continue;
    }
    reachable.add(current);
    for (const dependency of dependencies.get(current) ?? []) {
      if (sources.has(dependency)) {
        pending.push(dependency);
      }
    }
  }
  return reachable;
}
