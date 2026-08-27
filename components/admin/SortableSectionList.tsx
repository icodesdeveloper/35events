"use client";

import { useState } from "react";
import type { EventMedia, EventMediaSection } from "@prisma/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical } from "@fortawesome/free-solid-svg-icons";
import MediaSectionCard from "@/components/admin/MediaSectionCard";
import { reorderSections } from "@/app/admin/(dashboard)/events/[id]/media/actions";

type SectionWithMedia = EventMediaSection & { media: EventMedia[] };

function SortableSection({
  eventId,
  section,
  isFirst,
  isLast,
}: {
  eventId: string;
  section: SectionWithMedia;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90" : "relative"}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-3.5 left-2 z-10 cursor-grab touch-none rounded p-1.5 text-slate-400 hover:text-zinc-900 active:cursor-grabbing dark:hover:text-white"
        aria-label="Sectie verslepen"
      >
        <FontAwesomeIcon icon={faGripVertical} className="h-3.5 w-3.5" />
      </button>
      <div className="pl-8">
        <MediaSectionCard eventId={eventId} section={section} isFirst={isFirst} isLast={isLast} />
      </div>
    </div>
  );
}

export default function SortableSectionList({
  eventId,
  sections,
}: {
  eventId: string;
  sections: SectionWithMedia[];
}) {
  const [items, setItems] = useState(sections);
  // Re-sync whenever the server gives us fresh data (any edit inside a
  // section card — title, visibility, uploads, ... — revalidates the page
  // and passes a new `sections` prop down). Adjusting state during render
  // (React's recommended alternative to a sync-on-prop-change effect) avoids
  // the extra render pass an effect would cost here.
  const [prevSections, setPrevSections] = useState(sections);
  if (sections !== prevSections) {
    setPrevSections(sections);
    setItems(sections);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    reorderSections(
      eventId,
      reordered.map((s) => s.id),
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {items.map((section, index) => (
          <SortableSection
            key={section.id}
            eventId={eventId}
            section={section}
            isFirst={index === 0}
            isLast={index === items.length - 1}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
