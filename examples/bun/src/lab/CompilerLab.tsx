import { useEffect, useState } from "preact/hooks";

import type { BrowserTarget } from "../../../../packages/utilitycss-node/src/index.ts";
import { Button } from "../components/Button.tsx";
import type { LabCompileResult, LabMode } from "./compile.ts";

interface LabPreset {
  readonly name: string;
  readonly mode: LabMode;
  readonly browserTarget: BrowserTarget;
  readonly source: string;
  readonly note: string;
}

const PRESETS: readonly LabPreset[] = [
  {
    name: "Responsive",
    mode: "markup",
    browserTarget: "modern",
    source: `<div class="mx-auto grid max-w-[24rem] gap-6 md:grid-cols-2 2xl:grid-cols-4">\n  <button class="bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">Continue</button>\n</div>`,
    note: "Custom xs/2xl breakpoints from utilitycss.config.css sort by min-width value."
  },
  {
    name: "Arbitrary values",
    mode: "markup",
    browserTarget: "modern",
    source: `<div class="w-[70%] max-w-[24rem]">\n  <p class="text-sm text-gray-600">Bracket values compile to exact declarations.</p>\n</div>`,
    note: "Arbitrary values bypass the scale and emit the bracketed declaration."
  },
  {
    name: "Variants",
    mode: "markup",
    browserTarget: "modern",
    source: `<button class="bg-gray-100 px-4 py-2 hover:bg-gray-200 focus:outline-none xs:tracking-wide">Filter</button>`,
    note: "State and responsive variants stack on one candidate."
  },
  {
    name: "@apply recipe",
    mode: "stylesheet",
    browserTarget: "modern",
    source: `.lab-card {\n  @apply rounded-lg border border-gray-200 bg-white p-6 shadow-sm;\n}`,
    note: "Stylesheet mode lowers @apply recipes; unknown utilities error here."
  },
  {
    name: "Compat warning",
    mode: "markup",
    browserTarget: "safari-15",
    source: `<div class="content-auto flex">\n  <p>Capped by the active browser target.</p>\n</div>`,
    note: "safari-15 warns on content-visibility while still emitting the rule."
  },
  {
    name: "Typo recovery",
    mode: "markup",
    browserTarget: "modern",
    source: `<div class="flx items-center">Typo intentional.</div>`,
    note: "Validation reports list the closest known utilities."
  }
];

const BROWSER_TARGETS: readonly BrowserTarget[] = ["modern", "evergreen", "safari-15", "legacy"];

async function postCompile(source: string, browserTarget: BrowserTarget, mode: LabMode): Promise<LabCompileResult> {
  const response = await fetch("/api/compile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source, browserTarget, mode })
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body ? String((body as Record<string, unknown>).error) : `compile failed with status ${response.status}`;
    throw new Error(message);
  }
  return body as LabCompileResult;
}

/** Interactive Compiler Lab: live source, generated CSS, diagnostics, and validation. */
export function CompilerLabPage() {
  const [presetName, setPresetName] = useState(PRESETS[0].name);
  const [source, setSource] = useState(PRESETS[0].source);
  const [mode, setMode] = useState<LabMode>(PRESETS[0].mode);
  const [browserTarget, setBrowserTarget] = useState<BrowserTarget>(PRESETS[0].browserTarget);
  const [result, setResult] = useState<LabCompileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);

  const compile = async (next?: Partial<Pick<LabPreset, "source" | "mode" | "browserTarget">>): Promise<void> => {
    const request = { source, mode, browserTarget, ...next };
    setCompiling(true);
    setError(null);
    try {
      setResult(await postCompile(request.source, request.browserTarget, request.mode));
    } catch (failure) {
      setResult(null);
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setCompiling(false);
    }
  };

  useEffect(() => {
    void compile();
    // Compile once on mount; later edits compile on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (preset: LabPreset): void => {
    setPresetName(preset.name);
    setSource(preset.source);
    setMode(preset.mode);
    setBrowserTarget(preset.browserTarget);
    void compile(preset);
  };

  const activePreset = PRESETS.find(preset => preset.name === presetName);

  return (
    <div className="lab-page">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lab presets">
        {PRESETS.map(preset => (
          <Button
            key={preset.name}
            type="button"
            variant={preset.name === presetName ? "primary" : "secondary"}
            size="sm"
            onClick={() => applyPreset(preset)}
          >
            {preset.name}
          </Button>
        ))}
      </div>
      {activePreset ? <p className="form-help">{activePreset.note}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="lab-source">Source</label>
          <textarea
            id="lab-source"
            className="form-input font-mono text-xs"
            rows={14}
            spellcheck={false}
            value={source}
            onInput={event => setSource((event.target as HTMLTextAreaElement).value)}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="form-label" htmlFor="lab-mode">
              Mode
              <select
                id="lab-mode"
                className="form-select ml-2"
                value={mode}
                onChange={event => setMode((event.target as HTMLSelectElement).value as LabMode)}
              >
                <option value="markup">Markup</option>
                <option value="stylesheet">Stylesheet</option>
              </select>
            </label>
            <label className="form-label" htmlFor="lab-target">
              Browser target
              <select
                id="lab-target"
                className="form-select ml-2"
                value={browserTarget}
                onChange={event => setBrowserTarget((event.target as HTMLSelectElement).value as BrowserTarget)}
              >
                {BROWSER_TARGETS.map(target => (
                  <option key={target} value={target}>{target}</option>
                ))}
              </select>
            </label>
            <Button type="button" variant="primary" disabled={compiling} onClick={() => void compile()}>
              {compiling ? "Compiling…" : "Compile"}
            </Button>
          </div>
        </div>

        <div>
          <span className="form-label" id="lab-output-label">Generated CSS</span>
          <pre className="demo-source" aria-labelledby="lab-output-label" aria-live="polite">
            <code>{result ? result.css || "(no rules generated)" : error ?? "Compiling…"}</code>
          </pre>
          {result?.stats ? (
            <p className="form-help">
              {result.stats.candidatesFound} candidates · {result.stats.rulesGenerated} rules · {result.stats.sourcesScanned} source
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger mt-4" role="alert">
          <div className="alert-content"><strong>Compile request failed.</strong> {error}</div>
        </div>
      ) : null}

      {result && result.diagnostics.length > 0 ? (
        <div className="mt-4">
          <span className="eyebrow">Diagnostics</span>
          <div className="mt-2 grid gap-2">
            {result.diagnostics.map((diagnostic, index) => (
              <div key={`${diagnostic.code}-${index}`} className={diagnostic.severity === "error" ? "alert alert-danger" : "alert alert-warning"} role={diagnostic.severity === "error" ? "alert" : "status"}>
                <div className="alert-content">
                  <strong>{diagnostic.code}</strong> · {diagnostic.message}
                  {diagnostic.help ? <span className="form-help"> {diagnostic.help}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result && result.reports.length > 0 ? (
        <div className="mt-4">
          <span className="eyebrow">Candidates ({result.reports.length})</span>
          <div className="mt-2 grid gap-2">
            {result.reports.map(report => {
              const modes = result.candidates.filter(candidate => candidate.raw === report.candidate).map(candidate => candidate.mode);
              const mode = modes.length > 0 ? [...new Set(modes)].join(", ") : "text";
              return (
                <div key={report.candidate} className="component-card flex flex-wrap items-center gap-2 p-3">
                  <code className="font-mono text-xs">{report.candidate}</code>
                  <span className={report.valid ? "badge badge-success" : "badge badge-danger"}>{report.valid ? "valid" : report.status}</span>
                  <span className="badge badge-neutral">extracted: {mode}</span>
                  {!report.valid && report.alternatives.length > 0 ? (
                    <span className="form-help">Did you mean {report.alternatives.slice(0, 3).join(", ")}?</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
