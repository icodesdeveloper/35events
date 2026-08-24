import HeroContent from "@/components/public/HeroContent";
import RoadLineMotif from "@/components/public/RoadLineMotif";

// Full-bleed hero. Reads HERO_VIDEO_SRC (server-only env, embedded
// straight into the rendered <video> src — no client JS needed) so real
// rolling-shot footage can be dropped in later without touching this
// component; until then it falls back to an animated gradient "graphic"
// as a stand-in.
const HERO_VIDEO_SRC = process.env.HERO_VIDEO_SRC;

export default function HeroVideo() {
  return (
    <section className="relative flex h-[85vh] min-h-[560px] items-end overflow-hidden bg-zinc-950 text-white">
      {HERO_VIDEO_SRC ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={HERO_VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <div className="hero-gradient-fallback absolute inset-0" aria-hidden />
      )}

      <RoadLineMotif className="absolute inset-x-0 bottom-0 h-1/2 w-full text-white opacity-[0.08]" />

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-zinc-950/10" />

      <HeroContent />
    </section>
  );
}
