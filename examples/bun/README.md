# Bun + Preact component demo — Flowbite/daisyUI parity

A Flowbite + daisyUI-inspired component gallery built with Bun, Preact, and the native `utilitycss` Rust compiler. Every component is a 1:1 visual replication using deterministic utilities and `@apply` recipes — no Tailwind runtime.

**38 components across 7 sections:**

- **Actions:** buttons (6 variants, 4 sizes, icons), button groups, dropdowns, popovers/tooltips
- **Surfaces:** cards (product, profile, activity, horizontal, pricing ×3), carousel, jumbotron
- **Display:** badges (6 variants, dot, dismissible, sizes), avatars (sizes, stacked, dot), accordion, list groups
- **Navigation:** breadcrumbs, pagination, tabs, navbar, sidebar, stepper
- **Forms:** inputs, textarea, select, checkbox/radio, toggle, file, range, search with icon
- **Feedback:** alerts (5 variants), banner, progress bars, spinners, skeletons, ratings, timeline, toasts, stats
- **Data:** responsive table + modal/drawer

## Structure

```
src/
  app.tsx                 # gallery orchestrator (sections, state for modal/drawer/toast)
  components/
    Icon.tsx              # 28 icons
    Button.tsx            # Button + ButtonGroup/Sizes/Icons demos
    Badge.tsx
    Alert.tsx             # Alert + Banner
    Card.tsx              # Card, Pricing, Horizontal, Jumbotron
    Accordion.tsx
    Avatar.tsx
    Forms.tsx
    Navigation.tsx        # Breadcrumb, Pagination, Tabs, Navbar, Sidebar, Stepper
    Feedback.tsx          # Progress, Spinner, Skeleton, Rating, Timeline, Toast, ListGroup
    Overlays.tsx          # Dropdown, Popover, Modal, Drawer
    Carousel.tsx
    TableSection.tsx
    index.ts
  app.css                 # @apply recipes (buttons, badges, alerts, tabs, progress, etc.)
  style.css               # authored layout only (header, hero, sections, modal/drawer)
  verify.ts               # Bun.build() + CSS fragment assertions
  production-build.ts     # production Bun.build() helper
utilitycss.config.css     # CSS-first theme (brand/blue/green/yellow/red + spacing)
```

Open `src/app.tsx` to see section composition, `src/app.css` for `@apply` recipes, and `src/style.css` for the minimal authored layout. The CSS-first theme in [`utilitycss.config.css`](./utilitycss.config.css) supplies the brand/blue/green/yellow/red palette shared by dev and prod.

## Run it

From the repository root, install workspace deps:

```bash
npm install
```

Then from this directory:

```bash
bun install --frozen-lockfile
bun run setup
```

Verify, build, or dev:

```bash
bun run verify   # Bun.build() + CSS checks (brand token, radii, shadows, all 38 components)
bun run build    # writes bundled assets to dist/
bun run dev      # bun --hot src/server.ts → http://localhost:3000
bun run test     # alias for verify
```

`bunfig.toml` wires the same config for HMR:

```toml
[serve.static]
plugins = ["./src/bun-plugin.ts"]
```

## How it is wired

- `src/index.html` links `style.css`, `app.css`, and virtual `utilitycss` stylesheet.
- `src/app.tsx` composes all sections from `src/components/*` with Preact state for mobile nav, modal, drawer, toast, tabs, carousel, forms.
- `src/app.css` contains recipes like `.button { @apply inline-flex ... }`, `.alert-success { @apply border-green-200 ... }`, `.tab-link-active { @apply border-brand-600 }` — all Rust-backed.
- `src/style.css` holds only presentation/layout that cannot be expressed as utilities (hero gradient, sticky header, modal backdrop, etc.) and defines `--spacing: 0.25rem`.
- `utilitycss.config.css` is shared by `bun --hot` and `Bun.build()` so theme resolution is identical.
- `src/verify.ts` asserts representative recipes and every section's CSS fragments.

This example imports built repo packages directly, so run from a checkout. `@utilitycss/bun` collects the HTML+TSX module graph and returns CSS via virtual `utilitycss` stylesheet — no second watcher or Node runtime needed.

Dev builds enable Bun adapter debugging (build number + failed HMR recovery message — expected, not silent).

`dist/` and `node_modules/` are gitignored.

## Styling note

Component class names (`button`, `component-card`, `badge`, etc.) are ordinary authored classes whose declarations come from `@apply` and the CSS-first theme. They are not a claim of Tailwind/Flowbite/daisyUI runtime compatibility — the demo shows how a rich component vocabulary is built on utilitycss's deterministic compiler.
