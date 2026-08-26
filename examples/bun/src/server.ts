import homepage from "./index.html";

const port = Number(process.env.PORT ?? 3000);
const development = process.env.NODE_ENV !== "production";

const server = Bun.serve({
  port,
  routes: {
    "/": homepage
  },
  development: development
    ? {
        hmr: true,
        console: true
      }
    : false,
  fetch() {
    return new Response("Not found", { status: 404 });
  }
});

console.log(`Bun server running at ${server.url}`);
