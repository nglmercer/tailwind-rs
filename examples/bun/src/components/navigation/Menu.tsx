import { Icon, type IconName } from "../ui/Icon.tsx";
import { cn } from "../../lib/cn.ts";

interface MenuEntry {
  readonly label: string;
  readonly icon: IconName;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly badge?: string;
}

const sections: readonly { title: string; entries: readonly MenuEntry[] }[] = [
  {
    title: "Workspace",
    entries: [
      { label: "Dashboard", icon: "home", active: true },
      { label: "Projects", icon: "dots", badge: "12" },
      { label: "Calendar", icon: "calendar" }
    ]
  },
  {
    title: "Account",
    entries: [
      { label: "Profile", icon: "user" },
      { label: "Billing", icon: "cart", disabled: true },
      { label: "Settings", icon: "settings" }
    ]
  }
];

/** Sectioned vertical menu with active, badge, and disabled states. */
export function MenuDemo() {
  return (
    <nav className="menu" aria-label="Workspace menu">
      {sections.map(section => (
        <div key={section.title}>
          <p className="menu-title">{section.title}</p>
          <ul className="menu-list">
            {section.entries.map(entry => (
              <li key={entry.label}>
                <a
                  href="#"
                  aria-current={entry.active ? "page" : undefined}
                  aria-disabled={entry.disabled || undefined}
                  onClick={entry.disabled ? event => event.preventDefault() : undefined}
                  className={cn("menu-item", entry.active && "menu-item-active", entry.disabled && "menu-item-disabled")}
                >
                  <Icon name={entry.icon} className="h-4 w-4" />
                  <span>{entry.label}</span>
                  {entry.badge ? <span className="menu-badge">{entry.badge}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
