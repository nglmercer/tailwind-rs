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

The adapter creates a fresh compiler for each Bun build cycle. It does not start a second
filesystem watcher or write a development stylesheet to disk, so source deletion and HMR rebuilds
reflect exactly the current Bun module graph.

The default export is a zero-options plugin object for Bun's `bunfig.toml` loader; use the named
`utilitycss(options?)` export when passing options to `Bun.build()`.
