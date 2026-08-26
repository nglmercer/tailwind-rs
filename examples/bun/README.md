# Bun example

This is a full login/register component example using Bun's HTML/fullstack bundler, a browser-side
JavaScript UI, and a mock REST API. The Rust compiler is used through `@utilitycss/node` and the
`@utilitycss/bun` plugin. Bun discovers the HTML and JavaScript module graph, loads the virtual
`utilitycss` stylesheet, and regenerates it during hot rebuilds; development does not write a CSS
file to disk.

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

Then, from this directory:

```bash
bun run setup
bun run verify
bun run build
bun run dev
```

Open <http://localhost:3000> after starting the server. `bun run verify` is a non-server smoke test;
it runs an actual `Bun.build()` with the plugin, checks generated CSS, and verifies the mock auth
API. `bun run build` performs the same production build and writes bundled assets to `dist/`.
`bun run test` runs the verification.

`bun run setup` builds the current platform's native binding plus the Node and Bun adapters. The
repository-local `bunfig.toml` loads the plugin through Bun's fullstack development lifecycle.

## Demo account

The login form shows the demo credentials in the UI:

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

## What it verifies

The page intentionally uses several supported utility families and variants:

- reusable login, register, password visibility, status, and authenticated dashboard components;
- spacing, sizing, colors, radius, flexbox, and grid utilities;
- an arbitrary width value (`max-w-[42rem]`);
- the `hover:` and responsive `md:` variants;
- deterministic CSS output generated as Bun's virtual stylesheet asset;
- JavaScript-family extraction from static `cn(...)` class helper calls.

The production `dist/` output is ignored by this example's `.gitignore`. Development uses Bun HMR
and does not require `public/utilitycss.css` or a separate utilitycss watcher.
