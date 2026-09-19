import { Icon } from "../ui/Icon.tsx";

export function ListGroupDemo() {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      <a className="list-group-item list-group-item-active" href="#"><Icon name="user" className="h-4 w-4" />Profile</a>
      <a className="list-group-item" href="#"><Icon name="settings" className="h-4 w-4" />Settings</a>
      <a className="list-group-item" href="#"><Icon name="mail" className="h-4 w-4" />Messages <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">3</span></a>
      <a className="list-group-item" href="#"><Icon name="bell" className="h-4 w-4" />Notifications</a>
    </div>
  );
}
