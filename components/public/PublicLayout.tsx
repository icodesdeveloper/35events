import type { ReactNode } from "react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    // The public site is always dark — no light/auto toggle, unlike /admin —
    // so this "dark" class is load-bearing, not decorative: it's what makes
    // every dark: utility below actually apply, regardless of the shared
    // theme preference (see lib/theme.ts) that only /admin still honors.
    //
    // min-h-dvh (not min-h-full) is deliberate too: this div's height would
    // otherwise resolve as a percentage against <body>, which doesn't
    // reliably propagate through the flex chain — on a short page that left
    // <body>'s own (light-mode) background exposed below this div.
    <div className="dark flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
