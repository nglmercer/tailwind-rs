import { Icon } from "./Icon.tsx";

export function ProgressDemo() {
  return (
    <div className="space-y-4">
      <div className="w-full rounded-full bg-gray-200"><div className="progress-bar progress-bar-45">45%</div></div>
      <div className="w-full rounded-full bg-gray-200"><div className="progress-bar progress-bar-70 bg-green-600">70%</div></div>
      <div className="w-full rounded-full bg-gray-200"><div className="progress-bar progress-bar-striped">Striped</div></div>
      <div className="flex gap-2 text-xs font-medium text-gray-600"><span>Default</span><span>·</span><span>Sizes: sm / md / lg via height utilities</span></div>
    </div>
  );
}

export function SpinnerDemo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="spinner spinner-sm" aria-label="Loading" />
      <span className="spinner" aria-label="Loading" />
      <span className="spinner spinner-lg" aria-label="Loading" />
      <span className="inline-flex items-center gap-2 text-sm text-gray-600"><span className="spinner spinner-sm" />Loading…</span>
    </div>
  );
}

export function SkeletonDemo() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-3/4 rounded bg-gray-200" />
      <div className="h-4 rounded bg-gray-200" />
      <div className="h-4 w-5/6 rounded bg-gray-200" />
      <div className="flex items-center gap-3 pt-2">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2"><div className="h-3 rounded bg-gray-200" /><div className="h-3 w-3/4 rounded bg-gray-200" /></div>
      </div>
    </div>
  );
}

export function RatingDemo() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => <Icon key={n} name="star" className={`h-5 w-5 ${n <= 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}
        <span className="ml-2 text-sm font-medium text-gray-700">4.0 out of 5</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600"><span>95 reviews</span><span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Excellent</span></div>
    </div>
  );
}

export function TimelineDemo() {
  return (
    <ol className="timeline">
      <li className="timeline-item"><span className="timeline-dot"><Icon name="calendar" className="h-4 w-4" /></span><div className="timeline-content"><time className="text-xs text-gray-500">Jan 13, 2024</time><h4 className="text-sm font-semibold text-gray-900">Flowbite Application UI v2.0.0</h4><p className="text-sm text-gray-600">Get access to over 20+ pages with Figma and code.</p></div></li>
      <li className="timeline-item"><span className="timeline-dot"><Icon name="check" className="h-4 w-4" /></span><div className="timeline-content"><time className="text-xs text-gray-500">Dec 7, 2023</time><h4 className="text-sm font-semibold text-gray-900">Marketing UI code in Flowbite</h4></div></li>
      <li className="timeline-item"><span className="timeline-dot timeline-dot-last"><Icon name="clock" className="h-4 w-4" /></span><div className="timeline-content"><time className="text-xs text-gray-500">Dec 2, 2023</time><h4 className="text-sm font-semibold text-gray-900">utilitycss parity added</h4></div></li>
    </ol>
  );
}

export function ToastDemo() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <span className="toast-icon"><Icon name="check" className="h-4 w-4" /></span>
      <div className="text-sm"><strong className="block text-gray-900">Item moved successfully.</strong><span className="text-gray-500">You can undo this action.</span></div>
      <button type="button" className="ml-auto text-sm font-semibold text-brand-600 hover:text-brand-700">Undo</button>
    </div>
  );
}

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
