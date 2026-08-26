type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

type PublicUser = Omit<User, "password">;

const SESSION_COOKIE = "mock_session";
const users = new Map<string, User>([
  [
    "demo@example.com",
    {
      id: "user_demo",
      name: "Demo User",
      email: "demo@example.com",
      password: "password123"
    }
  ]
]);
const sessions = new Map<string, string>();

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function publicUser(user: User): PublicUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function cookieValue(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1);
}

function currentUser(request: Request) {
  const session = cookieValue(request);
  const userId = session ? sessions.get(session) : undefined;
  return userId ? [...users.values()].find((user) => user.id === userId) : undefined;
}

function setSession(user: User) {
  const token = crypto.randomUUID();
  sessions.set(token, user.id);
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600`;
}

async function body(request: Request) {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function register(request: Request) {
  const values = await body(request);
  const name = stringValue(values?.name);
  const email = stringValue(values?.email).toLowerCase();
  const password = typeof values?.password === "string" ? values.password : "";

  if (name.length < 2) {
    return json({ error: "Please provide a name with at least 2 characters.", field: "name" }, 400);
  }
  if (!validEmail(email)) {
    return json({ error: "Please provide a valid email address.", field: "email" }, 400);
  }
  if (password.length < 6) {
    return json({ error: "Password must contain at least 6 characters.", field: "password" }, 400);
  }
  if (users.has(email)) {
    return json({ error: "An account with this email already exists.", field: "email" }, 409);
  }

  const user = { id: `user_${crypto.randomUUID()}`, name, email, password };
  users.set(email, user);
  return json({ user: publicUser(user) }, 201, { "set-cookie": setSession(user) });
}

async function login(request: Request) {
  const values = await body(request);
  const email = stringValue(values?.email).toLowerCase();
  const password = typeof values?.password === "string" ? values.password : "";
  const user = users.get(email);

  if (!user || user.password !== password) {
    return json({ error: "Invalid email or password." }, 401);
  }

  return json({ user: publicUser(user) }, 200, { "set-cookie": setSession(user) });
}

function me(request: Request) {
  const user = currentUser(request);
  return user ? json({ user: publicUser(user) }) : json({ error: "You are not signed in." }, 401);
}

function logout(request: Request) {
  const session = cookieValue(request);
  if (session) {
    sessions.delete(session);
  }

  return json({ ok: true }, 200, {
    "set-cookie": `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  });
}

/** Handles the example's in-memory REST API routes. */
export async function handleMockApi(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) {
    return undefined;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "mock-auth-api" });
  }
  if (url.pathname === "/api/auth/register" && request.method === "POST") {
    return register(request);
  }
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    return login(request);
  }
  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    return me(request);
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    return logout(request);
  }

  return json({ error: "API route not found." }, 404);
}
