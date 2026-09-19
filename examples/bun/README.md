# Bun + Preact component gallery

A documentation-style component explorer built with Bun, Preact, and the native `utilitycss` Rust compiler. Components are statically imported into one catalog, selected through hash URLs, and shown one focused page at a time — no router dependency or Tailwind runtime.

**29 catalog entries across eight categories:**

- **Actions:** button, dropdown, modal, and popover
- **Data display:** accordion, avatar, badge, card, carousel, list group, table, and timeline
- **Navigation:** breadcrumbs, navbar, pagination, sidebar, steps, and reusable tabs
- **Feedback:** alert, banner, progress, rating, skeleton, spinner, and toast
- **Data input:** the existing grouped forms demo with controls and validation examples
- **Layout:** drawer and hero examples
- **Mockup:** reserved for the next catalog expansion
- **Tools:** Compiler Lab — live source, generated CSS, diagnostics, and browser targets

The catalog is intentionally smaller than DaisyUI's full component list for now. It is the source of truth for navigation, search, route reachability, and the displayed component count.

## Structure

```
src/
  app.tsx                 # explorer shell, route selection, and search state
  catalog.ts              # statically imported component registry
  hooks/
    useHashRoute.ts       # refresh-safe #/category/slug routing
  docs/
    AppShell.tsx          # header, category tabs, and footer
    CategoryTabs.tsx      # top-level category navigation
    ComponentSidebar.tsx  # second-level component navigation
    ComponentPage.tsx     # selected component page
    ComponentSearch.tsx   # registry search input
    DemoFrame.tsx         # preview / TSX / CSS frame
    ExampleTabs.tsx        # variants and example tabs
    DemoPages.tsx          # focused wrappers around existing demos
  components/
    Icon.tsx              # 28 icons
    ui/Tabs.tsx            # controlled accessible tabs primitive
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
  lib/cn.ts               # minimal clsx-style class joiner used by components
  lab/
    CompilerLab.tsx       # interactive Compiler Lab page (Tools category)
    compile.ts            # Lab compile backend shared by the server route and verify
    route.ts              # POST /api/compile handler
    load-config.ts        # config loader, embedded via a Bun macro at bundle time
  server.ts               # Bun fullstack server (gallery route + Lab API route)
  verify.ts               # Bun.build() + CSS fragment assertions
  production-build.ts     # production Bun.build() helper
utilitycss.config.css     # CSS-first theme (brand/blue/green/yellow/red + spacing, xs/2xl breakpoints)
```

Open `src/catalog.ts` to see the available component pages, `src/app.css` for `@apply` recipes, and `src/style.css` for the authored explorer layout. The CSS-first theme in [`utilitycss.config.css`](./utilitycss.config.css) supplies the brand/blue/green/yellow/red palette shared by dev and prod.

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
bun run verify   # Bun.build() + catalog, route, and CSS checks
bun run build    # writes bundled assets to dist/
bun run dev      # bun --hot src/server.ts → http://localhost:3000
bun run test     # alias for verify
```

Serve a production build from inside `dist/` (Bun resolves bundled static
assets relative to the working directory):

```bash
cd dist && PORT=3000 bun server.js
```

`bunfig.toml` wires the same config for HMR:

```toml
[serve.static]
plugins = ["./src/bun-plugin.ts"]
```

## How it is wired

- `src/index.html` links `style.css`, `app.css`, and virtual `utilitycss` stylesheet.
- `src/app.tsx` composes the shell, sidebar, and selected catalog page with Preact state for search and hash routing.
- `src/catalog.ts` statically imports every focused page so utilitycss can scan the complete Bun module graph.
- `src/docs/DemoFrame.tsx` gives each page the same Preview / TSX / CSS presentation, while `src/docs/ExampleTabs.tsx` organizes variants and related examples.
- `src/components/ui/Tabs.tsx` provides controlled tabs with tablist/tab/tabpanel semantics, disabled items, sizes, variants, and arrow-key navigation.
- `src/app.css` contains recipes like `.button { @apply inline-flex ... }`, `.alert-success { @apply border-green-200 ... }`, `.tab-link-active { @apply border-brand-600 }` — all Rust-backed.
- `src/style.css` holds only presentation/layout that cannot be expressed as utilities (hero gradient, sticky header, modal backdrop, etc.) and defines `--spacing: 0.25rem`.
- `utilitycss.config.css` is shared by `bun --hot` and `Bun.build()` so theme resolution is identical.
- `src/server.ts` adds `POST /api/compile` for the Compiler Lab; the Lab backend (`src/lab/compile.ts`) reuses the demo config and is also exercised by `verify.ts`.
- `src/lab/load-config.ts` is imported as a Bun macro so the bundled server embeds the config text instead of reading a source-relative path at runtime. `@utilitycss/napi` stays an external so the emitted server loads the native binding from `node_modules`.
- `src/verify.ts` asserts catalog invariants, hash-route round trips, representative recipes, and generated CSS fragments.

This example imports built repo packages directly, so run from a checkout. `@utilitycss/bun` collects the HTML+TSX module graph and returns CSS via virtual `utilitycss` stylesheet — no second watcher or Node runtime needed.

Dev builds enable Bun adapter debugging (build number + failed HMR recovery message — expected, not silent).

`dist/` and `node_modules/` are gitignored.

## Styling note

Component class names (`button`, `component-card`, `badge`, etc.) are ordinary authored classes whose declarations come from `@apply` and the CSS-first theme. The visual patterns are inspired by common component libraries, but the gallery demonstrates utilitycss's deterministic compiler rather than runtime compatibility with Tailwind, Flowbite, or daisyUI.
