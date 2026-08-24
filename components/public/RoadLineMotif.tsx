// Signature decorative motif for the public site — a faint converging
// road/apex line, reused across the hero, section dividers and footer.
// Uses currentColor so callers tint it via a text-* utility class.
export default function RoadLineMotif({ className = "" }: { className?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
      <path d="M0 200 L200 0 L400 200" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M0 200 L120 0" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="6 10" />
      <path d="M400 200 L280 0" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="6 10" />
    </svg>
  );
}
