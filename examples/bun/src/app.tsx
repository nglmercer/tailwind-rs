import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { JSX } from "preact";
import { request } from "./api";
import { Brand } from "./components/Brand";
import { AuthScreen } from "./components/AuthScreen";
import { Dashboard } from "./components/Dashboard";
import { LoadingState } from "./components/LoadingState";
import type { AuthMode, AuthResponse, FormSubmitEvent, PublicUser, Status } from "./types";

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

  async function submit(event: FormSubmitEvent) {
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
