"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";

// The desktop nav is `hidden md:flex`; this is its below-md counterpart —
// without it a phone gets no navigation at all (no way to reach /media).
export default function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation — the panel would otherwise stay open over the new
  // page, since the header isn't remounted between route changes. Adjusted
  // during render rather than in an effect (same pattern as
  // SortableMediaGrid), which avoids a cascading second render.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Menu sluiten" : "Menu openen"}
        className="hover:border-accent hover:text-accent flex h-9 w-9 items-center justify-center border border-white/20 text-white transition-colors"
      >
        <FontAwesomeIcon icon={open ? faXmark : faBars} className="h-4 w-4" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 top-16 bottom-0 z-30 cursor-default bg-zinc-950/60 backdrop-blur-sm"
          />
          <nav
            id="mobile-nav-panel"
            className="fixed inset-x-0 top-16 z-40 border-b border-white/10 bg-zinc-950/95 backdrop-blur-md"
          >
            <ul className="mx-auto max-w-6xl px-4 py-2">
              {links.map((link) => (
                <li key={link.href} className="border-b border-white/5 last:border-b-0">
                  <Link
                    href={link.href}
                    className={`font-mono-label block py-4 text-sm transition-colors ${
                      pathname === link.href ? "text-accent" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      ) : null}
    </div>
  );
}
