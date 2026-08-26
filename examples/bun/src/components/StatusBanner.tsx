import { cn } from "../cn";
import { styles } from "../styles";
import type { Status } from "../types";

export function StatusBanner({ status }: { status: Status | null }) {
  if (!status) {
    return null;
  }

  return (
    <p className={cn(styles.statusBanner, status.kind === "error" ? "status-error" : "status-success")} role="alert">
      <span className="status-dot" aria-hidden="true" />
      {status.message}
    </p>
  );
}
