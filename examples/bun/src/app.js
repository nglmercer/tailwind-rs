const root = document.querySelector("#app");

const state = {
  mode: "login",
  pending: false,
  showPassword: false,
  status: null,
  user: null
};

// The compiler recognizes this helper name and extracts its static class strings from app.js.
const cn = (...values) => values.filter(Boolean).join(" ");

// Keep utility classes in static helper calls so the SWC extractor can discover them in this JS source.
const styles = {
  status: cn("auth-status mt-4 rounded p-4"),
  fieldLabel: cn("auth-label mt-4"),
  input: cn("mt-2 w-full rounded bg-white p-4 text-black", "auth-input"),
  passwordRow: cn("mt-2 flex items-center gap-4"),
  passwordToggle: cn("rounded bg-black p-2 text-white", "auth-button"),
  demo: cn("mt-2 rounded bg-brand-600 p-2 text-white"),
  submit: cn("mt-4 w-full rounded bg-brand-600 p-4 text-white hover:bg-red-500/50", "auth-button"),
  layout: cn("grid gap-4 md:grid-cols-2"),
  aside: cn("rounded bg-brand-600 p-4", "auth-panel"),
  row: cn("flex items-center justify-between gap-4"),
  lightBadge: cn("rounded bg-white p-2 text-black"),
  darkBadge: cn("rounded bg-black p-2 text-white"),
  whiteHeading: cn("mt-2 text-white"),
  whiteCopy: cn("mt-4 text-white"),
  featureGrid: cn("mt-6 grid gap-4"),
  feature: cn("auth-feature rounded p-4"),
  panel: cn("auth-panel rounded bg-white p-4 text-black"),
  tabs: cn("flex items-center justify-between gap-4 rounded bg-black p-2"),
  tab: cn("auth-tab w-full rounded p-2 text-white"),
  panelContent: cn("mt-4"),
  sessionBadge: cn("rounded bg-brand-600 p-2 text-white"),
  dashboardCard: cn("rounded bg-black p-4 text-white"),
  dashboardBrandCard: cn("rounded bg-brand-600 p-4 text-white"),
  dashboardGrid: cn("mt-4 grid gap-4 md:grid-cols-2"),
  smallText: cn("mt-2"),
  logout: cn("mt-4 rounded bg-red-500 p-4 text-white hover:bg-red-500/50", "auth-button")
};

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

function statusMessage() {
  if (!state.status) {
    return "";
  }

  return `<p class="${styles.status}" data-kind="${state.status.kind}" role="alert">${escapeHtml(state.status.message)}</p>`;
}

function textField({ id, label, name = id, type = "text", placeholder, autocomplete, required = true }) {
  return `<label class="${styles.fieldLabel}" for="${id}">${label}
    <input class="${styles.input}" id="${id}" name="${name}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" ${required ? "required" : ""} />
  </label>`;
}

function passwordField() {
  const type = state.showPassword ? "text" : "password";
  const label = state.showPassword ? "Hide password" : "Show password";

  return `<label class="${styles.fieldLabel}" for="password">Password
    <div class="${styles.passwordRow}">
      <input class="${styles.input}" id="password" name="password" type="${type}" placeholder="••••••••" autocomplete="new-password" required />
      <button class="${styles.passwordToggle}" type="button" data-action="toggle-password">${label}</button>
    </div>
  </label>`;
}

function loginForm() {
  return `<form data-auth-form="login" novalidate>
    <p class="auth-kicker">Welcome back</p>
    <h1 class="auth-title">Sign in to your account</h1>
    <p class="auth-copy">Use the demo account or create a new account with the register form.</p>
    ${textField({ id: "email", label: "Email address", type: "email", placeholder: "you@example.com", autocomplete: "email" })}
    ${textField({ id: "password", label: "Password", type: "password", placeholder: "••••••••", autocomplete: "current-password" })}
    <p class="${styles.demo}">Demo: <strong>demo@example.com</strong> / <strong>password123</strong></p>
    ${statusMessage()}
    <button class="${styles.submit}" type="submit" ${state.pending ? "disabled" : ""}>${state.pending ? "Signing in…" : "Sign in"}</button>
    <p class="auth-copy">No account yet? <button class="auth-link" type="button" data-mode="register">Create one</button></p>
  </form>`;
}

function registerForm() {
  return `<form data-auth-form="register" novalidate>
    <p class="auth-kicker">New here?</p>
    <h1 class="auth-title">Create your account</h1>
    <p class="auth-copy">This form talks to the Bun mock REST API and stores users in memory.</p>
    ${textField({ id: "name", label: "Full name", placeholder: "Ada Lovelace", autocomplete: "name" })}
    ${textField({ id: "email", label: "Email address", type: "email", placeholder: "you@example.com", autocomplete: "email" })}
    ${passwordField()}
    ${textField({ id: "confirm-password", label: "Confirm password", name: "confirmPassword", type: "password", placeholder: "••••••••", autocomplete: "new-password" })}
    ${statusMessage()}
    <button class="${styles.submit}" type="submit" ${state.pending ? "disabled" : ""}>${state.pending ? "Creating account…" : "Create account"}</button>
    <p class="auth-copy">Already registered? <button class="auth-link" type="button" data-mode="login">Sign in</button></p>
  </form>`;
}

function authPage() {
  return `<section class="${styles.layout}">
    <aside class="${styles.aside}">
      <div class="${styles.row}">
        <span class="${styles.lightBadge}">utilitycss</span>
        <span class="${styles.darkBadge}">Bun demo</span>
     </div>
     <p class="auth-kicker mt-6">Full-stack example</p>
      <h2 class="${styles.whiteHeading}">Authentication components powered by Rust.</h2>
      <p class="${styles.whiteCopy}">The form UI is rendered in the browser, while Bun provides a tiny mock API for registration, login, sessions, and logout.</p>
      <div class="${styles.featureGrid}">
        <div class="${styles.feature}"><strong>Static extraction</strong><span>Utility classes in HTML and JavaScript are compiled at startup.</span></div>
        <div class="${styles.feature}"><strong>REST endpoints</strong><span>Try POST /api/auth/register, /login, and /logout in the browser.</span></div>
        <div class="${styles.feature}"><strong>In-memory sessions</strong><span>Restart Bun to reset the demo users and sessions.</span></div>
     </div>
   </aside>

    <section class="${styles.panel}">
      <div class="${styles.tabs}" role="tablist" aria-label="Authentication forms">
        <button class="${styles.tab}" type="button" role="tab" aria-selected="${state.mode === "login"}" data-mode="login">Sign in</button>
        <button class="${styles.tab}" type="button" role="tab" aria-selected="${state.mode === "register"}" data-mode="register">Register</button>
     </div>
      <div class="${styles.panelContent}">${state.mode === "login" ? loginForm() : registerForm()}</div>
   </section>
 </section>`;
}

function dashboard() {
  const name = escapeHtml(state.user.name);
  const email = escapeHtml(state.user.email);

  return `<section class="${styles.panel}">
    <div class="${styles.row}">
     <div><p class="auth-kicker">Authenticated</p><h1 class="auth-title">Welcome, ${name}</h1></div>
      <span class="${styles.sessionBadge}">session active</span>
   </div>
   <p class="auth-copy">You are signed in through the mock REST API. The session is held in an HttpOnly cookie.</p>
    <div class="${styles.dashboardGrid}">
      <article class="${styles.dashboardCard}"><p class="auth-kicker">Profile</p><p class="${styles.smallText}">${email}</p></article>
      <article class="${styles.dashboardBrandCard}"><p class="auth-kicker">Compiler</p><p class="${styles.smallText}">CSS generated by utilitycss</p></article>
   </div>
    <button class="${styles.logout}" type="button" data-action="logout">Sign out</button>
 </section>`;
}

function render() {
  root.innerHTML = state.user ? dashboard() : authPage();
  bindEvents();
}

function bindEvents() {
  root.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      state.pending = false;
      state.showPassword = false;
      state.status = null;
      render();
    });
  });

  root.querySelector("[data-action=toggle-password]")?.addEventListener("click", () => {
    state.showPassword = !state.showPassword;
    render();
  });

  root.querySelector("[data-auth-form]")?.addEventListener("submit", submitForm);
  root.querySelector("[data-action=logout]")?.addEventListener("click", logout);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(options.headers ?? {}) }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  return payload;
}

async function submitForm(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());

  if (state.mode === "register" && values.password !== values.confirmPassword) {
    state.status = { kind: "error", message: "Passwords do not match." };
    render();
    return;
  }

  delete values.confirmPassword;
  state.pending = true;
  state.status = null;
  render();

  try {
    const payload = await request(`/api/auth/${state.mode}`, {
      method: "POST",
      body: JSON.stringify(values)
    });
    state.user = payload.user;
    state.pending = false;
    state.status = { kind: "success", message: state.mode === "login" ? "Signed in successfully." : "Account created successfully." };
    render();
  } catch (error) {
    state.pending = false;
    state.status = { kind: "error", message: error instanceof Error ? error.message : "Something went wrong." };
    render();
  }
}

async function logout() {
  try {
    await request("/api/auth/logout", { method: "POST", body: "{}" });
  } finally {
    state.user = null;
    state.mode = "login";
    state.status = { kind: "success", message: "You have been signed out." };
    render();
  }
}

render();
request("/api/auth/me")
  .then(({ user }) => {
    state.user = user;
    render();
  })
  .catch(() => {
    // A 401 on the first request is expected when no session cookie exists.
  });
