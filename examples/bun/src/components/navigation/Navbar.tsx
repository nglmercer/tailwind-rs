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
