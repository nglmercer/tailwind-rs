import { useState } from "preact/hooks";
import { Icon } from "../ui/Icon.tsx";
import { Button } from "./Button.tsx";

export function DropdownDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <Button variant="outline" onClick={() => setOpen(v => !v)}>Dropdown <Icon name="chevron-down" className="h-4 w-4" /></Button>
      {open ? (
        <div className="dropdown-menu">
          <a className="dropdown-item" href="#">Dashboard</a>
          <a className="dropdown-item" href="#">Settings</a>
          <a className="dropdown-item" href="#">Earnings</a>
          <div className="my-1 border border-gray-100" />
          <a className="dropdown-item dropdown-item-danger" href="#">Sign out</a>
        </div>
      ) : null}
    </div>
  );
}
