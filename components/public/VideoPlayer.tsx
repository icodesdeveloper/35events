"use client";

import { useEffect, useRef } from "react";
import "plyr/dist/plyr.css";

export default function VideoPlayer({
  src,
  className,
  autoPlayMuted = false,
}: {
  src: string;
  className?: string;
  // Preview mode for grid tiles / highlight hero — muted, looping, no
  // controls, just a moving preview (click-through handled by the parent).
  autoPlayMuted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (autoPlayMuted) return; // Plyr's own controls aren't needed for a bare preview loop

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
  }, [autoPlayMuted]);

  if (autoPlayMuted) {
    return (
      <video
        ref={videoRef}
        src={src}
        className={className}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
      />
    );
  }

  return <video ref={videoRef} src={src} className={className} playsInline preload="metadata" controls />;
}
