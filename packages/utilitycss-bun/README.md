# @utilitycss/bun

`@utilitycss/bun` is the Bun bundler and fullstack integration for `utilitycss`.
It collects supported source modules through Bun's plugin lifecycle and serves generated CSS from
the virtual `utilitycss` stylesheet specifier.

```ts
import { utilitycss } from "@utilitycss/bun";

const result = await Bun.build({
  entrypoints: ["src/server.ts"],
  outdir: "dist",
  target: "bun",
  plugins: [utilitycss()]
});

if (!result.success) {
  throw new Error("Bun build failed");
}
```

In Bun fullstack development, configure the plugin in `bunfig.toml`:

```toml
[serve.static]
plugins = ["@utilitycss/bun"]
```

Then reference the virtual stylesheet from HTML:

```html
<link rel="stylesheet" href="utilitycss" />
```

The adapter rebuilds a compiler from a persistent normalized-module snapshot for each Bun build
cycle. This retains unchanged modules when Bun omits them from an incremental callback while its
dependency graph tracking removes deleted modules. Imported `.css` files are transformed through
the same native `transformStylesheet` API used by Node and Vite.

For fullstack development, the application server should explicitly enable Bun frontend HMR:

```ts
Bun.serve({
  development: { hmr: true, console: true },
  routes: { "/": homepage }
});
```

The default export is a zero-options plugin object for Bun's `bunfig.toml` loader; use the named
`utilitycss(options?)` export when passing options to `Bun.build()`.
