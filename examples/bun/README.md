# Bun + Preact example

This is a small compiler studio built with Bun's HTML/fullstack bundler, Preact, and a mock REST
API. The page is intentionally more than a CSS smoke test: sign in to see a session-aware dashboard,
switch between register and login flows, and inspect the compile story shown in the UI.

The Rust compiler is used through `@utilitycss/node` and the `@utilitycss/bun` plugin. Bun discovers
the HTML and TSX module graph, loads the virtual `utilitycss` stylesheet, and regenerates it during
hot rebuilds. Authored `src/app.css` is transformed through the same native `@apply` stylesheet
API, while development does not write a generated CSS file to disk or start a second watcher.

The example imports the built repository packages directly, so it is intended to be run from a
checkout of this repository rather than from the npm registry.

## Requirements

- [Bun](https://bun.sh/) 1.4.0 or newer
- [Node.js](https://nodejs.org/) and npm
- Rust stable with Cargo

## Run it

From the repository root, install the workspace dependencies:

```bash
npm install
```

Then, from this directory, install the example's Preact dependency and build the local adapters:

```bash
bun install --frozen-lockfile
bun run setup
```

Run the non-server smoke test, production build, or HMR server:

```bash
bun run verify
bun run build
bun run dev
```

Open <http://localhost:3000> after starting the server. `bun run verify` performs an actual
`Bun.build()` with the plugin, checks generated CSS plus HTML/JavaScript assets, and verifies the
mock auth API. `bun run build` writes bundled assets to `dist/`. `bun run test` is an alias for the
verification command.

The repository-local `bunfig.toml` connects Bun's fullstack development lifecycle to the plugin:

```toml
[serve.static]
plugins = ["../../packages/utilitycss-bun/src/index.ts"]
```

The published-package equivalent is:

```toml
[serve.static]
plugins = ["@utilitycss/bun"]
```

## How the example is structured

- `src/index.html` is the Bun HTML entry and links `./style.css`, authored `./app.css`, and the virtual stylesheet
  with `<link rel="stylesheet" href="utilitycss" />`.
- `src/app.css` demonstrates local `@apply` composition, including a hover rule and a responsive
  `md:` variant.
- `src/style.css` contains the app's semantic component styling and responsive presentation rules.
- `src/app.tsx` owns only application state and composition; the Preact UI is split into focused
  files under `src/components/`.
- `src/styles.ts` contains reusable `cn(...)` utility recipes. Bun extracts the static utility
  strings from this module, which keeps component markup readable without hiding compiler input.
- `src/api.ts` and `src/types.ts` isolate the browser transport and shared domain types.
- `src/server.ts` imports the HTML route and delegates `/api/*` requests to the mock API.
- `src/production-build.ts` proves that an explicit `Bun.build()` can use the same plugin in a
  production bundle.
- `src/verify.ts` checks the generated asset and exercises registration, login, sessions, logout,
  duplicate registration, and invalid credentials.

`@utilitycss/node` remains the generic JavaScript compiler lifecycle API. `@utilitycss/bun` is the
Bun-specific bundler/fullstack/HMR integration that collects source modules through Bun hooks and
returns CSS as a virtual module. The example uses the latter; it does not run a CLI watcher.

## Demo account

The login form shows these credentials:

```text
Email:    demo@example.com
Password: password123
```

New registrations are stored in memory and disappear when the Bun process restarts. Passwords are
kept as plain text only because this is a local mock; this API MUST NOT be used in production.

## REST API

The server exposes these same-origin endpoints:

- `GET /api/health` — health check;
- `POST /api/auth/register` — creates a user and starts a session;
- `POST /api/auth/login` — validates the demo or a registered user;
- `GET /api/auth/me` — returns the current session user;
- `POST /api/auth/logout` — clears the session cookie.

## What it demonstrates

- Preact components and hooks bundled from TSX through Bun;
- semantic CSS in `style.css`, authored `@apply` composition in `app.css`, plus reusable utility
  recipes for repeated layout patterns;
- virtual CSS generated from HTML and TSX module-graph sources;
- spacing, sizing, colors, radius, flexbox, and grid utilities;
- arbitrary values such as `max-w-[42rem]` and `hover:`/responsive `md:` variants;
- deterministic output and stale-source removal between fresh build cycles;
- an HttpOnly mock session cookie and useful error states in the browser UI;
- Bun HMR without `public/utilitycss.css` or a separate utilitycss watch process.

The production `dist/` output and local `node_modules/` are ignored by this example's `.gitignore`.

## Styling recommendation

Keep product-specific visual design in `style.css`, use `app.css` for local `@apply` composition,
and use `styles.ts` for small, static utility recipes that should remain visible to the compiler.
The `@apply` implementation is utilitycss-compatible composition backed by the Rust registry; it
MUST NOT be read as a claim of complete Tailwind compatibility.
