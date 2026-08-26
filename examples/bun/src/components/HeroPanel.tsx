import { styles } from "../styles";
import type { IconName } from "../types";
import { Icon } from "./Icon";

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

export function HeroPanel() {
  return (
    <aside className={styles.heroCard}>
      <div className="hero-card-top">
        <span className="pill pill-light">Bun + Preact</span>
        <span className="live-pill"><span aria-hidden="true" /> live demo</span>
      </div>
      <div className={styles.heroCopy}>
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
