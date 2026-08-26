import { render } from "preact";
import { useState } from "preact/hooks";
import type { ComponentChildren, JSX } from "preact";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type BadgeVariant = "success" | "warning" | "danger" | "neutral";
type IconName = "arrow" | "check" | "close" | "menu" | "spark" | "user";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "button button-primary",
  secondary: "button button-secondary",
  outline: "button button-outline",
  ghost: "button button-ghost",
  danger: "button button-danger"
};

const badgeStyles: Record<BadgeVariant, string> = {
  success: "badge badge-success",
  warning: "badge badge-warning",
  danger: "badge badge-danger",
  neutral: "badge badge-neutral"
};

type ButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  readonly variant?: ButtonVariant;
  readonly className?: string;
  readonly children?: ComponentChildren;
};

function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button {...props} className={`${buttonStyles[variant]} ${className}`.trim()}>
      {children}
    </button>
  );
}

function Badge({ variant, children }: { variant: BadgeVariant; children: ComponentChildren }) {
  return <span className={badgeStyles[variant]}>{children}</span>;
}

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ComponentChildren> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    spark: <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm6.5 11.5.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />,
    user: <path d="M19 21a7 7 0 0 0-14 0m7-11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
  };

  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  function showSavedToast() {
    setSaved(true);
    setToastVisible(true);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="page-width flex items-center justify-between px-4 py-4" aria-label="Main navigation">
          <a className="brand" href="#top">
            <span className="brand-mark">u</span>
            <span>
              <strong>utilitycss</strong>
              <small>component demo</small>
            </span>
          </a>

          <div className="desktop-nav hidden items-center gap-6 md:flex">
            <a className="nav-link" href="#buttons">Buttons</a>
            <a className="nav-link" href="#cards">Cards</a>
            <a className="nav-link" href="#forms">Forms</a>
            <a className="nav-link" href="#table">Table</a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="header-button hidden sm:inline-flex">View docs</Button>
            <button
              aria-expanded={menuOpen}
              aria-label="Toggle navigation"
              className="menu-button rounded-lg border border-gray-200 p-2 text-gray-600 md:hidden"
              onClick={() => setMenuOpen(value => !value)}
              type="button"
            >
              <Icon name="menu" />
            </button>
          </div>
        </nav>
        {menuOpen ? (
          <div className="mobile-nav border-t-1 border-gray-200 bg-white px-4 py-3 md:hidden">
            <a href="#buttons" onClick={() => setMenuOpen(false)}>Buttons</a>
            <a href="#cards" onClick={() => setMenuOpen(false)}>Cards</a>
            <a href="#forms" onClick={() => setMenuOpen(false)}>Forms</a>
            <a href="#table" onClick={() => setMenuOpen(false)}>Table</a>
          </div>
        ) : null}
      </header>

      <main id="top" className="page-width px-4 pb-16">
        <section className="hero-section grid gap-10 py-16 md:grid-cols-2 md:items-center">
          <div>
            <span className="eyebrow text-brand-700">Common UI patterns</span>
            <h1 className="mt-4 max-w-[40rem] text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              A small, useful component gallery.
            </h1>
            <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-gray-600">
              A practical Bun + Preact example inspired by Flowbite and daisyUI. Browse familiar
              building blocks and inspect the utility classes behind each one.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => document.querySelector("#buttons")?.scrollIntoView({ behavior: "smooth" })}>
                Browse components <Icon name="arrow" className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => setModalOpen(true)}>Open modal</Button>
            </div>
            <div className="hero-meta mt-8 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2"><span className="status-dot status-dot-green" /> Native Rust compiler</span>
              <span>·</span>
              <span>Preact + Bun HMR</span>
            </div>
          </div>

          <div className="hero-preview rounded-lg bg-gray-900 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow eyebrow-dark">Preview</span>
                <strong className="mt-2 block text-xl">Build with primitives</strong>
              </div>
              <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">Ready</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="preview-tile"><span className="text-2xl font-bold">24</span><small>components</small></div>
              <div className="preview-tile"><span className="text-2xl font-bold">100%</span><small>static classes</small></div>
            </div>
            <code className="demo-code demo-code-dark">rounded-lg bg-brand-600 px-4 py-2</code>
          </div>
        </section>

        <div className="alert-info" role="status">
          <Icon name="spark" className="mt-0.5 h-5 w-5 flex-none" />
          <p><strong>Built for quick starts.</strong> These examples use the same CSS-first theme and native utility compiler as a real Bun app.</p>
        </div>

        <section id="buttons" className="component-section">
          <div className="section-heading">
            <div><span className="eyebrow">01 / Actions</span><h2>Buttons & badges</h2></div>
            <p>Use clear hierarchy for primary, secondary, destructive, and quiet actions.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <article className="component-card">
              <div className="component-heading"><div><span className="eyebrow">Buttons</span><h3>Action variants</h3></div><span className="component-count">5 styles</span></div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button variant="primary"><Icon name="check" className="h-4 w-4" />Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Delete</Button>
                <Button disabled variant="primary">Disabled</Button>
              </div>
              <code className="demo-code">button button-primary</code>
            </article>

            <article className="component-card">
              <div className="component-heading"><div><span className="eyebrow">Badges</span><h3>Status labels</h3></div><span className="component-count">4 states</span></div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Badge variant="success">Published</Badge>
                <Badge variant="warning">Review</Badge>
                <Badge variant="danger">Failed</Badge>
                <Badge variant="neutral">Draft</Badge>
              </div>
              <div className="mt-8 flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                <span className="avatar avatar-small">AL</span>
                <div><strong className="block text-sm text-gray-900">Alex Lee</strong><span className="text-xs text-gray-500">Maintainer · 2 minutes ago</span></div>
                <Badge variant="success">Online</Badge>
              </div>
            </article>
          </div>
        </section>

        <section id="cards" className="component-section">
          <div className="section-heading">
            <div><span className="eyebrow">02 / Surfaces</span><h2>Cards & stats</h2></div>
            <p>Composable containers for products, profiles, notifications, and quick metrics.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="product-art flex aspect-video items-center justify-center bg-brand-600 text-white">
                <Icon name="spark" className="h-12 w-12" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-semibold uppercase tracking-wider text-brand-700">Starter kit</span><h3 className="mt-2 text-lg font-semibold text-gray-900">Launch faster</h3></div><Badge variant="success">New</Badge></div>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">A simple card pattern with media, metadata, and one clear action.</p>
                <Button variant="primary" className="mt-5 w-full">Get started <Icon name="arrow" className="h-4 w-4" /></Button>
              </div>
            </article>

            <article className="component-card">
              <div className="flex items-start justify-between gap-4"><div><span className="eyebrow">Profile</span><h3 className="mt-2 text-lg font-semibold text-gray-900">Team member</h3></div><button aria-label="More profile actions" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" type="button">•••</button></div>
              <div className="mt-6 flex items-center gap-4"><span className="avatar">JD</span><div><strong className="block text-base text-gray-900">Jordan Diaz</strong><span className="text-sm text-gray-500">Product designer</span></div></div>
              <div className="mt-6 grid grid-cols-2 gap-3"><div className="profile-stat"><strong>18</strong><small>projects</small></div><div className="profile-stat"><strong>4.9</strong><small>rating</small></div></div>
              <Button variant="outline" className="mt-5 w-full"><Icon name="user" className="h-4 w-4" />View profile</Button>
            </article>

            <article className="component-card">
              <div className="component-heading"><div><span className="eyebrow">Activity</span><h3>Recent updates</h3></div><Badge variant="neutral">Today</Badge></div>
              <div className="mt-5 space-y-4">
                <div className="activity-row"><span className="activity-icon activity-icon-green"><Icon name="check" className="h-4 w-4" /></span><div><strong>Build completed</strong><small>utilitycss-bun · 4 min ago</small></div></div>
                <div className="activity-row"><span className="activity-icon activity-icon-brand"><Icon name="spark" className="h-4 w-4" /></span><div><strong>Theme updated</strong><small>brand palette · 18 min ago</small></div></div>
                <div className="activity-row"><span className="activity-icon activity-icon-gray"><Icon name="user" className="h-4 w-4" /></span><div><strong>New teammate</strong><small>Jordan joined · 1 hr ago</small></div></div>
              </div>
            </article>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="stat-card"><span className="eyebrow">Deployments</span><strong>128</strong><small className="text-green-700">+12% this month</small></div>
            <div className="stat-card"><span className="eyebrow">Active users</span><strong>2,420</strong><small className="text-brand-700">+8.4% this month</small></div>
            <div className="stat-card"><span className="eyebrow">Error rate</span><strong>0.24%</strong><small className="text-gray-500">Within target</small></div>
          </div>
        </section>

        <section id="forms" className="component-section">
          <div className="section-heading">
            <div><span className="eyebrow">03 / Inputs</span><h2>Forms & feedback</h2></div>
            <p>Readable labels, useful help text, and clear confirmation states.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <form className="component-card" onSubmit={event => { event.preventDefault(); showSavedToast(); }}>
              <div className="component-heading"><div><span className="eyebrow">Form</span><h3>Contact details</h3></div><Badge variant={saved ? "success" : "neutral"}>{saved ? "Saved" : "Draft"}</Badge></div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="form-label">First name<input className="form-input" name="firstName" placeholder="Jordan" /></label>
                <label className="form-label">Last name<input className="form-input" name="lastName" placeholder="Diaz" /></label>
              </div>
              <label className="form-label mt-4">Email address<input className="form-input" name="email" placeholder="jordan@example.com" type="email" /><span className="form-help">We will only use this for account updates.</span></label>
              <label className="form-label mt-4">Message<textarea className="form-input" name="message" placeholder="Tell us what you are building…" rows={3} /></label>
              <label className="checkbox-row mt-4"><input className="h-4 w-4 rounded border-gray-300 text-brand-600" type="checkbox" defaultChecked /> <span>Send me occasional product updates</span></label>
              <div className="mt-6 flex flex-wrap items-center gap-3"><Button type="submit">Save changes</Button><Button type="button" variant="ghost" onClick={() => setSaved(false)}>Reset</Button></div>
            </form>

            <div className="space-y-6">
              <div className="component-card-dark rounded-lg p-6 shadow-sm"><span className="eyebrow eyebrow-dark">Empty state</span><h3 className="mt-3 text-xl font-semibold">Nothing here yet</h3><p className="mt-2 max-w-[24rem] text-sm leading-relaxed text-gray-300">When a list has no results, explain why and give people one helpful next step.</p><Button variant="secondary" className="mt-6" onClick={() => setToastVisible(true)}>Create first item <Icon name="arrow" className="h-4 w-4" /></Button></div>
              <div className="component-card"><span className="eyebrow">Inline feedback</span><div className="mt-4 space-y-3"><div className="alert-success"><Icon name="check" className="h-5 w-5 flex-none" /><span>Your changes were saved successfully.</span></div><div className="alert-warning"><span className="alert-mark">!</span><span>Your trial ends in 3 days.</span></div><div className="alert-danger"><span className="alert-mark">×</span><span>We could not connect to the server.</span></div></div></div>
            </div>
          </div>
        </section>

        <section id="table" className="component-section">
          <div className="section-heading">
            <div><span className="eyebrow">04 / Data</span><h2>Table & modal</h2></div>
            <p>Common patterns for compact data views and focused actions.</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-1 border-gray-200 p-5"><div><h3 className="text-lg font-semibold text-gray-900">Recent deployments</h3><p className="mt-1 text-sm text-gray-500">A small responsive data table.</p></div><Button variant="outline" onClick={() => setModalOpen(true)}>New deployment</Button></div>
            <div className="overflow-auto"><table className="w-full table-auto text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-3 font-semibold">Project</th><th className="px-5 py-3 font-semibold">Branch</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Updated</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody><tr className="border-b-1 border-gray-100"><td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">utilitycss-site</td><td className="px-5 py-4 font-mono text-xs text-gray-500">main</td><td className="px-5 py-4"><Badge variant="success">Ready</Badge></td><td className="px-5 py-4 text-gray-500">2 min ago</td><td className="px-5 py-4 text-right"><Button className="button-small" variant="ghost">View</Button></td></tr><tr className="border-b-1 border-gray-100"><td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">docs-preview</td><td className="px-5 py-4 font-mono text-xs text-gray-500">feat/docs</td><td className="px-5 py-4"><Badge variant="warning">Building</Badge></td><td className="px-5 py-4 text-gray-500">8 min ago</td><td className="px-5 py-4 text-right"><Button className="button-small" variant="ghost">View</Button></td></tr><tr><td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">component-kit</td><td className="px-5 py-4 font-mono text-xs text-gray-500">fix/buttons</td><td className="px-5 py-4"><Badge variant="danger">Failed</Badge></td><td className="px-5 py-4 text-gray-500">21 min ago</td><td className="px-5 py-4 text-right"><Button className="button-small" variant="ghost">View</Button></td></tr></tbody></table></div>
          </div>
        </section>
      </main>

      <footer className="site-footer page-width px-4"><span>utilitycss / bun example</span><span>common components · deterministic CSS · native Rust compiler</span></footer>

      {toastVisible ? <div className="toast" role="status"><span className="toast-icon"><Icon name="check" className="h-4 w-4" /></span><div><strong>{saved ? "Changes saved" : "Item ready"}</strong><span>{saved ? "Your form is up to date." : "This is a simple toast notification."}</span></div><button aria-label="Dismiss notification" className="toast-close" onClick={() => setToastVisible(false)} type="button"><Icon name="close" className="h-4 w-4" /></button></div> : null}

      {modalOpen ? <div className="modal-backdrop" role="presentation" onClick={() => setModalOpen(false)}><div aria-labelledby="modal-title" aria-modal="true" className="modal-card" onClick={event => event.stopPropagation()} role="dialog"><button aria-label="Close modal" className="modal-close" onClick={() => setModalOpen(false)} type="button"><Icon name="close" className="h-5 w-5" /></button><span className="eyebrow text-brand-700">Modal dialog</span><h2 className="mt-3 text-2xl font-bold text-gray-900" id="modal-title">Create a deployment</h2><p className="mt-3 text-sm leading-relaxed text-gray-600">This focused surface is useful for confirmations, short forms, and important decisions.</p><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => { setModalOpen(false); setToastVisible(true); }}>Continue <Icon name="arrow" className="h-4 w-4" /></Button></div></div></div> : null}
    </div>
  );
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("Bun example is missing the #app mount point.");
}

render(<App />, root);
