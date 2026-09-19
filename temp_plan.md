# Ordered Implementation Plan (synthesized)

Synthesized from researcher digests: prior result 9, 3, 2, 5, 4, 1, 8, 6, 10, 7.
Unresolved carried: none (`[]`). Notes carried: none (`[]`).
Omitted scope: prior result 11 and prior result 12 had no digest entries in the synthesis input; CI below is carried from the previous `temp_plan.md`, not from a researcher digest.

Order: core correctness -> CLI/Vite/Bun/WASM adapters -> release tooling -> CI -> consistency -> demo last.

Per-item convention: **Files / Smallest fix / Tests to add / Gate**. Evidence refs are researcher `CONFIRMED` / `ALREADY-OK` lines.

---

## Phase 1 — Core correctness

### 1.1 CSS identifier escaping (`escape_class_selector`)

**Files:**
- `crates/utilitycss-utilities/src/lib.rs` (escaper + tests)
- `crates/utilitycss-syntax/src/lib.rs` (candidate passthrough)
- `crates/utilitycss-compiler/tests/fixtures/variants.json` (fixtures)
- `crates/utilitycss-variants/src/lib.rs` (selector concat, no change expected)

**Smallest fix:**
- Rewrite `escape_class_selector` to CSSOM "serialize an identifier" rules, index-aware:
  - leading `[0-9]` -> hex escape (`\32 ` for `2` in `2xl:p-4`), not raw push;
  - `-` + `[0-9]` start and lone `-` cases per CSSOM, not always-raw `-`;
  - NULL -> U+FFFD, not `\0 ` via generic `is_ascii_control`;
  - keep existing punctuation escaping (`:` etc.) unchanged.
- Do not change callers except to benefit from fixed escaper; do not add re-escaping in `apply_selector`.

**Tests to add:**
- Unit: `2xl:p-4`, `-2col`, lone `-`, NULL/control, non-ASCII, plus existing `md:hover`.
- Fixture: leading-digit selector in `variants.json` / compiler conformance.

**Gate:**
- `cargo test -p utilitycss-utilities`
- `cargo test -p utilitycss-compiler --test conformance`

**Evidence refs:**
- `crates/utilitycss-utilities/src/lib.rs:3274 CONFIRMED — fn escape_class_selector exists; for character in candidate.chars() has no index`
- `crates/utilitycss-utilities/src/lib.rs:3277 CONFIRMED — if is_alphanumeric() pushes leading 2 raw; misses CSSOM first-[0-9] hex rule`
- `crates/utilitycss-utilities/src/lib.rs:3279 CONFIRMED — NULL hits is_ascii_control emitting \\0 not U+FFFD per CSSOM`
- `crates/utilitycss-utilities/src/lib.rs:3277 CONFIRMED — - always pushed raw; no -digit/lone - rules from CSSOM`
- `crates/utilitycss-utilities/src/lib.rs:2096 CONFIRMED — caller escape_class_selector(candidate.raw()); same at 2242,2260,2276,2304,2547`
- `crates/utilitycss-syntax/src/lib.rs:618 CONFIRMED — CandidateAst{raw:candidate} preserves 2xl:p-4 verbatim to escaper`
- `crates/utilitycss-utilities/src/lib.rs:3429 CONFIRMED — sole test escapes_css_punctuation only asserts md:hover case`
- `crates/utilitycss-utilities/src/lib.rs:3290 CONFIRMED — tests mod 3290-3587 inspected; no 2xl/control/non-ASCII escape test`
- `crates/utilitycss-compiler/tests/fixtures/variants.json:8 CONFIRMED — fixtures cover hover/md only; no leading-digit selector`
- `crates/utilitycss-variants/src/lib.rs:710 ALREADY-OK — safe_selector only validates; apply_selector concatenates, no re-escape`

### 1.2 Responsive breakpoint ordering

**Files:**
- `crates/utilitycss-variants/src/lib.rs` (`breakpoint_order`, `order()`)
- `crates/utilitycss-theme/src/lib.rs` (breakpoint map + defaults)
- `crates/utilitycss-compiler/src/lib.rs` (emission sort key)
- `crates/utilitycss-css-ir/src/lib.rs` (`compare_rules`)

**Smallest fix:**
- Replace `_ => 240` catch-all with deterministic value-derived rank: parse configured breakpoint values (`px`/`rem`/`em`, bare number) to a comparable width; keep `sm/md/lg/xl` compatible; custom/`2xl` ordered by value, name as final tie-break.
- Store or compute order rank alongside `BTreeMap<String,String>` (do not rely on name order or `stable_hash(raw)` tie-break).
- Keep `OrderKey` shape; change only rank inputs so `compare_rules` orders overlapping custom breakpoints correctly.

**Tests to add:**
- Multiple custom breakpoints (`2xl` + e.g. `3xl`/`xs`) with overlapping rules assert emitted media-query order follows min-width, not hash/name.
- Regression: default `sm/md/lg/xl` order unchanged.

**Gate:**
- `cargo test -p utilitycss-variants`
- `cargo test -p utilitycss-compiler`
- `cargo test -p utilitycss-theme`

**Evidence refs:**
- `crates/utilitycss-variants/src/lib.rs:756 CONFIRMED — fn breakpoint_order has _ => 240 for every non-sm/md/lg/xl`
- `crates/utilitycss-variants/src/lib.rs:408 CONFIRMED — order() falls back to breakpoint_order(name,theme) for theme breakpoints`
- `crates/utilitycss-theme/src/lib.rs:15 CONFIRMED — breakpoints: BTreeMap<String,String> keeps name order, no value/order rank`
- `crates/utilitycss-theme/src/lib.rs:356 CONFIRMED — defaults only sm/md/lg/xl; 2xl/custom always hit _=>240`
- `crates/utilitycss-compiler/src/lib.rs:1632 CONFIRMED — variant_order→OrderKey::new(0,variant_order,...) drives emission sort`
- `crates/utilitycss-css-ir/src/lib.rs:588 CONFIRMED — compare_rules sorts by OrderKey then rendered-string fallback`
- `crates/utilitycss-compiler/src/lib.rs:1621 CONFIRMED — tie-breaker is stable_hash(raw), not min-width value`
- `crates/utilitycss-variants/src/lib.rs:787 CONFIRMED — test applies_pseudo... uses single md:hover only`
- `crates/utilitycss-variants/src/lib.rs:855 CONFIRMED — test rejects_unsafe... uses single evil breakpoint only`
- `crates/utilitycss-compiler/src/lib.rs:2014 CONFIRMED — test compiles_deduplicated... uses single md:grid only`

### 1.3 Browser compatibility data (`safari-15` + tracked features)

**Files:**
- `crates/utilitycss-css-ir/src/lib.rs` (target feature gates)
- `crates/utilitycss-utilities/src/lib.rs` (emitted declarations)
- `docs/COMPATIBILITY.md`, `docs/CONFIGURATION.md`
- BCD sources: `content-visibility.json`, `backdrop-filter.json`, `mask.json`

**Smallest fix:**
- Add `ContentVisibility` to the Safari15 exclusion set (safari added 18).
- Pin and document what `safari-15` means (exact minor, e.g. 15.0 baseline; call out 15.4 `mask` unprefix boundary).
- Re-verify every tracked feature against BCD; at minimum reconcile `backdrop-filter` (unprefixed 18, `-webkit-` since 9) and `mask` (unprefixed 15.4) emission/diagnostic behavior with the pinned target.
- Update `COMPATIBILITY.md` + `CONFIGURATION.md` to state the pinned release semantics.

**Tests to add:**
- Compat fixtures: `content-visibility` errors/warns under `safari-15`, passes on modern target; `backdrop-filter`/`mask` expectations pinned to the documented Safari minor.

**Gate:**
- `cargo test -p utilitycss-css-ir`
- `cargo test -p utilitycss-compiler` (compat diagnostics)

**Evidence refs:**
- `crates/utilitycss-css-ir/src/lib.rs:63 CONFIRMED — Safari15 excludes only ColorMix|LightDark|FieldSizing`
- `crates/utilitycss-css-ir/src/lib.rs:82 CONFIRMED — ContentVisibility tracked but not excluded for Safari15`
- `BCD content-visibility.json CONFIRMED — safari version_added 18, so safari-15 lacks it`
- `crates/utilitycss-css-ir/src/lib.rs:28 CONFIRMED — 'A Safari 15-era target', no minor version pinned`
- `docs/COMPATIBILITY.md:50 CONFIRMED — lists safari-15 with no release definition`
- `docs/CONFIGURATION.md:91 CONFIRMED — browserTarget names target, no Safari release semantics`
- `BCD backdrop-filter.json CONFIRMED — unprefixed safari 18; -webkit- since 9`
- `crates/utilitycss-utilities/src/lib.rs:194 CONFIRMED — emits unprefixed 'backdrop-filter'`
- `crates/utilitycss-utilities/src/lib.rs:232 CONFIRMED — content-auto emits content-visibility:auto`
- `BCD mask.json CONFIRMED — unprefixed mask safari 15.4; pre-15.4 recognized, no effect`

---

## Phase 2 — Adapters (CLI / Vite / Bun / WASM)

### 2.1 CLI watch mode survives diagnostics

**Files:**
- `crates/utilitycss-cli/src/main.rs` (`emit`, watch loop, `apply_watch_event`, `update_file`)
- `crates/utilitycss-compiler/src/lib.rs` (`build()->CompileOutput`)
- `crates/utilitycss-swc/src/lib.rs` (JS extraction errors)

**Smallest fix:**
- Watch loop: do not `?`-propagate diagnostics from `emit`; print (already on stderr) and continue watching.
- Startup `emit` may still fail; in-loop `emit` must not exit.
- Only `fs::write` on empty diagnostics; preserve last-known-good CSS on invalid edits.
- `apply_watch_event` / `update_file`: log invalid-edit / extraction failures and continue; reserve `Err`/exit for filesystem/config failures that cannot proceed.

**Tests to add:**
- Watch regression: valid -> invalid edit (diagnostics printed, CSS unchanged, watcher alive) -> fixed edit (rebuilds).

**Gate:**
- `cargo test -p utilitycss-cli`
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`

**Evidence refs:**
- `crates/utilitycss-cli/src/main.rs:447 CONFIRMED — loop emit(&mut compiler,&options)? exits watcher on Diagnostics`
- `crates/utilitycss-cli/src/main.rs:386 CONFIRMED — startup emit(...)? aborts watch before loop on diagnostics`
- `crates/utilitycss-cli/src/main.rs:680 CONFIRMED — if diagnostics.is_empty...else Err(Diagnostics) makes emit fatal`
- `crates/utilitycss-cli/src/main.rs:646 CONFIRMED — fs::write(path,css) runs before diagnostics check, clobbers good CSS`
- `crates/utilitycss-cli/src/main.rs:656 ALREADY-OK — for diagnostic...eprintln! prints diagnostics to stderr`
- `crates/utilitycss-cli/src/main.rs:440 CONFIRMED — apply_watch_event(...)? propagates invalid-edit errors, kills loop`
- `crates/utilitycss-cli/src/main.rs:520 CONFIRMED — update_file(compiler,&key)? bubbles Extraction/Compiler errors`
- `crates/utilitycss-cli/src/main.rs:560 CONFIRMED — update_file maps read/extract/update_source failures to Err`
- `crates/utilitycss-compiler/src/lib.rs:823 ALREADY-OK — build()->CompileOutput carries css+diagnostics in-band`
- `crates/utilitycss-swc/src/lib.rs:158 CONFIRMED — JS parse failure Err(ExtractionError) becomes fatal via apply path`

### 2.2 Vite adapter: consistent diagnostics + `.htm`

**Files:**
- `packages/utilitycss-vite/src/index.ts` (`load`, `transform`, `handleHotUpdate`, `include`)
- `crates/utilitycss-compiler/src/lib.rs` (`build()` in-band diagnostics)
- `crates/utilitycss-stylesheet/src/lib.rs` (stylesheet output shape)
- `packages/utilitycss-bun/src/index.ts` (reference: `reportDiagnostics`, `SOURCE_FILTER`)

**Smallest fix:**
- `handleHotUpdate` non-CSS branch: read `build().diagnostics` and report (mirror CSS branch `reportHotUpdateDiagnostics`); do not silently drop.
- `load()`: surface diagnostics instead of returning `compiler.build().css` alone.
- `include` regex: `html` -> `html?` with `/i` to match CLI/Bun `.htm` behavior.

**Tests to add:**
- HMR: invalid then corrected HTML/TSX -> diagnostics reported, then clean rebuild; `.htm` included.

**Gate:**
- `npm run typecheck` (or workspace typecheck)
- `npm test` / Vite adapter tests + `test:bun` unaffected

**Evidence refs:**
- `packages/utilitycss-vite/src/index.ts:124 CONFIRMED — transform() reports build().diagnostics for non-CSS inputs`
- `packages/utilitycss-vite/src/index.ts:137 CONFIRMED — handleHotUpdate non-CSS branch never reads build().diagnostics`
- `packages/utilitycss-vite/src/index.ts:133 CONFIRMED — handleHotUpdate CSS branch does reportHotUpdateDiagnostics`
- `packages/utilitycss-vite/src/index.ts:113 CONFIRMED — load() returns compiler.build().css, drops diagnostics`
- `packages/utilitycss-vite/src/index.ts:120 CONFIRMED — transform CSS returns result.css alongside diagnostics`
- `crates/utilitycss-stylesheet/src/lib.rs:112 CONFIRMED — error path returns StylesheetOutput::new(content, diagnostics)`
- `crates/utilitycss-compiler/src/lib.rs:865 CONFIRMED — build() returns css + diagnostics together, no throw`
- `packages/utilitycss-bun/src/index.ts:199 CONFIRMED — Bun reportDiagnostics throws on errors; Vite load() does not`
- `packages/utilitycss-vite/src/index.ts:75 CONFIRMED — include regex has html only, no htm, no /i flag`
- `packages/utilitycss-bun/src/index.ts:17 CONFIRMED — Bun SOURCE_FILTER uses html? with /i flag`

### 2.3 Bun adapter: dependency-graph pruning

**Files:**
- `packages/utilitycss-bun/src/index.ts` (href/src scan, resolve, prune, rehydrate)
- `packages/utilitycss-vite/src/index.ts` (reference delete path)
- `examples/bun/src/components/Navigation.tsx` (live `#` poison case)

**Smallest fix:**
- Filter `href`/`src` before `Bun.resolveSync`: skip fragments (`#...`), `data:`, external schemes, protocol-relative `//`, root-relative/static assets (non-module extensions); only resolve likely JS/TS/module specifiers.
- Per-module failure: one unresolved non-module must not set global `complete=false` and disable all pruning.
- Add deletion path: on unlink/unreachable, `removeSource` + delete (mirror Vite `watchChange` delete); ensure rehydrate loop does not resurrect deleted sources.

**Tests to add:**
- `href="#section"`, `href="#"`, `data:` URL, root-relative asset do not poison pruning; delete/unreachable module stops contributing CSS; recovery re-adds.

**Gate:**
- `npm run test:bun` / Bun adapter tests
- Bun example prod build still passes

**Evidence refs:**
- `packages/utilitycss-bun/src/index.ts:329 CONFIRMED — matchAll(/(?:src|href).../gi) feeds every href/src into module resolution`
- `packages/utilitycss-bun/src/index.ts:338 CONFIRMED — only skip is scheme:// or //; #x,data:,/assets fall to Bun.resolveSync`
- `packages/utilitycss-bun/src/index.ts:336 CONFIRMED — comment keeps #... eligible as alias; fragments not ignored`
- `packages/utilitycss-bun/src/index.ts:342 CONFIRMED — Bun.resolveSync(specifier,dirname(id)) tried for each surviving href/src`
- `packages/utilitycss-bun/src/index.ts:343 CONFIRMED — catch{complete=false} marks module incomplete on any resolve failure`
- `packages/utilitycss-bun/src/index.ts:85 CONFIRMED — some(complete=>!complete)→return; one failure disables all pruning`
- `packages/utilitycss-bun/src/index.ts:55 CONFIRMED — for([id,source] of moduleSources)updateSource rehydrates all each build`
- `packages/utilitycss-bun/src/index.ts:98 CONFIRMED — sole removal is if(!reachable)delete+removeSource; no delete hook`
- `packages/utilitycss-vite/src/index.ts:150 CONFIRMED — Vite watchChange delete→removeSource; Bun has no equivalent path`
- `examples/bun/src/components/Navigation.tsx:9 CONFIRMED — demo href="#" in many components poisons pruning live`

### 2.4 WASM / Node lifecycle + API alignment

**Files:**
- `crates/utilitycss-wasm/src/lib.rs` + `packages/utilitycss-wasm/src/index.ts`
- `crates/utilitycss-napi/src/lib.rs` + `packages/utilitycss-napi/index.d.ts` (reference shape)
- `packages/utilitycss-node/src/index.ts` (`dispose`, `NativeCompiler`)

**Smallest fix:**
- WASM `build()`: return structured `{css, diagnostics, stats}` (or JSON equivalent) instead of `String`-only CSS; mirror NAPI `JsBuildResult`.
- Align constructor/inputs as practical: `pretty/config/browserTarget`, `update_source(id, path?, content/candidates)`, add `extract_candidates`; align `explain`/`validate` return encoding (JsValue objects vs JSON strings — pick one and document).
- `Compiler.dispose()`: actually release/reset native handle (null out + guard further use), not only `disposed=true`; add NAPI `dispose`/`close` if needed for symmetry.

**Tests to add:**
- WASM build exposes diagnostics on invalid input; constructor/config parity smoke; `dispose()` releases and blocks reuse (or cleanly re-inits per documented contract); `extract_candidates` parity.

**Gate:**
- `cargo test -p utilitycss-wasm`
- `npm run typecheck && npm test` (node/wasm/napi)
- WASM runtime smoke in CI

**Evidence refs:**
- `crates/utilitycss-wasm/src/lib.rs:107 CONFIRMED — pub fn build(&mut self) -> String returns only .css(), drops diagnostics+stats`
- `packages/utilitycss-wasm/src/index.ts:15 CONFIRMED — build(): string vs Node BuildResult{css,diagnostics,stats} (node:29)`
- `crates/utilitycss-napi/src/lib.rs:232 CONFIRMED — NAPI build() returns JsBuildResult{css,diagnostics,stats}; WASM has no equal`
- `crates/utilitycss-cli/src/main.rs:656 CONFIRMED — CLI prints diagnostics+stats(666) and fails on them(680); WASM cannot`
- `crates/utilitycss-wasm/src/lib.rs:52 CONFIRMED — WASM new(pretty: bool) only; NAPI takes pretty/config/browserTarget (napi:107)`
- `crates/utilitycss-wasm/src/lib.rs:63 CONFIRMED — update_source(id,content) 2-arg, no path; NAPI takes path+candidates (napi:150)`
- `crates/utilitycss-napi/src/lib.rs:195 CONFIRMED — NAPI has extract_candidates; full WASM lib.rs+wrapper have none`
- `crates/utilitycss-wasm/src/lib.rs:112 CONFIRMED — WASM explain/validate return JsValue objects; NAPI returns JSON strings`
- `packages/utilitycss-node/src/index.ts:170 CONFIRMED — dispose(){this.disposed=true;} only; native is readonly (line 87)`
- `packages/utilitycss-napi/index.d.ts:4 CONFIRMED — NAPI Compiler has no dispose/close; Node NativeCompiler iface neither`

---

## Phase 3 — Release tooling

**Files:**
- `scripts/validate-package-content.mjs`
- `scripts/smoke-packed-node.mjs`
- `scripts/smoke-packed-bun.mjs`
- `scripts/release-check.mjs`
- `scripts/lib/exec.mjs` (existing `nodeExecutable()` helper pattern)

**Smallest fix:**
- Extract one shared npm-launcher helper (handles `npm_execpath` + `bun run` correctly; never runs Bun binary as `npm-cli.js`); replace the three byte-identical launcher blocks.
- `release-check.mjs`: add strict mode (`--strict` / env) where required `SKIP`s fail instead of exit 0; keep `pass()/skip()/fail()` + `results[]` statuses.
- De-duplicate evidence: give "production" vs "`@apply`" and "adapter tests" vs "`@apply` smoke" distinct commands instead of running the same `run smoke:vite` / `test:bun` twice.

**Tests / checks to add:**
- Manual matrix: each touched script via `npm run ...` and `bun run ...`; strict-mode run fails on required skips, non-strict preserves current exit-0-with-notice.

**Gate:**
- `npm run validate:packages`
- `node scripts/release-check.mjs` and strict variant
- `scripts/smoke-packed-*.mjs` under both npm and bun

**Evidence refs:**
- `scripts/validate-package-content.mjs:5 CONFIRMED — process.env.npm_execpath ? [process.execPath, ...] launcher block`
- `scripts/smoke-packed-node.mjs:6 CONFIRMED — byte-identical launcher block incl. win32 npm-cli.js path`
- `scripts/smoke-packed-bun.mjs:6 CONFIRMED — byte-identical launcher block, third copy, no shared helper`
- `scripts/release-check.mjs:8 ALREADY-OK — guards with /npm-cli\\.js$/ + comment: bun run sets npm_execpath to bun`
- `scripts/lib/exec.mjs:100 ALREADY-OK — nodeExecutable() detects bun binary; npm launcher has no such helper`
- `scripts/smoke-packed-bun.mjs:6 CONFIRMED — honors npm_execpath blindly so bun run yields [bun, bun-binary]`
- `scripts/release-check.mjs:20 ALREADY-OK — pass()/skip()/fail() emit distinct PASS/SKIP/FAIL + results[] statuses`
- `scripts/release-check.mjs:252 CONFIRMED — no strict mode; exit 0 with skips, only 'not release evidence' notice`
- `scripts/release-check.mjs:197 CONFIRMED — same run smoke:vite twice as 'production' + '@apply' independent evidence`
- `scripts/release-check.mjs:242 CONFIRMED — same js-task test:bun twice as 'adapter tests' + '@apply smoke' evidence`

---

## Phase 4 — CI (carried, no researcher digest)

No researcher digest covered CI; carried from prior `temp_plan.md`. Implement after Phases 1–3 so gates run against fixed code.

**Required gates:**
- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- `cargo test --workspace --all-features`
- `cargo test -p utilitycss-compiler --test conformance`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run validate:packages`

**Also retain:** Rust 1.88 MSRV; dependency/license audits; WASM runtime smoke; Bun integration; native Linux x64; Windows x64; macOS ARM64; macOS x64.

**Smallest fix:** restore green `main` on the above, then require CI checks before merge to `main`.

---

## Phase 5 — Repository consistency

**Files:**
- `MANIFEST.json`, `README.md`
- `packages/utilitycss-bun/package.json` (+ node/vite/wasm/napi `package.json`)
- `crates/utilitycss-cli/src/main.rs` (`is_supported_source`)
- `packages/utilitycss-bun/src/index.ts` (`SOURCE_FILTER`)
- `packages/utilitycss-vite/src/index.ts` (`include`)
- `crates/utilitycss-wasm/src/lib.rs` (`build()` docs)

**Smallest fix:**
- `MANIFEST.json`: regenerate to current tree or delete if not auto-maintainable; must not claim "All repository files" while omitting `docs/APPLY.md`, `utilitycss-stylesheet`, `utilitycss-bun`, `scripts/*`, `fixtures/*`; fix `file_count: 105`.
- Engines/docs: reconcile `README` Bun `1.2+` vs `@utilitycss/bun` `engines.bun >=1.4.0`; declare Node `engines` where README requires Node 20+.
- `.htm`: unify CLI (`is_supported_source` matches `htm`) + Bun (`html?`) + Vite (fix to `html?`, see 2.2).
- Docs: update adapter API docs to match fixed WASM diagnostics behavior; fix `README:327` MANIFEST description if MANIFEST is kept/removed.
- Carried silent-failure hardening (no digest; keep small): oversized sources return explicit errors on checked/public APIs; serialization failure must not silently yield `{}`.

**Tests / checks:**
- MANIFEST freshness check (or removal justification); engines assertion; `.htm` extraction parity test (CLI/Bun/Vite).

**Gate:** `npm run validate:packages` + docs build (if any) + Phase 2 adapter tests.

**Evidence refs:**
- `MANIFEST.json:15 CONFIRMED — file_count 105 but repo adds scripts/, fixtures/, examples/, new crates/packages`
- `MANIFEST.json:16 CONFIRMED — files[] omits docs/APPLY.md, utilitycss-stylesheet, utilitycss-bun, scripts/*, fixtures/*`
- `README.md:327 CONFIRMED — calls MANIFEST docs inventory; MANIFEST claims All repository files`
- `README.md:24 CONFIRMED — prerequisite says Bun 1.2+ for Bun adapter/example`
- `packages/utilitycss-bun/package.json:9 CONFIRMED — engines.bun >=1.4.0 contradicts README 1.2+`
- `packages/utilitycss-node/package.json:1 CONFIRMED — node/vite/wasm/napi + root declare no engines; README needs Node 20+`
- `crates/utilitycss-cli/src/main.rs:763 CONFIRMED — is_supported_source matches htm`
- `packages/utilitycss-bun/src/index.ts:17 CONFIRMED — SOURCE_FILTER /html?/ covers .htm`
- `packages/utilitycss-vite/src/index.ts:75 CONFIRMED — include regex html not html?, drops .htm`
- `crates/utilitycss-wasm/src/lib.rs:107 CONFIRMED — build()->String returns CSS only, drops diagnostics`

---

## Phase 6 — Demo last (`examples/bun` canonical showcase)

Do not create a second large demo. Upgrade `examples/bun` after Phases 1–5 prove the fixes.

**Files:** `examples/bun/src/index.html`, `src/components/*`, `src/app.css`, `utilitycss.config.css`, `src/server.ts`, verify script.

**Smallest fix / content:**
1. `index.html`: add real `class` attributes (HTML extraction proof).
2. Keep `Card.tsx` `grid gap-6 lg:grid-cols-3` (TSX proof).
3. Add `clsx`/`cn` helper usage (replace manual `${...}`.trim in `Button.tsx`; add dep).
4. Keep `--color-brand-600` token + assert.
5. `utilitycss.config.css`: add `screens`/breakpoints incl. leading-digit `2xl`.
6. Add `2xl:` breakpoint uses (today only `text-2xl` font-size exists).
7. Keep `hover:`/`md:`/`lg:` + assert; assert `max-w-[24rem]` and `w-[%]` arbitrary values.
8. Keep `@apply` recipes + asserts.
9. Add HMR exercise (today only `hmr:true` wired, verify only prod-builds).
10. Add deletion (no stale CSS) + invalid-utility diagnostics/recovery exercise.
11. Keep production `Bun.build()` verify.
12. Add browser-target compat diagnostics exercise.
- Add **Compiler Lab** page: live source, generated CSS, diagnostics, active browser target, extraction mode, responsive/arbitrary/variant/`@apply` examples. Keep component explorer simplified.

**Tests:** extend `verify.ts`: HTML classes, `2xl:` media order, arbitrary values, HMR, deletion, diagnostics recovery, compat target.

**Gate:** Bun example `verify.ts` + `Bun.build()` prod build.

**Evidence refs:**
- `examples/bun/src/index.html:1 CONFIRMED — no class attrs in HTML; only links+script, HTML extraction unproven`
- `examples/bun/src/components/Card.tsx:7 ALREADY-OK — className=grid gap-6 lg:grid-cols-3; SOURCE_FILTER covers tsx`
- `examples/bun/src/components/Button.tsx:32 CONFIRMED — manual ${...}.trim(); no clsx/cn; pkg deps only preact`
- `examples/bun/utilitycss.config.css:6 ALREADY-OK — --color-brand-600:#4f46e5; verify.ts:71 asserts hex`
- `examples/bun/utilitycss.config.css:2 CONFIRMED — @theme only colors/spacing; no screens/breakpoints/2xl`
- `examples/bun/src/components/Overlays.tsx:42 CONFIRMED — only text-2xl (font size); zero 2xl: breakpoint uses`
- `examples/bun/src/components/Accordion.tsx:18 ALREADY-OK — hover:bg-gray-50; md:/lg: used, asserted verify.ts:62-63`
- `examples/bun/src/components/Forms.tsx:42 CONFIRMED — max-w-[24rem] unasserted; w-[%] only in @apply app.css:141`
- `examples/bun/src/app.css:3 ALREADY-OK — @apply inline-flex ... recipes throughout; verify asserts fragments`
- `examples/bun/src/server.ts:13 CONFIRMED — hmr:true+bun --hot wired; verify.ts only prod-builds, no HMR test`

---

## Acceptance mapping

- Leading-digit selectors correct -> 1.1
- Custom breakpoints deterministic -> 1.2
- `safari-15` compat truthful + pinned -> 1.3
- Watch survives invalid edits, good CSS intact -> 2.1
- Vite HMR diagnostics + `.htm` -> 2.2
- Bun pruning + deletion -> 2.3
- WASM diagnostics + `dispose()` real -> 2.4
- Release scripts work under npm and bun; strict evidence -> Phase 3
- CI green on `main`, required for merge -> Phase 4
- MANIFEST/engines/`.htm`/docs agree -> Phase 5
- Bun demo exercises corrected behavior -> Phase 6
