import { Icon } from "../ui/Icon.tsx";

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
