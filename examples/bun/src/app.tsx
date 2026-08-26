import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { JSX } from "preact";

type AuthMode = "login" | "register";
type StatusKind = "error" | "success";

type PublicUser = {
  id: string;
  name: string;
  email: string;
};

type Status = {
  kind: StatusKind;
  message: string;
};

type ApiError = {
  error?: string;
};

type AuthResponse = {
  user: PublicUser;
};

type IconName = "arrow" | "check" | "eye" | "lock" | "spark" | "wave";

const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers
  });
  const payload = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  return payload;
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, JSX.Element> = {
    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    eye: (
      <>
        <path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
        <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
      </>
    ),
    wave: (
      <>
        <path d="M3 7c3-3 5 3 8 0s5 3 10 0" />
        <path d="M3 12c3-3 5 3 8 0s5 3 10 0" />
        <path d="M3 17c3-3 5 3 8 0s5 3 10 0" />
      </>
    )
  };

  return (
    <svg aria-hidden="true" className="icon" fill="none" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="utilitycss home">
      <span className="brand-mark">u</span>
      <span>
        <strong>utilitycss</strong>
        <small>compiler studio</small>
      </span>
    </a>
  );
}

function StatusBanner({ status }: { status: Status | null }) {
  if (!status) {
    return null;
  }

  return (
    <p className={cn("status-banner rounded p-4", status.kind === "error" ? "status-error" : "status-success")} role="alert">
      <span className="status-dot" aria-hidden="true" />
      {status.message}
    </p>
  );
}

type TextFieldProps = {
  autoComplete: string;
  id: string;
  label: string;
  name?: string;
  placeholder: string;
  type?: "email" | "password" | "text";
};

function TextField({ autoComplete, id, label, name = id, placeholder, type = "text" }: TextFieldProps) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        autoComplete={autoComplete}
        className="field-input w-full rounded p-4 text-black"
        id={id}
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}

function PasswordField({ autoComplete, showPassword, onToggle }: { autoComplete: string; showPassword: boolean; onToggle: () => void }) {
  return (
    <label className="field" htmlFor="password">
      <span className="field-label">Password</span>
      <span className="password-input-row flex items-center gap-2">
        <input
          autoComplete={autoComplete}
          className="field-input w-full rounded p-4 text-black"
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          type={showPassword ? "text" : "password"}
        />
        <button
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="icon-button rounded bg-black p-2 text-white"
          onClick={onToggle}
          type="button"
        >
          <Icon name="eye" />
        </button>
      </span>
    </label>
  );
}

function AuthForm({
  mode,
  pending,
  showPassword,
  status,
  onModeChange,
  onSubmit,
  onTogglePassword
}: {
  mode: AuthMode;
  pending: boolean;
  showPassword: boolean;
  status: Status | null;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: JSX.TargetedEvent<HTMLFormElement, SubmitEvent>) => void;
  onTogglePassword: () => void;
}) {
  const isLogin = mode === "login";

  return (
    <>
      <div className="form-heading">
        <span className="eyebrow">{isLogin ? "Welcome back" : "Start building"}</span>
        <h2>{isLogin ? "Your next interface starts here." : "Create your workspace."}</h2>
        <p>
          {isLogin
            ? "Sign in to continue to your private compiler workspace."
            : "A tiny full-stack demo showing Bun, Preact, and a Rust-powered CSS pipeline."}
        </p>
      </div>

      <div className="auth-tabs flex items-center gap-2" role="tablist" aria-label="Authentication forms">
        {(["login", "register"] as const).map((tab) => (
          <button
            aria-selected={mode === tab}
            className={cn("auth-tab rounded p-2", mode === tab && "auth-tab-active")}
            key={tab}
            onClick={() => onModeChange(tab)}
            role="tab"
            type="button"
          >
            {tab === "login" ? "Sign in" : "Register"}
          </button>
        ))}
      </div>

      <form className="auth-form" noValidate onSubmit={onSubmit}>
        {!isLogin && (
          <TextField autoComplete="name" id="name" label="Full name" placeholder="Ada Lovelace" />
        )}
        <TextField
          autoComplete="email"
          id="email"
          label="Email address"
          placeholder="you@example.com"
          type="email"
        />
        <PasswordField autoComplete={isLogin ? "current-password" : "new-password"} showPassword={showPassword} onToggle={onTogglePassword} />
        {!isLogin && (
          <TextField
            autoComplete="new-password"
            id="confirm-password"
            label="Confirm password"
            name="confirmPassword"
            placeholder="Repeat your password"
            type="password"
          />
        )}

        {isLogin && (
          <div className="demo-credentials mt-2 rounded bg-black p-4 text-white">
            <span className="demo-label">Demo access</span>
            <code>demo@example.com</code>
            <span className="credential-divider">/</span>
            <code>password123</code>
          </div>
        )}

        <StatusBanner status={status} />
        <button className="submit-button mt-4 w-full rounded bg-brand-600 p-4 text-white hover:bg-red-500/50" disabled={pending} type="submit">
          {pending ? (isLogin ? "Opening workspace…" : "Creating workspace…") : isLogin ? "Enter workspace" : "Create workspace"}
          {!pending && <Icon name="arrow" />}
        </button>
      </form>

      <p className="form-footnote">
        {isLogin ? "New to the studio?" : "Already have an account?"}{" "}
        <button className="action-link" onClick={() => onModeChange(isLogin ? "register" : "login")} type="button">
          {isLogin ? "Create an account" : "Sign in instead"}
        </button>
      </p>
    </>
  );
}

function FlowStep({ icon, label, detail, number }: { icon: IconName; label: string; detail: string; number: string }) {
  return (
    <div className="flow-step">
      <span className="flow-number">{number}</span>
      <span className="flow-icon"><Icon name={icon} /></span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

function HeroPanel() {
  return (
    <aside className="hero-card rounded bg-brand-600 p-4">
      <div className="hero-card-top">
        <span className="pill pill-light">Bun + Preact</span>
        <span className="live-pill"><span aria-hidden="true" /> live demo</span>
      </div>
      <div className="hero-copy max-w-[42rem]">
        <span className="eyebrow eyebrow-light">A full-stack compiler playground</span>
        <h1>Build interfaces that feel <em>instant.</em></h1>
        <p>
          This example uses Bun's module graph to feed a Preact app into the Rust compiler. Edit a
          component, and the virtual stylesheet follows it through HMR.
        </p>
      </div>
      <div className="flow-card">
        <FlowStep detail="HTML, TSX, and framework files" icon="wave" label="Source graph" number="01" />
        <FlowStep detail="fresh compiler per build cycle" icon="spark" label="Rust semantics" number="02" />
        <FlowStep detail="virtual utilitycss module" icon="check" label="Live stylesheet" number="03" />
      </div>
      <div className="class-preview" aria-label="Classes extracted from this page">
        <span className="class-preview-dot" />
        <code>grid gap-4 md:grid-cols-2</code>
        <span className="preview-arrow">→</span>
        <code>.css</code>
      </div>
    </aside>
  );
}

function AuthScreen({
  mode,
  pending,
  showPassword,
  status,
  onModeChange,
  onSubmit,
  onTogglePassword
}: {
  mode: AuthMode;
  pending: boolean;
  showPassword: boolean;
  status: Status | null;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: JSX.TargetedEvent<HTMLFormElement, SubmitEvent>) => void;
  onTogglePassword: () => void;
}) {
  return (
    <section className="auth-layout grid gap-4 md:grid-cols-2">
      <HeroPanel />
      <section className="auth-card rounded bg-white p-4 text-black">
        <div className="secure-note"><Icon name="lock" /> Session-safe by default</div>
        <AuthForm
          mode={mode}
          onModeChange={onModeChange}
          onSubmit={onSubmit}
          onTogglePassword={onTogglePassword}
          pending={pending}
          showPassword={showPassword}
          status={status}
        />
      </section>
    </section>
  );
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <article className={cn("metric-card rounded p-4", accent ? "metric-accent bg-brand-600 text-white" : "bg-black text-white")}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Dashboard({ user, notice, onLogout }: { user: PublicUser; notice: Status | null; onLogout: () => void }) {
  return (
    <section className="dashboard-card rounded bg-white p-4 text-black">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">Workspace ready</span>
          <h1>Good to see you, {user.name.split(" ")[0]}.</h1>
          <p>{user.email} · authenticated with the Bun mock API</p>
        </div>
        <span className="session-pill"><span aria-hidden="true" /> session active</span>
      </div>
      <StatusBanner status={notice} />
      <div className="metrics-grid grid gap-4 md:grid-cols-2">
        <Metric accent detail="from this Preact module graph" label="Stylesheet" value="virtual.css" />
        <Metric detail="source modules in this build" label="Graph status" value="3 connected" />
        <Metric accent detail="compiler output is deterministic" label="Runtime" value="Bun HMR" />
        <Metric detail="no generated CSS file required" label="Cache" value="in memory" />
      </div>
      <div className="dashboard-lower">
        <div className="activity-card rounded bg-black p-4 text-white">
          <div className="activity-heading"><span className="eyebrow eyebrow-light">Latest compile</span><span>just now</span></div>
          <div className="compile-line"><span className="compile-check"><Icon name="check" /></span><code>src/app.tsx</code><span className="compile-tag">extracted</span></div>
          <div className="compile-line"><span className="compile-check"><Icon name="check" /></span><code>utilitycss</code><span className="compile-tag">generated</span></div>
          <div className="compile-line"><span className="compile-check"><Icon name="check" /></span><code>HMR boundary</code><span className="compile-tag">ready</span></div>
        </div>
        <div className="next-card rounded bg-brand-600 p-4 text-white">
          <span className="eyebrow eyebrow-light">Keep exploring</span>
          <h2>Change a class in <code>app.tsx</code>.</h2>
          <p>Bun will rebuild the graph and utilitycss will regenerate this stylesheet without a second watcher.</p>
          <span className="next-hint"><Icon name="spark" /> Try <code>p-4</code> → <code>p-8</code></span>
        </div>
      </div>
      <button className="logout-button mt-4 rounded p-4" onClick={onLogout} type="button">Sign out</button>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="loading-card rounded bg-white p-4 text-black" aria-live="polite">
      <span className="loading-mark"><Icon name="spark" /></span>
      <span className="eyebrow">Connecting to the mock API</span>
      <h1>Loading your workspace…</h1>
    </section>
  );
}

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    request<{ user: PublicUser }>("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        // A 401 is expected before the first sign-in.
      })
      .finally(() => {
        if (active) {
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPending(false);
    setShowPassword(false);
    setStatus(null);
  }

  async function submit(event: JSX.TargetedEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const values = Object.fromEntries(
      Array.from(new FormData(event.currentTarget).entries(), ([key, value]) => [key, String(value)])
    ) as Record<string, string>;

    if (mode === "register" && values.password !== values.confirmPassword) {
      setStatus({ kind: "error", message: "Passwords do not match." });
      return;
    }

    delete values.confirmPassword;
    setPending(true);
    setStatus(null);

    try {
      const payload = await request<AuthResponse>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(values)
      });
      setUser(payload.user);
      setStatus({ kind: "success", message: mode === "login" ? "Signed in successfully." : "Workspace created successfully." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    try {
      await request("/api/auth/logout", { method: "POST", body: "{}" });
    } finally {
      setUser(null);
      setMode("login");
      setStatus({ kind: "success", message: "You have been signed out." });
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="backdrop-grid" aria-hidden="true" />
      <div className="app-container">
        <header className="topbar">
          <Brand />
          <div className="topbar-meta">
            <span className="runtime-pill"><span className="runtime-dot" /> Bun runtime</span>
            <span className="topbar-divider" aria-hidden="true" />
            <span className="topbar-caption">preact / HMR / Rust</span>
          </div>
        </header>
        <div className="page-kicker"><span>01</span><span>Build surface</span><span className="kicker-line" /></div>
        {checkingSession ? <LoadingState /> : user ? <Dashboard notice={status} onLogout={logout} user={user} /> : <AuthScreen mode={mode} onModeChange={changeMode} onSubmit={submit} onTogglePassword={() => setShowPassword((value) => !value)} pending={pending} showPassword={showPassword} status={status} />}
        <footer className="footer"><span>utilitycss / bun example</span><span>virtual CSS · no watcher · deterministic output</span></footer>
      </div>
    </div>
  );
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("Bun example is missing the #app mount point.");
}

render(<App />, root);
