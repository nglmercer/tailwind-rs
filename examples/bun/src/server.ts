import { join } from "node:path";
import { buildCss } from "./build.ts";
import { handleMockApi } from "./mock-api.ts";

const projectRoot = join(import.meta.dir, "..");
const htmlPath = join(projectRoot, "src", "index.html");
const appPath = join(projectRoot, "src", "app.js");
const cssPath = join(projectRoot, "public", "utilitycss.css");
const result = await buildCss();
const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const apiResponse = await handleMockApi(request);

    if (apiResponse) {
      return apiResponse;
    }

    if (pathname === "/") {
      return new Response(Bun.file(htmlPath), {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    if (pathname === "/app.js") {
      return new Response(Bun.file(appPath), {
        headers: { "content-type": "text/javascript; charset=utf-8" }
      });
    }

    if (pathname === "/utilitycss.css") {
      return new Response(Bun.file(cssPath), {
        headers: { "content-type": "text/css; charset=utf-8" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
});

console.log(`Generated ${result.stats.rulesGenerated} rules.`);
console.log(`Bun server running at ${server.url}`);
