export type ExtraInfoAvailability =
  | { open: true }
  | { open: false; reason: "not-published" | "closed" | "deadline-passed" };

// Shared by the participant-facing extra-info page and its submit action so
// the two can never drift apart — a form only accepts answers while it's
// published, the admin hasn't manually closed it, and (if set) the deadline
// hasn't passed yet.
export function getExtraInfoAvailability(form: {
  published: boolean;
  responsesOpen: boolean;
  deadline: Date | null;
}): ExtraInfoAvailability {
  if (!form.published) return { open: false, reason: "not-published" };
  if (!form.responsesOpen) return { open: false, reason: "closed" };
  if (form.deadline && new Date() > form.deadline) return { open: false, reason: "deadline-passed" };
  return { open: true };
}

export const EXTRA_INFO_CLOSED_MESSAGE: Record<Exclude<ExtraInfoAvailability, { open: true }>["reason"], string> = {
  "not-published": "Er zijn momenteel geen bijkomende vragen voor dit event.",
  closed: "Dit formulier is gesloten door de organisator.",
  "deadline-passed": "De deadline voor het invullen van deze vragen is verstreken.",
};
