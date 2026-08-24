// Thin viewfinder-style corner marks, overlaid on hero/event photography as
// the site's recurring "telemetry" accent. Parent must be `relative`.
export default function CornerBrackets({
  className = "",
  inset = 16,
  size = 22,
}: {
  className?: string;
  inset?: number;
  size?: number;
}) {
  const corners = [
    { style: { top: inset, left: inset }, d: "M22 1H1V22" },
    { style: { top: inset, right: inset }, d: "M0 1H21V22" },
    { style: { bottom: inset, left: inset }, d: "M22 21H1V0" },
    { style: { bottom: inset, right: inset }, d: "M0 21H21V0" },
  ];

  return (
    <div className={`text-accent pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {corners.map((corner) => (
        <svg
          key={corner.d}
          className="absolute"
          style={{ ...corner.style, width: size, height: size }}
          viewBox="0 0 22 22"
          fill="none"
        >
          <path d={corner.d} stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ))}
    </div>
  );
}
