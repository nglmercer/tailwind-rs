import { render } from "preact";
import { useState } from "preact/hooks";

import { Icon } from "./components/Icon.tsx";
import { BadgeDemo } from "./components/Badge.tsx";
import { Button, ButtonGroupDemo, ButtonSizesDemo, ButtonWithIconsDemo } from "./components/Button.tsx";
import { AlertDemo, BannerDemo } from "./components/Alert.tsx";
import { Accordion } from "./components/Accordion.tsx";
import { AvatarDemo } from "./components/Avatar.tsx";
import { CardDemo, HorizontalCardDemo, JumbotronDemo, PricingCardDemo } from "./components/Card.tsx";
import { FormsDemo } from "./components/Forms.tsx";
import { BreadcrumbDemo, NavbarDemo, PaginationDemo, SidebarDemo, StepperDemo, TabsDemo } from "./components/Navigation.tsx";
import { CarouselDemo } from "./components/Carousel.tsx";
import { DrawerDemo, DropdownDemo, ModalDemo, PopoverDemo } from "./components/Overlays.tsx";
import { ListGroupDemo, ProgressDemo, RatingDemo, SkeletonDemo, SpinnerDemo, TimelineDemo, ToastDemo } from "./components/Feedback.tsx";
import { TableSection } from "./components/TableSection.tsx";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  function showToast() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2800);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="page-width flex items-center justify-between px-4 py-4" aria-label="Main navigation">
          <a className="brand" href="#top">
            <span className="brand-mark">u</span>
            <span>
              <strong>utilitycss</strong>
              <small>Flowbite parity demo</small>
            </span>
          </a>
          <div className="desktop-nav hidden items-center gap-6 md:flex">
            <a className="nav-link" href="#actions">Actions</a>
            <a className="nav-link" href="#surfaces">Surfaces</a>
            <a className="nav-link" href="#navigation">Navigation</a>
            <a className="nav-link" href="#forms">Forms</a>
            <a className="nav-link" href="#feedback">Feedback</a>
            <a className="nav-link" href="#data">Data</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="header-button hidden sm:inline-flex">View docs</Button>
            <button aria-expanded={menuOpen} aria-label="Toggle navigation" className="menu-button rounded-lg border border-gray-200 p-2 text-gray-600 md:hidden" onClick={() => setMenuOpen(v => !v)} type="button">
              <Icon name="menu" />
            </button>
          </div>
        </nav>
        {menuOpen ? (
          <div className="mobile-nav border-t-1 border-gray-200 bg-white px-4 py-3 md:hidden">
            <a href="#actions" onClick={() => setMenuOpen(false)}>Actions</a>
            <a href="#surfaces" onClick={() => setMenuOpen(false)}>Surfaces</a>
            <a href="#navigation" onClick={() => setMenuOpen(false)}>Navigation</a>
            <a href="#forms" onClick={() => setMenuOpen(false)}>Forms</a>
            <a href="#feedback" onClick={() => setMenuOpen(false)}>Feedback</a>
            <a href="#data" onClick={() => setMenuOpen(false)}>Data</a>
          </div>
        ) : null}
      </header>

      <main id="top" className="page-width px-4 pb-16">
        <section className="hero-section grid gap-10 py-16 md:grid-cols-2 md:items-center">
          <div>
            <span className="eyebrow text-brand-700">Flowbite + daisyUI parity</span>
            <h1 className="mt-4 max-w-[40rem] text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">Every common component, deterministic CSS.</h1>
            <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-gray-600">
              A Bun + Preact gallery that replicates Flowbite and daisyUI patterns using the native Rust <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">utilitycss</code> compiler — scanner → parser → theme → utilities → variants → CSS IR.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => document.querySelector("#actions")?.scrollIntoView({ behavior: "smooth" })}>Browse components <Icon name="arrow" className="h-4 w-4" /></Button>
              <Button variant="ghost" onClick={() => setModalOpen(true)}>Open modal</Button>
              <Button variant="outline" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            </div>
            <div className="hero-meta mt-8 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2"><span className="status-dot status-dot-green" /> Native Rust compiler</span>
              <span>·</span>
              <span>Preact + Bun HMR</span>
              <span>·</span>
              <span>38 components</span>
            </div>
          </div>
          <div className="hero-preview rounded-lg bg-gray-900 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div><span className="eyebrow eyebrow-dark">Preview</span><strong className="mt-2 block text-xl">Build with primitives</strong></div>
              <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">Ready</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="preview-tile"><span className="text-2xl font-bold">38</span><small>components</small></div>
              <div className="preview-tile"><span className="text-2xl font-bold">100%</span><small>static classes</small></div>
            </div>
            <code className="demo-code demo-code-dark">rounded-lg bg-brand-600 px-4 py-2 hover:bg-brand-700</code>
          </div>
        </section>

        {bannerVisible ? <div className="mt-6"><BannerDemo onDismiss={() => setBannerVisible(false)} /></div> : null}

        <div className="alert-info mt-8" role="status">
          <Icon name="spark" className="mt-0.5 h-5 w-5 flex-none" />
          <p><strong>Parity note:</strong> Class names and visuals mirror Flowbite/daisyUI, but styles are emitted by utilitycss via <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">@apply</code> and utilities — not Tailwind at runtime.</p>
        </div>

        {/* 01 Actions */}
        <section id="actions" className="component-section">
          <div className="section-heading"><div><span className="eyebrow">01 / Actions</span><h2>Buttons, groups & dropdowns</h2></div><p>Hierarchy, sizes, icons, and grouped actions.</p></div>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="component-card">
              <div className="component-heading"><div><span className="eyebrow">Buttons</span><h3>Action variants</h3></div><span className="component-count">6 variants</span></div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button><Icon name="check" className="h-4 w-4" />Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Delete</Button>
                <Button variant="success">Success</Button>
              </div>
              <div className="mt-6"><ButtonSizesDemo /></div>
              <code className="demo-code">button button-primary · button-sm · button-lg</code>
            </article>
            <article className="component-card">
              <div className="component-heading"><div><span className="eyebrow">Extensions</span><h3>With icons & groups</h3></div><span className="component-count">Flowbite</span></div>
              <div className="mt-6 space-y-4">
                <ButtonWithIconsDemo />
                <ButtonGroupDemo />
              </div>
              <code className="demo-code">button-group · button-group-item</code>
            </article>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <article className="component-card">
              <span className="eyebrow">Dropdown</span><h3 className="mt-2 text-lg font-semibold text-gray-900">Interactive menu</h3>
              <div className="mt-4"><DropdownDemo /></div>
              <p className="mt-3 text-sm text-gray-500">State managed in Preact; styles are static utilities.</p>
            </article>
            <article className="component-card">
              <span className="eyebrow">Popover & tooltip</span><h3 className="mt-2 text-lg font-semibold text-gray-900">Floating UI</h3>
              <div className="mt-4"><PopoverDemo /></div>
            </article>
          </div>
        </section>

        {/* 02 Surfaces */}
        <section id="surfaces" className="component-section">
          <div className="section-heading"><div><span className="eyebrow">02 / Surfaces</span><h2>Cards, pricing & jumbotron</h2></div><p>Composable containers for commerce and marketing.</p></div>
          <CardDemo />
          <div className="mt-6"><PricingCardDemo /></div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <HorizontalCardDemo />
            <CarouselDemo />
          </div>
          <div className="mt-6"><JumbotronDemo /></div>
        </section>

        {/* 03 Data display */}
        <section id="display" className="component-section">
          <div className="section-heading"><div><span className="eyebrow">03 / Display</span><h2>Badges, avatars & accordion</h2></div><p>Status, identity, and disclosure patterns.</p></div>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="component-card"><div className="component-heading"><div><span className="eyebrow">Badges</span><h3>Status labels</h3></div><span className="component-count">6 variants</span></div><div className="mt-6"><BadgeDemo /></div><code className="demo-code">badge badge-success · badge-dot</code></article>
            <article className="component-card"><div className="component-heading"><div><span className="eyebrow">Avatar</span><h3>Identity</h3></div><span className="component-count">Stacked</span></div><div className="mt-6"><AvatarDemo /></div></article>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="component-card"><span className="eyebrow">Accordion</span><h3 className="mt-2 text-lg font-semibold text-gray-900">Disclosure</h3><div className="mt-4"><Accordion /></div></article>
            <article className="component-card"><span className="eyebrow">List group</span><h3 className="mt-2 text-lg font-semibold text-gray-900">Menu list</h3><div className="mt-4"><ListGroupDemo /></div></article>
          </div>
        </section>

        {/* 04 Navigation */}
        <section id="navigation" className="component-section">
          <div className="section-heading"><div><span className="eyebrow">04 / Navigation</span><h2>Navbar, tabs & pagination</h2></div><p>Wayfinding and content switching.</p></div>
          <div className="space-y-6">
            <NavbarDemo />
            <BreadcrumbDemo />
            <TabsDemo />
            <PaginationDemo />
            <SidebarDemo />
            <div className="component-card"><span className="eyebrow">Stepper</span><h3 className="mt-2 text-base font-semibold text-gray-900">Progress steps</h3><div className="mt-4"><StepperDemo /></div></div>
          </div>
        </section>

        {/* 05 Forms */}
        <section id="forms" className="component-section">
          <div className="section-heading"><div><span className="eyebrow">05 / Forms</span><h2>Inputs & validation</h2></div><p>All native controls with utilitycss styling.</p></div>
          <FormsDemo />
        </section>

        {/* 06 Feedback */}
        <section id="feedback" className="component-section">
          <div className="section-heading"><div><span className="eyebrow">06 / Feedback</span><h2>Alerts, progress & ratings</h2></div><p>Communicate status and progress.</p></div>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="component-card"><span className="eyebrow">Alerts</span><h3 className="mt-2 text-lg font-semibold text-gray-900">Contextual feedback</h3><div className="mt-4"><AlertDemo /></div></article>
            <div className="space-y-6">
              <article className="component-card"><span className="eyebrow">Progress</span><h3 className="mt-2 font-semibold text-gray-900">Bars</h3><div className="mt-4"><ProgressDemo /></div></article>
              <article className="component-card"><span className="eyebrow">Spinner</span><h3 className="mt-2 font-semibold text-gray-900">Loading</h3><div className="mt-4"><SpinnerDemo /></div></article>
            </div>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <article className="component-card"><span className="eyebrow">Rating</span><div className="mt-4"><RatingDemo /></div></article>
            <article className="component-card"><span className="eyebrow">Skeleton</span><div className="mt-4"><SkeletonDemo /></div></article>
            <article className="component-card"><span className="eyebrow">Toast</span><div className="mt-4"><ToastDemo /></div><Button variant="outline" className="mt-4" onClick={showToast}>Show toast</Button></article>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="component-card"><span className="eyebrow">Timeline</span><h3 className="mt-2 font-semibold text-gray-900">Changelog</h3><div className="mt-4"><TimelineDemo /></div></article>
            <div className="space-y-6">
              <div className="stat-card"><span className="eyebrow">Deployments</span><strong>128</strong><small className="text-green-700">+12% this month</small></div>
              <div className="stat-card"><span className="eyebrow">Active users</span><strong>2,420</strong><small className="text-brand-700">+8.4% this month</small></div>
            </div>
          </div>
        </section>

        {/* 07 Data */}
        <section id="data" className="component-section">
          <div className="section-heading"><div><span className="eyebrow">07 / Data</span><h2>Table</h2></div><p>Compact data with actions.</p></div>
          <TableSection onNew={() => setModalOpen(true)} />
        </section>
      </main>

      <footer className="site-footer page-width px-4"><span>utilitycss / bun example</span><span>Flowbite 1:1 visual · daisyUI-inspired · deterministic CSS</span></footer>

      {toastVisible ? <div className="toast" role="status"><span className="toast-icon"><Icon name="check" className="h-4 w-4" /></span><div><strong>Changes saved</strong><span>Your demo action succeeded.</span></div><button aria-label="Dismiss" className="toast-close" onClick={() => setToastVisible(false)} type="button"><Icon name="close" className="h-4 w-4" /></button></div> : null}
      <ModalDemo open={modalOpen} onClose={() => setModalOpen(false)} />
      <DrawerDemo open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Bun example is missing the #app mount point.");
render(<App />, root);
