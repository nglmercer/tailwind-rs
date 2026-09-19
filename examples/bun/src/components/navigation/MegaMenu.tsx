import { useState } from "preact/hooks";
import { Icon } from "../ui/Icon.tsx";
import { cn } from "../../lib/cn.ts";

const columns: readonly { title: string; links: readonly string[] }[] = [
  { title: "Build", links: ["CLI", "Watch mode", "CI recipes"] },
  { title: "Integrate", links: ["Bun plugin", "Vite plugin", "Node adapter"] },
  { title: "Learn", links: ["Class DSL", "Theming", "Migration guide"] }
];

/** Navbar entry that opens a full-width multi-column panel. */
export function MegaMenuDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="megamenu-frame">
      <nav className="megamenu-bar" aria-label="Site">
        <a className="megamenu-brand" href="#"><span className="brand-mark h-8 w-8 text-sm">u</span>utilitycss</a>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
          className={cn("megamenu-trigger", open && "megamenu-trigger-open")}
        >
          Documentation
          <Icon name="chevron-down" className={cn("h-4 w-4", open && "rotate-180")} />
        </button>
        <a className="nav-link" href="#">Changelog</a>
      </nav>
      {open ? (
        <div className="megamenu-panel">
          {columns.map(column => (
            <div key={column.title}>
              <p className="megamenu-title">{column.title}</p>
              <ul className="megamenu-links">
                {column.links.map(link => (
                  <li key={link}><a href="#">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
