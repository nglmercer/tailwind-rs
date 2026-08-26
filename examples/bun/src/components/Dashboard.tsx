import { cn } from "../cn";
import { styles } from "../styles";
import type { PublicUser, Status } from "../types";
import { Icon } from "./Icon";
import { StatusBanner } from "./StatusBanner";

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <article className={cn(styles.metric, accent ? styles.metricAccent : styles.metricDefault)}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function Dashboard({ user, notice, onLogout }: { user: PublicUser; notice: Status | null; onLogout: () => void }) {
  return (
    <section className={styles.dashboardCard}>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">Workspace ready</span>
          <h1>Good to see you, {user.name.split(" ")[0]}.</h1>
          <p>{user.email} · authenticated with the Bun mock API</p>
        </div>
        <span className="session-pill"><span aria-hidden="true" /> session active</span>
      </div>
      <StatusBanner status={notice} />
      <div className={styles.metricsGrid}>
        <Metric accent detail="from this Preact module graph" label="Stylesheet" value="virtual.css" />
        <Metric detail="source modules in this build" label="Graph status" value="3 connected" />
        <Metric accent detail="compiler output is deterministic" label="Runtime" value="Bun HMR" />
        <Metric detail="no generated CSS file required" label="Cache" value="in memory" />
      </div>
      <div className="dashboard-lower">
        <div className={styles.activityCard}>
          <div className="activity-heading"><span className="eyebrow eyebrow-light">Latest compile</span><span>just now</span></div>
          <div className="compile-line"><span className="compile-check"><Icon name="check" /></span><code>src/app.tsx</code><span className="compile-tag">extracted</span></div>
          <div className="compile-line"><span className="compile-check"><Icon name="check" /></span><code>utilitycss</code><span className="compile-tag">generated</span></div>
          <div className="compile-line"><span className="compile-check"><Icon name="check" /></span><code>HMR boundary</code><span className="compile-tag">ready</span></div>
        </div>
        <div className={styles.nextCard}>
          <span className="eyebrow eyebrow-light">Keep exploring</span>
          <h2>Change a class in <code>app.tsx</code>.</h2>
          <p>Bun will rebuild the graph and utilitycss will regenerate this stylesheet without a second watcher.</p>
          <span className="next-hint"><Icon name="spark" /> Try <code>p-4</code> → <code>p-8</code></span>
        </div>
      </div>
      <button className={styles.logoutButton} onClick={onLogout} type="button">Sign out</button>
    </section>
  );
}
