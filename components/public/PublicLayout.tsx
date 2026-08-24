import type { ReactNode } from "react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    // The public site is always dark — no light/auto toggle, unlike /admin —
    // so this "dark" class is load-bearing, not decorative: it's what makes
    // every dark: utility below actually apply, regardless of the shared
    // theme preference (see lib/theme.ts) that only /admin still honors.
    <div className="dark flex min-h-full flex-col bg-zinc-950 text-zinc-100">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
