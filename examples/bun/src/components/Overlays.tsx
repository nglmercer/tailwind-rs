import { useState } from "preact/hooks";
import { Icon } from "./Icon.tsx";
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

export function PopoverDemo() {
  return (
    <div className="flex flex-wrap gap-8">
      <div className="relative">
        <button type="button" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">Default popover</button>
        <div className="popover"><div className="popover-header">Popover title</div><div className="popover-body">And here's some amazing content. It's very engaging.</div></div>
      </div>
      <span className="tooltip">Tooltip on hover<span className="tooltip-arrow" /></span>
    </div>
  );
}

export function ModalDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div aria-labelledby="modal-title" aria-modal="true" className="modal-card" onClick={e => e.stopPropagation()} role="dialog">
        <button aria-label="Close modal" className="modal-close" onClick={onClose} type="button"><Icon name="close" className="h-5 w-5" /></button>
        <span className="eyebrow text-brand-700">Modal dialog</span>
        <h2 className="mt-3 text-2xl font-bold text-gray-900" id="modal-title">Create a deployment</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">This focused surface is useful for confirmations, short forms, and important decisions.</p>
        <div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={onClose}>Continue <Icon name="arrow" className="h-4 w-4" /></Button></div>
      </div>
    </div>
  );
}

export function DrawerDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border border-gray-200 p-4"><h3 className="text-base font-semibold text-gray-900">Drawer</h3><button type="button" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={onClose}><Icon name="close" className="h-4 w-4" /></button></div>
        <div className="p-4 text-sm text-gray-600">Flowbite drawer replicated with fixed positioning and utilitycss utilities. No extra JS for styles.</div>
      </div>
    </div>
  );
}
