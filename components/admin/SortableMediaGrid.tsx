"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EventMedia } from "@prisma/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown, faTrash, faGripVertical } from "@fortawesome/free-solid-svg-icons";
import { thumbSrc } from "@/lib/mediaClient";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import { deleteMedia, moveMedia, reorderMedia } from "@/app/admin/(dashboard)/events/[id]/media/actions";

// Transcoding runs in the background after upload, so a freshly added video
// needs to say so — otherwise it just looks like a broken tile.
function VideoBadge({ status }: { status: string | null }) {
  if (status === "PROCESSING") {
    return (
      <span className="absolute inset-x-1.5 bottom-1.5 rounded bg-zinc-950/80 px-2 py-1 text-center text-[11px] font-medium text-white">
        Video wordt verwerkt...
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="absolute inset-x-1.5 bottom-1.5 rounded bg-red-600/90 px-2 py-1 text-center text-[11px] font-medium text-white">
        Verwerking mislukt
      </span>
    );
  }
  return null;
}

function SortableTile({
  eventId,
  sectionId,
  item,
  isFirst,
  isLast,
}: {
  eventId: string;
  sectionId: string;
  item: EventMedia;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${
        isDragging ? "relative z-10 opacity-90" : ""
      }`}
    >
      <div className="relative aspect-square w-full bg-zinc-950">
        {item.type === "VIDEO" ? (
          // Poster still once ffmpeg has produced one; until then there is no
          // image to show, so fall back to the file itself with metadata-only
          // preload rather than pulling down the whole video.
          item.thumbPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- served via app/api/media
            <img src={thumbSrc(item)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <video className="h-full w-full object-cover" src={`/api/media/${item.filePath}`} muted preload="metadata" />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- served via app/api/media
          <img
            src={thumbSrc(item)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
        {item.type === "VIDEO" ? <VideoBadge status={item.processingStatus} /> : null}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-1.5 left-1.5 cursor-grab touch-none rounded bg-black/50 p-1.5 text-white/80 hover:text-white active:cursor-grabbing"
          aria-label="Verslepen"
        >
          <FontAwesomeIcon icon={faGripVertical} className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center justify-between p-2">
        <div className="flex gap-1">
          <form action={moveMedia.bind(null, eventId, sectionId, item.id, "up")}>
            <button
              type="submit"
              disabled={isFirst}
              className="rounded p-1.5 text-slate-400 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:hover:text-white"
              aria-label="Naar boven"
            >
              <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3" />
            </button>
          </form>
          <form action={moveMedia.bind(null, eventId, sectionId, item.id, "down")}>
            <button
              type="submit"
              disabled={isLast}
              className="rounded p-1.5 text-slate-400 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:hover:text-white"
              aria-label="Naar beneden"
            >
              <FontAwesomeIcon icon={faArrowDown} className="h-3 w-3" />
            </button>
          </form>
        </div>
        <form action={deleteMedia.bind(null, eventId, item.id)}>
          <ConfirmSubmitButton
            confirmMessage="Dit mediabestand verwijderen?"
            className="rounded p-1.5 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
            ariaLabel="Verwijderen"
          >
            <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  );
}

export default function SortableMediaGrid({
  eventId,
  sectionId,
  media,
}: {
  eventId: string;
  sectionId: string;
  media: EventMedia[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(media);

  // Video transcoding finishes in the background with nothing to push the
  // result to the page, so poll while any tile is still processing and stop
  // as soon as none are.
  const hasProcessing = items.some((item) => item.processingStatus === "PROCESSING");
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [hasProcessing, router]);

  // Same reasoning as SortableSectionList: re-sync when the server sends a
  // fresh `media` prop (upload, delete, arrow-move all revalidate the page),
  // adjusted during render rather than in an effect.
  const [prevMedia, setPrevMedia] = useState(media);
  if (media !== prevMedia) {
    setPrevMedia(media);
    setItems(media);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Nog geen media in deze sectie.</p>;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((m) => m.id === active.id);
    const newIndex = items.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    reorderMedia(
      eventId,
      sectionId,
      reordered.map((m) => m.id),
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((m) => m.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <SortableTile
              key={item.id}
              eventId={eventId}
              sectionId={sectionId}
              item={item}
              isFirst={index === 0}
              isLast={index === items.length - 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
