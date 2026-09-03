import EventEditWorkspace from "@/components/admin/EventEditWorkspace";
import type { EventFormData } from "@/components/forms/EventFormFields";

const BLANK_EVENT: EventFormData = {
  id: "",
  slug: "",
  name: "",
  description: "",
  date: new Date(),
  endDate: null,
  distanceKm: null,
  durationMinutes: null,
  price: null,
  passengerPrice: null,
  maxPassengers: 0,
  paymentReferencePrefix: null,
  coverImagePath: null,
  published: false,
  registrationOpen: false,
  registrationStartDate: null,
  registrationEndDate: null,
  draftData: null,
  mediaVisibility: "HIDDEN",
  mediaVisibleFromDate: null,
  mediaVisibleFromTarget: null,
  downloadPermission: "NOBODY",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export default function NewEventPage() {
  return (
    <EventEditWorkspace
      eventId={null}
      formId={null}
      event={BLANK_EVENT}
      initialQuestions={[]}
      initialDeadline={null}
      initialQuestionsPublished={false}
      initialResponsesOpen={true}
      initialEarlybirdPrices={[]}
      initialHasDraft={false}
    />
  );
}
