import { useState } from "preact/hooks";
import { Icon } from "./Icon.tsx";
import { Badge } from "./Badge.tsx";
import { Button } from "./Button.tsx";

export function FormsDemo() {
  const [saved, setSaved] = useState(false);
  const [toggle, setToggle] = useState(true);
  const [range, setRange] = useState(42);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="component-card" onSubmit={e => { e.preventDefault(); setSaved(true); }}>
        <div className="component-heading"><div><span className="eyebrow">Form</span><h3>Contact details</h3></div><Badge variant={saved ? "success" : "neutral"}>{saved ? "Saved" : "Draft"}</Badge></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="form-label">First name<input className="form-input" name="firstName" placeholder="Jordan" /></label>
          <label className="form-label">Last name<input className="form-input" name="lastName" placeholder="Diaz" /></label>
        </div>
        <label className="form-label mt-4">Email address<input className="form-input" name="email" placeholder="jordan@example.com" type="email" /><span className="form-help">We will only use this for account updates.</span></label>
        <label className="form-label mt-4">Category
          <select className="form-input form-select"><option>Design</option><option>Engineering</option><option>Marketing</option></select>
        </label>
        <label className="form-label mt-4">Message<textarea className="form-input" name="message" placeholder="Tell us what you are building…" rows={3} /></label>
        <div className="mt-4 space-y-2">
          <label className="checkbox-row"><input className="h-4 w-4 rounded border-gray-300 text-brand-600" type="checkbox" defaultChecked /> <span>Send me product updates</span></label>
          <label className="checkbox-row"><input className="h-4 w-4 rounded border-gray-300 text-brand-600" type="radio" name="plan" defaultChecked /> <span>Pro plan</span></label>
          <label className="checkbox-row"><input className="h-4 w-4 rounded border-gray-300 text-brand-600" type="radio" name="plan" /> <span>Starter plan</span></label>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <span className="text-sm font-medium text-gray-700">Enable notifications</span>
          <button type="button" aria-pressed={toggle} onClick={() => setToggle(v => !v)} className={`toggle ${toggle ? "toggle-checked" : ""}`}><span className="toggle-knob" /></button>
        </div>
        <label className="form-label mt-4">Upload file<input className="form-input form-file" type="file" /></label>
        <label className="form-label mt-4">Volume: {range}<input className="range-input mt-2 w-full" type="range" min={0} max={100} value={range} onInput={e => setRange(Number((e.target as HTMLInputElement).value))} /></label>
        <div className="relative mt-4">
          <label className="form-label">Search<input className="form-input pl-10" placeholder="Search components…" /></label>
          <Icon name="search" className="pointer-events-none absolute left-3 top-9 h-4 w-4 text-gray-400" />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3"><Button type="submit">Save changes</Button><Button type="button" variant="ghost" onClick={() => setSaved(false)}>Reset</Button></div>
      </form>

      <div className="space-y-6">
        <div className="component-card-dark rounded-lg p-6 shadow-sm"><span className="eyebrow eyebrow-dark">Empty state</span><h3 className="mt-3 text-xl font-semibold">Nothing here yet</h3><p className="mt-2 max-w-[24rem] text-sm leading-relaxed text-gray-300">When a list has no results, explain why and give one helpful next step.</p><Button variant="secondary" className="mt-6">Create first item <Icon name="arrow" className="h-4 w-4" /></Button></div>
        <div className="component-card"><span className="eyebrow">Inline feedback</span><div className="mt-4 space-y-3"><div className="alert-success-card"><Icon name="check" className="h-5 w-5 flex-none" /><span>Your changes were saved.</span></div><div className="alert-warning-card"><span className="alert-mark">!</span><span>Your trial ends in 3 days.</span></div><div className="alert-danger-card"><span className="alert-mark">×</span><span>We could not connect.</span></div></div></div>
      </div>
    </div>
  );
}
