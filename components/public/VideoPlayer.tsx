"use client";

import { useEffect, useRef } from "react";
import "plyr/dist/plyr.css";

export default function VideoPlayer({
  src,
  poster,
  className,
}: {
  src: string;
  // Video's own poster frame (see lib/storage/deriveVideo.ts) — shown before
  // playback so nothing but a WebP still is fetched until the viewer hits
  // play, which is what `preload="none"` below relies on.
  poster?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Plyr touches `document` at module-load time, so it can only be
    // imported client-side — a static top-level import crashes SSR since
    // this component's module still executes on the server for the initial
    // render, even though it's a client component.
    let player: import("plyr") | undefined;
    let cancelled = false;
    import("plyr").then(({ default: Plyr }) => {
      if (cancelled || !videoRef.current) return;
      player = new Plyr(videoRef.current, {
        controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "fullscreen"],
      });
    });
    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className={className}
      playsInline
      // With a poster there is nothing to gain from fetching metadata up
      // front, and plenty to lose — this is what keeps a gallery from
      // touching the video files at all until someone plays one.
      preload={poster ? "none" : "metadata"}
      controls
    />
  );
}
