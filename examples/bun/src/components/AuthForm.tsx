import { cn } from "../cn";
import { styles } from "../styles";
import type { AuthMode, FormSubmitEvent, Status } from "../types";
import { StatusBanner } from "./StatusBanner";
import { PasswordField, TextField } from "./FormFields";
import { Icon } from "./Icon";

type AuthFormProps = {
  mode: AuthMode;
  pending: boolean;
  showPassword: boolean;
  status: Status | null;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: FormSubmitEvent) => void;
  onTogglePassword: () => void;
};

export function AuthForm({ mode, pending, showPassword, status, onModeChange, onSubmit, onTogglePassword }: AuthFormProps) {
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

      <div className={styles.authTabs} role="tablist" aria-label="Authentication forms">
        {(["login", "register"] as const).map((tab) => (
          <button
            aria-selected={mode === tab}
            className={cn(styles.authTab, mode === tab && "auth-tab-active")}
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
        {!isLogin && <TextField autoComplete="name" id="name" label="Full name" placeholder="Ada Lovelace" />}
        <TextField autoComplete="email" id="email" label="Email address" placeholder="you@example.com" type="email" />
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
          <div className={styles.demoCredentials}>
            <span className="demo-label">Demo access</span>
            <code>demo@example.com</code>
            <span className="credential-divider">/</span>
            <code>password123</code>
          </div>
        )}

        <StatusBanner status={status} />
        <button className={styles.submitButton} disabled={pending} type="submit">
          {pending ? (isLogin ? "Opening workspace…" : "Creating workspace…") : isLogin ? "Enter workspace" : "Create workspace"}
          {!pending && <Icon name="arrow" />}
        </button>
      </form>

      <p className="form-footnote">
        {isLogin ? "New to the studio?" : "Already have an account?"}{" "}
        <button className={styles.actionLink} onClick={() => onModeChange(isLogin ? "register" : "login")} type="button">
          {isLogin ? "Create an account" : "Sign in instead"}
        </button>
      </p>
    </>
  );
}
