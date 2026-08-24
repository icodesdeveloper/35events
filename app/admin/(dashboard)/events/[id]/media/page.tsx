import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown, faTrash } from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import FileDropzone from "@/components/admin/FileDropzone";
import { uploadMedia, deleteMedia, moveMedia } from "@/app/admin/(dashboard)/events/[id]/media/actions";

export default async function EventMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { media: { orderBy: { order: "asc" } } },
  });
  if (!event) notFound();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-white">{event.name}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Media beheren</p>

      <form action={uploadMedia.bind(null, event.id)} className="mb-8 space-y-3">
        <FileDropzone
          name="files"
          accept="image/*,video/*"
          multiple
          helpText="Foto's en video's, geen groottelimiet"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
        >
          Uploaden
        </button>
      </form>

      {event.media.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Nog geen media voor dit event.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {event.media.map((item, index) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="aspect-square w-full bg-zinc-950">
                {item.type === "VIDEO" ? (
                  <video className="h-full w-full object-cover" src={`/api/media/${item.filePath}`} muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- served via app/api/media
                  <img src={`/api/media/${item.filePath}`} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex items-center justify-between p-2">
                <div className="flex gap-1">
                  <form action={moveMedia.bind(null, event.id, item.id, "up")}>
                    <button
                      type="submit"
                      disabled={index === 0}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:hover:text-white"
                      aria-label="Naar boven"
                    >
                      <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3" />
                    </button>
                  </form>
                  <form action={moveMedia.bind(null, event.id, item.id, "down")}>
                    <button
                      type="submit"
                      disabled={index === event.media.length - 1}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:hover:text-white"
                      aria-label="Naar beneden"
                    >
                      <FontAwesomeIcon icon={faArrowDown} className="h-3 w-3" />
                    </button>
                  </form>
                </div>
                <form action={deleteMedia.bind(null, event.id, item.id)}>
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
          ))}
        </div>
      )}
    </div>
  );
}
