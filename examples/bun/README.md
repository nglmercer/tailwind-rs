# Bun example

This is a full login/register component example using Bun, a browser-side JavaScript UI, and a
mock REST API. The Rust compiler is used through `@utilitycss/node` and its native
`@utilitycss/napi` binding. It reads [`src/index.html`](./src/index.html) and
[`src/app.js`](./src/app.js), emits `public/utilitycss.css`, and the Bun server serves the app.

The example imports the built repository packages directly, so it is intended to be run from a
checkout of this repository rather than from the npm registry.

## Requirements

- [Bun](https://bun.sh/) 1.0 or newer
- [Node.js](https://nodejs.org/) and npm
- Rust stable with Cargo

## Run it

From the repository root, install the workspace dependencies and build the native binding:

```bash
npm install
```

Then, from this directory:

```bash
bun install
bun run setup
bun run verify
bun run dev
```

Open <http://localhost:3000> after starting the server. `bun run verify` is a non-server smoke test;
it fails if the Rust compiler reports diagnostics, does not emit the expected utility rules, or the
mock auth API does not complete its registration/session/logout checks. `bun run test` runs the
same verification.

`bun run setup` builds the platform-specific native binding and the Node adapter. `bun install` has
no third-party dependencies to download; it initializes Bun's local project metadata while the
example uses the packages built in the parent repository.

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
- deterministic CSS output written to `public/utilitycss.css`;
- JavaScript-family extraction from static `cn(...)` class helper calls.

The generated CSS is ignored by this example's `.gitignore` and is recreated by `bun run build`,
`bun run verify`, or `bun run dev`.
