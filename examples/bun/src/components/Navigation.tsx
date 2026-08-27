import { useState } from "preact/hooks";
import { Icon } from "./Icon.tsx";
import { Tabs } from "./ui/Tabs.tsx";

export function BreadcrumbDemo() {
  return (
    <nav aria-label="Breadcrumb" className="rounded-lg bg-gray-50 px-4 py-3">
      <ol className="flex items-center gap-2 text-sm">
        <li><a className="inline-flex items-center gap-1 font-medium text-gray-700 hover:text-brand-600" href="#"><Icon name="home" className="h-4 w-4" />Home</a></li>
        <li className="flex items-center gap-2"><Icon name="chevron-right" className="h-3 w-3 text-gray-400" /><a className="font-medium text-gray-700 hover:text-brand-600" href="#">Projects</a></li>
        <li className="flex items-center gap-2"><Icon name="chevron-right" className="h-3 w-3 text-gray-400" /><span className="font-medium text-gray-500" aria-current="page">utilitycss</span></li>
      </ol>
    </nav>
  );
}

export function PaginationDemo() {
  return (
    <nav aria-label="Page navigation" className="flex items-center justify-between">
      <span className="text-sm text-gray-700">Showing <strong>1–10</strong> of <strong>45</strong></span>
      <div className="inline-flex -space-x-px rounded-lg border border-gray-200 bg-white">
        <a className="pagination-link pagination-link-first" href="#">Previous</a>
        <a className="pagination-link pagination-link-active" href="#" aria-current="page">1</a>
        <a className="pagination-link" href="#">2</a>
        <a className="pagination-link" href="#">3</a>
        <a className="pagination-link pagination-link-last" href="#">Next</a>
      </div>
    </nav>
  );
}

export function TabsDemo() {
  const tabs = [
    { value: "profile", label: "Profile" },
    { value: "dashboard", label: "Dashboard" },
    { value: "settings", label: "Settings" },
    { value: "contacts", label: "Contacts" }
  ];
  const [active, setActive] = useState("dashboard");
  return (
    <div className="w-full">
      <Tabs idPrefix="navigation-demo" value={active} onChange={setActive} items={tabs} variant="border" ariaLabel="Navigation demo tabs" />
      <div className="rounded-b-lg border border-gray-200 bg-white p-4 text-sm text-gray-600" id={`navigation-demo-panel-${active}`} role="tabpanel" aria-labelledby={`navigation-demo-tab-${active}`}>Content for <strong>{tabs.find(tab => tab.value === active)?.label}</strong> — Flowbite tabs replicated with utilitycss utilities + tiny state.</div>
    </div>
  );
}

export function NavbarDemo() {
  return (
    <nav className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <a className="flex items-center gap-2 font-bold text-gray-900" href="#"><span className="brand-mark h-8 w-8 text-sm">u</span>utilitycss</a>
      <div className="hidden items-center gap-6 md:flex">
        <a className="nav-link" href="#">Home</a><a className="nav-link" href="#">About</a><a className="nav-link" href="#">Services</a><a className="nav-link" href="#">Contact</a>
      </div>
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="button">Get started</button>
    </nav>
  );
}

export function SidebarDemo() {
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white">
      <aside className="hidden w-56 border border-gray-200 bg-gray-50 p-4 md:block">
        <ul className="space-y-2 text-sm">
          <li><a className="sidebar-link sidebar-link-active" href="#"><Icon name="home" className="h-4 w-4" />Dashboard</a></li>
          <li><a className="sidebar-link" href="#"><Icon name="search" className="h-4 w-4" />Search</a></li>
          <li><a className="sidebar-link" href="#"><Icon name="user" className="h-4 w-4" />Users</a></li>
          <li><a className="sidebar-link" href="#"><Icon name="settings" className="h-4 w-4" />Settings</a></li>
        </ul>
      </aside>
      <div className="flex-1 p-6"><p className="text-sm text-gray-600">Sidebar + content — Flowbite sidebar layout using flex utilities only.</p></div>
    </div>
  );
}

export function StepperDemo() {
  return (
    <ol className="flex items-center gap-4">
      {[
        { label: "Cart", done: true },
        { label: "Checkout", done: true },
        { label: "Payment", active: true },
        { label: "Review", done: false }
      ].map(s => (
        <li key={s.label} className="flex items-center gap-2">
          <span className={`step-dot ${s.done ? "step-dot-done" : s.active ? "step-dot-active" : "step-dot-idle"}`}>{s.done ? <Icon name="check" className="h-3 w-3" /> : s.label[0]}</span>
          <span className={`text-sm font-medium ${s.active ? "text-brand-700" : "text-gray-500"}`}>{s.label}</span>
          <span className="hidden h-0.5 w-8 bg-gray-200 md:block" />
        </li>
      ))}
    </ol>
  );
}
