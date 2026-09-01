"use client";

import { useState } from "react";
import type { EventMedia } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import type { VisibleMediaSection } from "@/lib/media";
import { thumbSrc } from "@/lib/mediaClient";
import MediaLightbox from "@/components/public/MediaLightbox";

// Both kinds render as a still: a photo's thumb, or a video's poster frame.
// Videos used to autoplay-loop the original in every tile, which meant a
// gallery streamed each full-size file continuously — now nothing but the
// WebP still loads until the visitor opens the lightbox.
function Tile({ item, onClick }: { item: EventMedia; onClick: () => void }) {
  const isVideo = item.type === "VIDEO";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isVideo ? "Video afspelen" : "Foto bekijken"}
      className="group relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-900"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- served via app/api/media */}
      <img
        src={thumbSrc(item)}
        alt=""
        // A gallery can run to hundreds of tiles; without this every one
        // is fetched on page load rather than as it scrolls into view.
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {isVideo ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950/60 text-white backdrop-blur-sm transition-colors group-hover:bg-zinc-950/80">
            <FontAwesomeIcon icon={faPlay} className="h-4 w-4 translate-x-px" />
          </span>
        </span>
      ) : null}
    </button>
  );
}

// A section the admin marked `collapsedByDefault` starts closed and gets a
// clickable header; everything else renders open with its plain heading, as
// before. Collapsing is presentation only — nothing here gates access, that
// is settled server-side by the visibility rules.
function Section({
  section,
  children,
  headingClassName,
}: {
  section: VisibleMediaSection;
  children: React.ReactNode;
  headingClassName: string;
}) {
  const [expanded, setExpanded] = useState(!section.collapsedByDefault);

  if (!section.collapsedByDefault) {
    return (
      <div className="mb-10">
        {section.title ? <p className={headingClassName}>{section.title}</p> : null}
        {children}
      </div>
    );
  }

  return (
    <div className="mb-10">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="group mb-3 flex w-full items-center gap-2.5 border-b border-white/10 pb-3 text-left transition-colors hover:border-white/25"
      >
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`h-3 w-3 shrink-0 text-white/40 transition-transform group-hover:text-white/70 ${
            expanded ? "rotate-90" : ""
          }`}
        />
        <span className={`${headingClassName} mb-0`}>{section.title}</span>
        <span className="font-mono-label ml-auto shrink-0 text-xs text-white/40">
          {section.media.length}
        </span>
      </button>
      {expanded ? children : null}
    </div>
  );
}

export default function MediaGallery({
  sections,
  bare = false,
}: {
  sections: VisibleMediaSection[];
  // Skip the built-in "Media" heading/top-border — used on the dedicated
  // /events/[slug]/media page, which already provides its own page heading.
  bare?: boolean;
}) {
  const [open, setOpen] = useState<{ sectionId: string; index: number } | null>(null);

  if (sections.length === 0) return null;

  const highlights = sections.filter((s) => s.isHighlight);
  const regular = sections.filter((s) => !s.isHighlight);
  const openSection = sections.find((s) => s.id === open?.sectionId);

  return (
    <div className={bare ? undefined : "mt-12 border-t border-white/10 pt-10"}>
      {bare ? null : <h2 className="font-display mb-6 text-xl font-medium text-white">Media</h2>}

      {highlights.map((section) => (
        <Section key={section.id} section={section} headingClassName="font-mono-label text-accent mb-3 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.media.map((item, index) => (
              <Tile
                key={item.id}
                item={item}
                onClick={() => setOpen({ sectionId: section.id, index })}
              />
            ))}
          </div>
        </Section>
      ))}

      {regular.map((section) => (
        <Section key={section.id} section={section} headingClassName="mb-3 text-sm font-medium text-white/70">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {section.media.map((item, index) => (
              <Tile
                key={item.id}
                item={item}
                onClick={() => setOpen({ sectionId: section.id, index })}
              />
            ))}
          </div>
        </Section>
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
