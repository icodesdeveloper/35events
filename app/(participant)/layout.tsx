import type { ReactNode } from "react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export default function ParticipantLayout({ children }: { children: ReactNode }) {
  return (
    // Same forced-dark wrapper as components/public/PublicLayout.tsx — the
    // participant pages are part of the front site, not /admin.
    <div className="dark flex min-h-full flex-col bg-zinc-950 text-zinc-100">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
