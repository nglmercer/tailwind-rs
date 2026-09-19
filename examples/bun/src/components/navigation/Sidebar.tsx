import { Icon } from "../ui/Icon.tsx";

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
