import { createCompiler, type Compiler, type CompilerOptions } from "@utilitycss/node";

/** Minimal Vite module shape needed for virtual CSS invalidation. */
export interface ViteModule {
  readonly id: string;
}

/** Minimal Vite module graph shape consumed by this adapter. */
export interface ViteModuleGraph {
  getModuleById(id: string): Promise<ViteModule | undefined>;
  invalidateModule(module: ViteModule): void;
}

/** Minimal HMR context shape used by the adapter. */
export interface ViteHotUpdateContext {
  readonly file: string;
  readonly modules: readonly ViteModule[];
  readonly read: () => Promise<string>;
  readonly server: { readonly moduleGraph: ViteModuleGraph };
}

/** The subset of the Vite plugin contract implemented here. */
export interface UtilityCssVitePlugin {
  readonly name: "utilitycss";
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
  transform(code: string, id: string): Promise<null>;
  handleHotUpdate(context: ViteHotUpdateContext): Promise<readonly ViteModule[]>;
}

/** Options for the Vite adapter. */
export interface ViteOptions extends CompilerOptions {
  readonly virtualModuleId?: string;
  readonly include?: readonly RegExp[];
}

/** Creates a Vite lifecycle adapter around one persistent compiler instance. */
export function utilitycss(options: ViteOptions = {}): UtilityCssVitePlugin {
  const compiler: Compiler = createCompiler(options);
  const virtualModuleId = options.virtualModuleId ?? "virtual:utilitycss.css";
  const resolvedVirtualId = `\0${virtualModuleId}`;
  const include = options.include ?? [/\.(?:html|jsx?|tsx?|vue|svelte)$/];

  return {
    name: "utilitycss",
    resolveId(id: string): string | undefined {
      return id === virtualModuleId ? resolvedVirtualId : undefined;
    },
    load(id: string): string | undefined {
      return id === resolvedVirtualId ? compiler.build().css : undefined;
    },
    async transform(code: string, id: string): Promise<null> {
      if (include.some((pattern) => pattern.test(id))) {
        compiler.updateSource(id, code, id);
      }
      return null;
    },
    async handleHotUpdate(context: ViteHotUpdateContext): Promise<readonly ViteModule[]> {
      if (include.some((pattern) => pattern.test(context.file))) {
        compiler.updateSource(context.file, await context.read(), context.file);
        const virtualModule = await context.server.moduleGraph.getModuleById(resolvedVirtualId);
        if (virtualModule) {
          context.server.moduleGraph.invalidateModule(virtualModule);
        }
      }
      return context.modules;
    }
  };
}
