import type { JSX } from "preact";
import type { IconName } from "../types";

export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, JSX.Element> = {
    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    eye: (
      <>
        <path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
        <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
      </>
    ),
    wave: (
      <>
        <path d="M3 7c3-3 5 3 8 0s5 3 10 0" />
        <path d="M3 12c3-3 5 3 8 0s5 3 10 0" />
        <path d="M3 17c3-3 5 3 8 0s5 3 10 0" />
      </>
    )
  };

  return (
    <svg aria-hidden="true" className="icon" fill="none" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}
