import EventForm from "@/components/forms/EventForm";
import { createEvent } from "@/app/admin/(dashboard)/events/actions";

export default function NewEventPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-white">Nieuw event</h1>
      <EventForm action={createEvent} />
    </div>
  );
}
