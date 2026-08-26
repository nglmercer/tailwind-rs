import { cn } from "./cn";

/** Reusable utility recipes kept in source modules for deterministic extraction. */
export const styles = {
  actionLink: "action-link",
  authCard: cn("auth-card rounded bg-white p-4 text-black"),
  authLayout: cn("auth-layout grid gap-4 md:grid-cols-2"),
  authTab: cn("auth-tab rounded p-2"),
  authTabs: cn("auth-tabs flex items-center gap-2"),
  activityCard: cn("activity-card rounded bg-black p-4 text-white"),
  dashboardCard: cn("dashboard-card rounded bg-white p-4 text-black"),
  demoCredentials: cn("demo-credentials mt-2 rounded bg-black p-4 text-white"),
  fieldInput: cn("field-input w-full rounded p-4 text-black"),
  heroCard: cn("hero-card rounded bg-brand-600 p-4"),
  heroCopy: cn("hero-copy max-w-[42rem]"),
  iconButton: cn("icon-button rounded bg-black p-2 text-white"),
  loadingCard: cn("loading-card rounded bg-white p-4 text-black"),
  metric: cn("metric-card rounded p-4"),
  metricAccent: cn("metric-accent bg-brand-600 text-white"),
  metricDefault: cn("bg-black text-white"),
  nextCard: cn("next-card rounded bg-brand-600 p-4 text-white"),
  passwordRow: cn("password-input-row flex items-center gap-2"),
  statusBanner: cn("status-banner rounded p-4"),
  submitButton: cn("submit-button mt-4 w-full rounded bg-brand-600 p-4 text-white hover:bg-red-500/50"),
  logoutButton: cn("logout-button mt-4 rounded p-4"),
  metricsGrid: cn("metrics-grid grid gap-4 md:grid-cols-2")
} as const;
