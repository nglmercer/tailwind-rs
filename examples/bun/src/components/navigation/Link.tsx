/** Inline link styles for body copy, navigation, and hover-only emphasis. */
export function LinkDemo() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-700">
      <p>
        A <a className="link" href="#">default link</a> inherits the surrounding text style and only
        shows its affordance <a className="link link-hover" href="#">on hover</a>.
      </p>
      <p className="flex flex-wrap items-center gap-4">
        <a className="link link-primary" href="#">Primary link</a>
        <a className="link link-neutral" href="#">Neutral link</a>
        <a className="link link-accent" href="#">Accent link</a>
      </p>
      <p>
        Links stay readable inside prose: read the <a className="link link-primary" href="#">compiler pipeline</a> guide
        before changing adapter behavior.
      </p>
    </div>
  );
}
