import { styles } from "../styles";
import type { AuthMode, FormSubmitEvent, Status } from "../types";
import { AuthForm } from "./AuthForm";
import { HeroPanel } from "./HeroPanel";
import { Icon } from "./Icon";

type AuthScreenProps = {
  mode: AuthMode;
  pending: boolean;
  showPassword: boolean;
  status: Status | null;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: FormSubmitEvent) => void;
  onTogglePassword: () => void;
};

export function AuthScreen(props: AuthScreenProps) {
  return (
    <section className={styles.authLayout}>
      <HeroPanel />
      <section className={styles.authCard}>
        <div className="secure-note"><Icon name="lock" /> Session-safe by default</div>
        <AuthForm {...props} />
      </section>
    </section>
  );
}
