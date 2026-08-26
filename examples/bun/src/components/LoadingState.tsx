import { styles } from "../styles";
import { Icon } from "./Icon";

export function LoadingState() {
  return (
    <section className={styles.loadingCard} aria-live="polite">
      <span className="loading-mark"><Icon name="spark" /></span>
      <span className="eyebrow">Connecting to the mock API</span>
      <h1>Loading your workspace…</h1>
    </section>
  );
}
