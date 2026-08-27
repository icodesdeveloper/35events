"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faChevronLeft, faChevronRight, faDownload } from "@fortawesome/free-solid-svg-icons";
import type { EventMedia } from "@prisma/client";
import VideoPlayer from "@/components/public/VideoPlayer";

export default function MediaLightbox({
  media,
  initialIndex,
  canDownload,
  onClose,
}: {
  media: EventMedia[];
  initialIndex: number;
  canDownload: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const item = media[index];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((i) => (i - 1 + media.length) % media.length);
      if (event.key === "ArrowRight") setIndex((i) => (i + 1) % media.length);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [media.length, onClose]);

  if (!item) return null;
  const src = `/api/media/${item.filePath}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex items-center justify-end gap-2 p-4">
        {canDownload ? (
          <a
            href={`${src}?download=1`}
            download
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Downloaden"
          >
            <FontAwesomeIcon icon={faDownload} className="h-5 w-5" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Sluiten"
        >
          <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
        {media.length > 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + media.length) % media.length)}
            className="absolute left-2 z-10 rounded-full p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:left-6"
            aria-label="Vorige"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-5 w-5" />
          </button>
        ) : null}

        {item.type === "VIDEO" ? (
          <VideoPlayer key={item.id} src={src} className="max-h-full max-w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- served via app/api/media
          <img src={src} alt={item.caption ?? ""} className="max-h-full max-w-full object-contain" />
        )}

        {media.length > 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % media.length)}
            className="absolute right-2 z-10 rounded-full p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:right-6"
            aria-label="Volgende"
          >
            <FontAwesomeIcon icon={faChevronRight} className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {media.length > 1 ? (
        <p className="font-mono-label pb-4 text-center text-xs text-white/40">
          {index + 1} / {media.length}
        </p>
      ) : null}
    </div>
  );
}
