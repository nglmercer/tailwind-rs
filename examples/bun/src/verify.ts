import { buildProduction } from "./production-build.ts";
import { handleMockApi } from "./mock-api.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const response = await handleMockApi(new Request(`http://localhost${path}`, options));
  assert(response, `No mock API route handled ${path}`);
  return response;
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

const result = await buildProduction({ write: false });
assert(result.success, `Bun production build failed: ${result.logs.map((log) => log.message).join("\n")}`);
const cssOutputs = await Promise.all(
  result.outputs
    .map(async (output, index) => ({ path: result.outputs[index].path, contents: await output.text() }))
);
const css = cssOutputs.find((output) => output.path.endsWith(".css"))?.contents ?? "";
assert(css.length > 0, "Bun production build did not emit a CSS asset");
const expectedOutput = [
  ".flex",
  ".grid",
  ".p-4",
  ".bg-brand-600",
  ".hover\\:bg-red-500\\/50:hover",
  ".md\\:grid-cols-2",
  ".rounded",
  "@media"
];

const missing = expectedOutput.filter((fragment) => !css.includes(fragment));
assert(missing.length === 0, `utilitycss output is missing: ${missing.join(", ")}`);

const email = `bun-${crypto.randomUUID()}@example.com`;
const registerResponse = await apiRequest("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Bun Tester", email, password: "secret123" })
});
assert(registerResponse.status === 201, `register returned ${registerResponse.status}`);
const registerPayload = await json<{ user?: { email?: string } }>(registerResponse);
assert(registerPayload.user?.email === email, "register did not return the created user");

const cookie = registerResponse.headers.get("set-cookie")?.split(";", 1)[0];
assert(cookie, "register did not set a session cookie");

const meResponse = await apiRequest("/api/auth/me", { headers: { cookie } });
assert(meResponse.status === 200, `me returned ${meResponse.status}`);
const mePayload = await json<{ user?: { email?: string } }>(meResponse);
assert(mePayload.user?.email === email, "me did not resolve the registered session");

const duplicateResponse = await apiRequest("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Another User", email, password: "secret123" })
});
assert(duplicateResponse.status === 409, `duplicate register returned ${duplicateResponse.status}`);

const logoutResponse = await apiRequest("/api/auth/logout", {
  method: "POST",
  headers: { cookie },
  body: "{}"
});
assert(logoutResponse.status === 200, `logout returned ${logoutResponse.status}`);

const expiredMeResponse = await apiRequest("/api/auth/me", { headers: { cookie } });
assert(expiredMeResponse.status === 401, `expired session returned ${expiredMeResponse.status}`);

const demoLoginResponse = await apiRequest("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "demo@example.com", password: "password123" })
});
assert(demoLoginResponse.status === 200, `demo login returned ${demoLoginResponse.status}`);
const demoCookie = demoLoginResponse.headers.get("set-cookie")?.split(";", 1)[0];
assert(demoCookie, "demo login did not set a session cookie");
const demoMeResponse = await apiRequest("/api/auth/me", { headers: { cookie: demoCookie } });
assert(demoMeResponse.status === 200, `demo session lookup returned ${demoMeResponse.status}`);

const badLoginResponse = await apiRequest("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "demo@example.com", password: "wrong-password" })
});
assert(badLoginResponse.status === 401, `bad login returned ${badLoginResponse.status}`);

const outputKinds = result.outputs.map((output) => output.path.split(".").pop()).filter(Boolean);
assert(outputKinds.includes("html"), "Bun production build did not emit the HTML entry asset");
assert(outputKinds.includes("js"), "Bun production build did not emit the Preact JavaScript asset");

console.log("Bun + Preact example verification passed.");
console.log(`Generated stylesheet asset (${css.length} bytes) from the Bun module graph.`);
console.log(`Production assets: ${outputKinds.join(", ")}.`);
console.log("REST mock verified: register, duplicate register, session lookup, logout, and invalid login.");
