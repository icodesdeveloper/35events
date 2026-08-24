import RoadLineMotif from "@/components/public/RoadLineMotif";

export default function PublicFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 py-10">
      <RoadLineMotif className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full text-white opacity-[0.04]" />
      <div className="font-mono-label relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-[11px] text-white/40 md:px-8">
        <span>&copy; {new Date().getFullYear()} 35events</span>
        <span className="text-accent">Auto rondritten &amp; meets</span>
      </div>
    </footer>
  );
}
