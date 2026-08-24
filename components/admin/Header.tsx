"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faChevronRight, faBell } from "@fortawesome/free-solid-svg-icons";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { adminSignOut } from "@/lib/auth/actions";

function pageTitleFor(pathname: string): string {
  if (pathname === "/admin") return "Dashboard";
  if (pathname === "/admin/events") return "Events";
  if (pathname === "/admin/events/new") return "Nieuw event";
  if (/^\/admin\/events\/[^/]+\/edit$/.test(pathname)) return "Event bewerken";
  if (/^\/admin\/events\/[^/]+\/media$/.test(pathname)) return "Media";
  if (/^\/admin\/events\/[^/]+\/registrations$/.test(pathname)) return "Registraties";
  return "Admin";
}

export default function Header({
  onToggleSidebar,
  userLabel,
  pendingCount,
}: {
  onToggleSidebar: () => void;
  userLabel: string;
  pendingCount: number;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const initials = userLabel.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 md:px-8">
      <div className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Menu wisselen"
          className="mr-3 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-400 dark:hover:bg-zinc-700 dark:hover:text-white md:hidden"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        <span>Beheer</span>
        <FontAwesomeIcon icon={faChevronRight} className="mx-3 text-[10px] text-slate-300 dark:text-slate-600" />
        <span className="text-zinc-900 dark:text-white">{pageTitleFor(pathname)}</span>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/admin/events"
          className="relative text-slate-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
          aria-label={`${pendingCount} registraties in afwachting van betaling`}
          title={`${pendingCount} registratie${pendingCount === 1 ? "" : "s"} in afwachting van betaling`}
        >
          <FontAwesomeIcon icon={faBell} />
          {pendingCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          ) : null}
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-medium text-zinc-600 transition-colors hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700"
          >
            {initials}
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
              <div className="px-4 py-1.5 text-sm text-slate-700 dark:text-slate-300">{userLabel}</div>
              <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
              <div className="px-4 py-2">
                <div className="mb-2 text-sm text-slate-700 dark:text-slate-300">Weergave</div>
                <ThemeToggle />
              </div>
              <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
              <form action={adminSignOut}>
                <button
                  type="submit"
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50 dark:text-red-400 dark:hover:bg-zinc-800"
                >
                  Uitloggen
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
