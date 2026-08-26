import homepage from "./index.html";
import { handleMockApi } from "./mock-api.ts";

const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port,
  routes: {
    "/": homepage
  },
  async fetch(request) {
    const apiResponse = await handleMockApi(request);

    if (apiResponse) {
      return apiResponse;
    }

    return new Response("Not found", { status: 404 });
  }
});

console.log(`Bun server running at ${server.url}`);
