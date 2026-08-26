import type { Event } from "@prisma/client";
import FileDropzone from "@/components/admin/FileDropzone";
import DatePickerField from "@/components/admin/DatePickerField";
import RichTextEditor from "@/components/admin/RichTextEditor";

// Prisma's Decimal is a class instance, not a plain object — it can't cross
// the server/client boundary as a prop, so callers pass price/passengerPrice
// already converted to strings (see events/[id]/edit/page.tsx).
export type EventFormData = Omit<Event, "price" | "passengerPrice"> & {
  price: string | null;
  passengerPrice: string | null;
};

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
export const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

export default function EventFormFields({
  event,
  errors,
}: {
  event?: EventFormData;
  errors: Record<string, string>;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">
            Naam
          </label>
          <input id="name" name="name" defaultValue={event?.name} className={fieldClass} required />
          {errors.name ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="slug">
            Slug
          </label>
          <input id="slug" name="slug" defaultValue={event?.slug} className={fieldClass} required />
          {errors.slug ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.slug}</p> : null}
        </div>
      </div>

      <div>
        <label className={labelClass}>Beschrijving</label>
        <RichTextEditor name="description" defaultValue={event?.description} placeholder="Beschrijf het event..." />
        {errors.description ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Datum</label>
          <DatePickerField name="date" defaultValue={toDateInputValue(event?.date)} required />
          {errors.date ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date}</p> : null}
        </div>
        <div>
          <label className={labelClass}>Einddatum (optioneel, meerdaags)</label>
          <DatePickerField name="endDate" defaultValue={toDateInputValue(event?.endDate)} />
          {errors.endDate ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.endDate}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="distanceKm">
            Afstand (km, optioneel)
          </label>
          <input
            id="distanceKm"
            name="distanceKm"
            type="number"
            step="0.1"
            min="0"
            defaultValue={event?.distanceKm ?? ""}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="durationMinutes">
            Duurtijd (minuten, optioneel)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min="0"
            defaultValue={event?.durationMinutes ?? ""}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="price">
            Deelnameprijs (&euro;, optioneel)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={event?.price ?? ""}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="passengerPrice">
            Passagiersprijs (&euro;, optioneel)
          </label>
          <input
            id="passengerPrice"
            name="passengerPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={event?.passengerPrice ?? ""}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="maxPassengers">
          Max. aantal passagiers
        </label>
        <input
          id="maxPassengers"
          name="maxPassengers"
          type="number"
          step="1"
          min="0"
          defaultValue={event?.maxPassengers ?? 0}
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          0 = geen passagiers toegelaten bij registratie voor dit event.
        </p>
      </div>

      <div>
        <label className={labelClass}>Coverfoto {event?.coverImagePath ? "(vervangen)" : ""}</label>
        <FileDropzone
          name="coverImage"
          accept="image/*"
          existingPreviewUrl={event?.coverImagePath ? `/api/media/${event.coverImagePath}` : undefined}
          helpText="PNG of JPG, geen groottelimiet"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Ideale afmetingen: minstens 1920 × 1080 px, liggend formaat — de foto wordt zowel breed (als banner) als
          rechtopstaand (4:5, als kaart) uitgesneden.
        </p>
      </div>
    </div>
  );
}
