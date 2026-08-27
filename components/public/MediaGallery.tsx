"use client";

import { useState } from "react";
import type { VisibleMediaSection } from "@/lib/media";
import VideoPlayer from "@/components/public/VideoPlayer";
import MediaLightbox from "@/components/public/MediaLightbox";

function Tile({ src, isVideo, onClick }: { src: string; isVideo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group aspect-square w-full overflow-hidden rounded-lg bg-zinc-900"
    >
      {isVideo ? (
        <VideoPlayer src={src} autoPlayMuted className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- served via app/api/media
        <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      )}
    </button>
  );
}

export default function MediaGallery({ sections }: { sections: VisibleMediaSection[] }) {
  const [open, setOpen] = useState<{ sectionId: string; index: number } | null>(null);

  if (sections.length === 0) return null;

  const highlights = sections.filter((s) => s.isHighlight);
  const regular = sections.filter((s) => !s.isHighlight);
  const openSection = sections.find((s) => s.id === open?.sectionId);

  return (
    <div className="mt-12 border-t border-white/10 pt-10">
      <h2 className="font-display mb-6 text-xl font-medium text-white">Media</h2>

      {highlights.map((section) => (
        <div key={section.id} className="mb-10">
          <p className="font-mono-label text-accent mb-3 text-xs">{section.title}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.media.map((item, index) => (
              <Tile
                key={item.id}
                src={`/api/media/${item.filePath}`}
                isVideo={item.type === "VIDEO"}
                onClick={() => setOpen({ sectionId: section.id, index })}
              />
            ))}
          </div>
        </div>
      ))}

      {regular.map((section) => (
        <div key={section.id} className="mb-10">
          {section.title ? <p className="mb-3 text-sm font-medium text-white/70">{section.title}</p> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {section.media.map((item, index) => (
              <Tile
                key={item.id}
                src={`/api/media/${item.filePath}`}
                isVideo={item.type === "VIDEO"}
                onClick={() => setOpen({ sectionId: section.id, index })}
              />
            ))}
          </div>
        </div>
      ))}

      {open && openSection ? (
        <MediaLightbox
          media={openSection.media}
          initialIndex={open.index}
          canDownload={openSection.canDownloadSection}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
