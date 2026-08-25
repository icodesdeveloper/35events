import type { ReactNode } from "react";

// Wraps an icon-only trigger (link/button) with a hover/focus tooltip — icon
// buttons only had aria-label before, which screen readers announce but
// sighted users hovering never see. Pure CSS (group-hover/group-focus-within),
// no JS needed.
export default function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-zinc-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-white dark:text-zinc-900"
      >
        {label}
      </span>
    </span>
  );
}
