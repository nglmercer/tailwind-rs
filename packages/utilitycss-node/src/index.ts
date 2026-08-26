import { createRequire } from "node:module";

/** A diagnostic returned by the Rust compiler. */
export interface Diagnostic {
  readonly severity?: "error" | "warning" | "note" | "help";
  readonly code: string;
  readonly message: string;
  readonly source?: string;
  readonly start?: number;
  readonly end?: number;
  readonly help?: string;
}

/** Work counters returned by a compiler build. */
export interface CompileStats {
  readonly sourcesScanned: number;
  readonly bytesScanned: number;
  readonly candidatesFound: number;
  readonly uniqueCandidates: number;
  readonly candidatesParsed: number;
  readonly cacheHits: number;
  readonly rulesGenerated: number;
  readonly rulesRemoved: number;
}

/** A normalized result from one compiler build. */
export interface BuildResult {
  readonly css: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly stats: CompileStats;
}

/** Result of transforming authored CSS through the native stylesheet layer. */
export interface StylesheetResult {
  readonly css: string;
  readonly diagnostics: readonly Diagnostic[];
}

/** The native compiler surface consumed by this adapter. */
export interface NativeCompiler {
  updateSource(id: string, content: string, path?: string, candidates?: readonly CandidateInput[]): void;
  extractCandidates?(content: string, path?: string): readonly CandidateInput[];
  removeSource(id: string): boolean;
  build(): unknown;
  transformStylesheet?(id: string, content: string, path?: string): unknown;
}

/** A statically extracted candidate accepted by the native update API. */
export interface CandidateInput {
  readonly raw: string;
  readonly start: number;
  readonly end: number;
}

/** A native compiler constructor, injectable for tests and alternate loaders. */
export type NativeCompilerFactory = new (pretty?: boolean) => NativeCompiler;

/** Options for creating a Node adapter. */
export interface CompilerOptions {
  readonly pretty?: boolean;
  readonly native?: NativeCompilerFactory;
}

/** A thin lifecycle adapter over the native Rust compiler. */
export class Compiler {
  private readonly native: NativeCompiler;
  private disposed = false;

  /** Creates an adapter around one native compiler instance. */
  public constructor(native: NativeCompiler) {
    this.native = native;
  }

  /** Inserts or replaces source content. */
  public updateSource(
    id: string,
    content: string,
    path?: string,
    candidates?: readonly CandidateInput[]
  ): void {
    this.assertActive();
    const extracted = candidates ?? this.native.extractCandidates?.(content, path);
    this.native.updateSource(id, content, path, extracted);
  }

  /** Removes source content and returns whether the source existed. */
  public removeSource(id: string): boolean {
    this.assertActive();
    return this.native.removeSource(id);
  }

  /** Builds CSS and normalizes the native result shape. */
  public build(): BuildResult {
    this.assertActive();
    return normalizeBuildResult(this.native.build());
  }

  /** Transforms authored CSS and normalizes native stylesheet diagnostics. */
  public transformStylesheet(id: string, content: string, path?: string): StylesheetResult {
    this.assertActive();
    if (!this.native.transformStylesheet) {
      throw new Error("native compiler does not expose stylesheet transformation");
    }
    return normalizeStylesheetResult(this.native.transformStylesheet(id, content, path));
  }

  /** Releases this adapter's native compiler handle. */
  public dispose(): void {
    this.disposed = true;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error("utilitycss compiler has been disposed");
    }
  }
}

/** Creates a Node adapter using the installed native binding or an injected factory. */
export function createCompiler(options: CompilerOptions = {}): Compiler {
  const factory = options.native ?? loadNativeFactory();
  return new Compiler(new factory(options.pretty ?? false));
}

function loadNativeFactory(): NativeCompilerFactory {
  const require = createRequire(import.meta.url);
  const moduleValue: unknown = require("@utilitycss/napi");
  if (!isRecord(moduleValue) || typeof moduleValue.Compiler !== "function") {
    throw new Error("@utilitycss/napi does not export a Compiler constructor");
  }
  return moduleValue.Compiler as NativeCompilerFactory;
}

function normalizeBuildResult(value: unknown): BuildResult {
  if (!isRecord(value) || typeof value.css !== "string" || !Array.isArray(value.diagnostics)) {
    throw new Error("native compiler returned an invalid build result");
  }
  const stats = normalizeStats(value.stats);
  const diagnostics = value.diagnostics.map(normalizeDiagnostic);
  return { css: value.css, diagnostics, stats };
}

function normalizeStylesheetResult(value: unknown): StylesheetResult {
  if (!isRecord(value) || typeof value.css !== "string" || !Array.isArray(value.diagnostics)) {
    throw new Error("native compiler returned an invalid stylesheet result");
  }
  return {
    css: value.css,
    diagnostics: value.diagnostics.map(normalizeDiagnostic)
  };
}

function normalizeDiagnostic(value: unknown): Diagnostic {
  if (!isRecord(value) || typeof value.code !== "string" || typeof value.message !== "string") {
    throw new Error("native compiler returned an invalid diagnostic");
  }
  return {
    severity: optionalSeverity(value.severity),
    code: value.code,
    message: value.message,
    source: optionalString(value.source),
    start: optionalNumber(value.start),
    end: optionalNumber(value.end),
    help: optionalString(value.help)
  };
}

function normalizeStats(value: unknown): CompileStats {
  if (!isRecord(value)) {
    throw new Error("native compiler returned invalid build stats");
  }
  return {
    sourcesScanned: requiredNumber(value.sourcesScanned),
    bytesScanned: requiredNumber(value.bytesScanned),
    candidatesFound: requiredNumber(value.candidatesFound),
    uniqueCandidates: requiredNumber(value.uniqueCandidates),
    candidatesParsed: requiredNumber(value.candidatesParsed),
    cacheHits: requiredNumber(value.cacheHits),
    rulesGenerated: requiredNumber(value.rulesGenerated),
    rulesRemoved: requiredNumber(value.rulesRemoved)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requiredNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("native compiler returned a non-numeric stat");
  }
  return value;
}

function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null ? undefined : requiredNumber(value);
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error("native compiler returned a non-string diagnostic field");
  }
  return value;
}

function optionalSeverity(value: unknown): Diagnostic["severity"] {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (value === "error" || value === "warning" || value === "note" || value === "help") {
    return value;
  }
  throw new Error("native compiler returned an invalid diagnostic severity");
}
