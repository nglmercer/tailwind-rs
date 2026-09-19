export function PopoverDemo() {
  return (
    <div className="flex flex-wrap gap-8">
      <div className="relative">
        <button type="button" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">Default popover</button>
        <div className="popover"><div className="popover-header">Popover title</div><div className="popover-body">And here&apos;s some amazing content. It&apos;s very engaging.</div></div>
      </div>
      <div className="relative">
        <button type="button" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">Descriptive popover</button>
        <div className="popover"><div className="popover-body">Popover bodies can also stand alone when no title is needed.</div></div>
      </div>
    </div>
  );
}
