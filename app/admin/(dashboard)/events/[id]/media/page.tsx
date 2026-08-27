import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSection } from "@/app/admin/(dashboard)/events/[id]/media/actions";
import EventMediaSettingsForm from "@/components/admin/EventMediaSettingsForm";
import SortableSectionList from "@/components/admin/SortableSectionList";
import { fieldClass } from "@/components/forms/EventFormFields";

export default async function EventMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { mediaSections: { orderBy: { order: "asc" }, include: { media: { orderBy: { order: "asc" } } } } },
  });
  if (!event) notFound();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-white">{event.name}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Media beheren</p>

      <EventMediaSettingsForm
        eventId={event.id}
        mediaVisibility={event.mediaVisibility}
        mediaVisibleFromDate={event.mediaVisibleFromDate ? event.mediaVisibleFromDate.toISOString().slice(0, 10) : null}
        mediaVisibleFromTarget={event.mediaVisibleFromTarget}
        downloadPermission={event.downloadPermission}
      />

      {event.mediaSections.length === 0 ? (
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Nog geen secties voor dit event.</p>
      ) : (
        <SortableSectionList eventId={event.id} sections={event.mediaSections} />
      )}

      <form
        action={createSection.bind(null, event.id)}
        className="flex items-end gap-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-zinc-700"
      >
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300">
            Nieuwe sectie
          </label>
          <input name="title" placeholder="bv. Aftermovie, Sfeerfoto's..." className={fieldClass} required />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
        >
          Sectie toevoegen
        </button>
      </form>
    </div>
  );
}
