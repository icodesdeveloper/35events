"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import ConfirmDialogProvider from "@/components/admin/ConfirmDialogProvider";

export default function AdminShell({
  userLabel,
  pendingCount,
  children,
}: {
  userLabel: string;
  pendingCount: number;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // min-h-dvh (not min-h-full) so this actually reaches the full viewport
    // height on short pages (e.g. the dashboard) — min-h-full only measures
    // against the parent chain's own height, which collapses to short
    // content, leaving the sidebar looking cut off with body's bg showing
    // below it. md:flex's default align-items:stretch then makes Sidebar's
    // md:static <aside> match this container's height automatically.
    <ConfirmDialogProvider>
      <div className="min-h-dvh bg-[#FAFAFA] dark:bg-zinc-950 md:flex">
        {sidebarOpen ? (
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <Sidebar open={sidebarOpen} />

        <div className="flex min-h-full flex-1 flex-col">
          <Header
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            userLabel={userLabel}
            pendingCount={pendingCount}
          />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </ConfirmDialogProvider>
  );
}
