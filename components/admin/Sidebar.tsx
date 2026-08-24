"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faCalendarDays,
  faCreditCard,
  faArrowRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { adminSignOut } from "@/lib/auth/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: faGaugeHigh, exact: true },
  { href: "/admin/events", label: "Events", icon: faCalendarDays, exact: false },
  { href: "/admin/payments", label: "Betalingen", icon: faCreditCard, exact: false },
];

export default function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      id="admin-sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900 md:static md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <Link href="/admin" className="mt-2 mb-4 flex min-h-16 items-center px-6 transition-opacity hover:opacity-80">
        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white shadow-sm dark:bg-white dark:text-zinc-900">
          35
        </div>
        <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
          35events admin
        </span>
      </Link>

      <div className="mb-2 px-4 text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
        Beheer
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-zinc-900 dark:text-slate-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="mr-2 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-zinc-800">
        <form action={adminSignOut}>
          <button
            type="submit"
            className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white"
          >
            <FontAwesomeIcon icon={faArrowRightFromBracket} className="mr-2 w-5" />
            Uitloggen
          </button>
        </form>
      </div>
    </aside>
  );
}
