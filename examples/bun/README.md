# Bun + Preact component demo

This is a small Flowbite/daisyUI-style component gallery built with Bun, Preact, and the native
`utilitycss` compiler. It focuses on common UI patterns instead of a product workflow:

- navigation and responsive layout;
- buttons and badges;
- cards, profiles, activity lists, and stats;
- forms, empty states, alerts, and toasts;
- a responsive data table and modal dialog.

The page is intentionally easy to scan. Open `src/app.tsx` to see the component markup and
`src/app.css` to see a few reusable recipes written with `@apply`. The CSS-first theme in
[`utilitycss.config.css`](./utilitycss.config.css) supplies the small brand and status palette used
by the gallery.

## Run it

From the repository root, install the workspace dependencies:

```bash
npm install
```

Then, from this directory, install the example dependency and build the local adapters:

```bash
bun install --frozen-lockfile
bun run setup
```

Run the verification script, production build, or development server:

```bash
bun run verify
bun run build
bun run dev
```

Open <http://localhost:3000> after starting the server. `bun run verify` performs an actual
`Bun.build()` with the plugin and checks the generated HTML, JavaScript, and CSS assets. `bun run build`
writes bundled assets to `dist/`. `bun run test` is an alias for the verification command.

The repository-local `bunfig.toml` keeps Bun's development lifecycle on the same configured plugin:

```toml
[serve.static]
plugins = ["./src/bun-plugin.ts"]
```

## How it is wired

- `src/index.html` links semantic page CSS, authored `src/app.css`, and the virtual `utilitycss`
  stylesheet.
- `src/app.tsx` contains the gallery and small interactions for the mobile menu, form save toast,
  and modal dialog.
- `src/app.css` contains reusable button, badge, card, form, and code-block recipes using
  utilitycss `@apply`.
- `src/style.css` contains only the demo's presentation details and responsive layout rules. It
  also defines `--spacing: 0.25rem`, the base used by numeric spacing utilities such as `h-5` and
  `gap-10`.
- `utilitycss.config.css` is shared by Bun HMR and `Bun.build()` so theme resolution is consistent.
- `src/production-build.ts` proves that the same plugin works in a production bundle.
- `src/verify.ts` checks representative component recipes and generated utility rules.

This example imports the built repository packages directly, so it is intended to run from a
checkout of this repository. `@utilitycss/bun` collects the HTML and TSX module graph and returns
generated CSS through the virtual `utilitycss` stylesheet; it does not require a separate watcher
or Node.js runtime in the compiled application.

Development builds enable Bun adapter debugging. The terminal reports each build number and, when
an HMR rebuild fails, explains that Bun keeps the last successful bundle active until the source is
fixed and saved again. This is expected recovery behavior, not a silently ignored failure.

The production `dist/` output and local `node_modules/` are ignored by this example's `.gitignore`.

## Styling note

The component names in this example (`button`, `component-card`, `badge`, and so on) are ordinary
authored CSS classes. Their declarations come from `@apply` and the CSS-first theme; they are not a
claim of Tailwind, Flowbite, or daisyUI compatibility. The example is meant to show how a small
component vocabulary can be built on top of utilitycss.
