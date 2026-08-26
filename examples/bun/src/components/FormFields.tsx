import { styles } from "../styles";
import { Icon } from "./Icon";

type TextFieldProps = {
  autoComplete: string;
  id: string;
  label: string;
  name?: string;
  placeholder: string;
  type?: "email" | "password" | "text";
};

export function TextField({ autoComplete, id, label, name = id, placeholder, type = "text" }: TextFieldProps) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        autoComplete={autoComplete}
        className={styles.fieldInput}
        id={id}
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}

export function PasswordField({ autoComplete, showPassword, onToggle }: { autoComplete: string; showPassword: boolean; onToggle: () => void }) {
  return (
    <label className="field" htmlFor="password">
      <span className="field-label">Password</span>
      <span className={styles.passwordRow}>
        <input
          autoComplete={autoComplete}
          className={styles.fieldInput}
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          type={showPassword ? "text" : "password"}
        />
        <button
          aria-label={showPassword ? "Hide password" : "Show password"}
          className={styles.iconButton}
          onClick={onToggle}
          type="button"
        >
          <Icon name="eye" />
        </button>
      </span>
    </label>
  );
}
