import { z } from "zod";
import type { QuestionType } from "@/lib/validation/question";

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

export type PassengerQuestion = {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[] | null;
  perPassenger: boolean;
};

export function passengerLabel(index: number): string {
  return index === 0 ? "Jij" : `Passagier ${index}`;
}

// A non-perPassenger question keeps its plain `question.id` field name (so
// existing single-answer forms/handlers are unaffected); a perPassenger one
// expands into one field per person, named `${questionId}:${passengerIndex}`
// (0 = the registrant/driver, 1..N = the Nth passenger).
export function expandQuestionsForPassengers<Q extends PassengerQuestion>(
  questions: Q[],
  passengerCount: number,
): { question: Q; passengerIndex: number; fieldName: string; personLabel: string | null }[] {
  const result: { question: Q; passengerIndex: number; fieldName: string; personLabel: string | null }[] = [];
  for (const question of questions) {
    if (!question.perPassenger) {
      result.push({ question, passengerIndex: 0, fieldName: question.id, personLabel: null });
      continue;
    }
    for (let index = 0; index <= passengerCount; index++) {
      result.push({
        question,
        passengerIndex: index,
        fieldName: `${question.id}:${index}`,
        personLabel: passengerLabel(index),
      });
    }
  }
  return result;
}

export type ValidatedQuestionAnswer = { questionId: string; passengerIndex: number; value: string };

// Shared by the registration form (answers are optional there, filled in
// alongside the vehicle fields) and the extra-info form (answers are
// required there) — enforceRequired toggles whether a missing required
// field is reported as a field error or simply skipped.
export function collectQuestionAnswers(
  questions: PassengerQuestion[],
  passengerCount: number,
  formData: FormData,
  { enforceRequired }: { enforceRequired: boolean },
): { fieldErrors: Record<string, string>; values: ValidatedQuestionAnswer[] } {
  const fieldErrors: Record<string, string> = {};
  const values: ValidatedQuestionAnswer[] = [];

  for (const { question, passengerIndex, fieldName } of expandQuestionsForPassengers(questions, passengerCount)) {
    const raw = formData.get(fieldName);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (!value) {
      if (enforceRequired && question.required) fieldErrors[fieldName] = "Dit veld is verplicht";
      continue;
    }

    if (question.type === "EMAIL" && !z.email().safeParse(value).success) {
      fieldErrors[fieldName] = "Ongeldig e-mailadres";
      continue;
    }
    if (question.type === "NUMBER" && Number.isNaN(Number(value))) {
      fieldErrors[fieldName] = "Moet een nummer zijn";
      continue;
    }
    if (question.type === "SELECT") {
      const options = question.options ?? [];
      if (!options.includes(value)) {
        fieldErrors[fieldName] = "Ongeldige keuze";
        continue;
      }
    }

    values.push({ questionId: question.id, passengerIndex, value });
  }

  return { fieldErrors, values };
}

// Groups a flat list of stored answers back by question (each perPassenger
// question can have several rows, one per passengerIndex) — shared by the
// admin registrations list and the per-event answers overview.
export function groupAnswersByQuestion<Q extends { id: string }>(
  answers: { question: Q; passengerIndex: number; value: string }[],
): { question: Q; entries: { passengerIndex: number; value: string }[] }[] {
  const map = new Map<string, { question: Q; entries: { passengerIndex: number; value: string }[] }>();
  for (const answer of answers) {
    const existing = map.get(answer.question.id);
    if (existing) {
      existing.entries.push({ passengerIndex: answer.passengerIndex, value: answer.value });
    } else {
      map.set(answer.question.id, {
        question: answer.question,
        entries: [{ passengerIndex: answer.passengerIndex, value: answer.value }],
      });
    }
  }
  for (const group of map.values()) group.entries.sort((a, b) => a.passengerIndex - b.passengerIndex);
  return Array.from(map.values());
}

// Same "required answered?" rule used on /account and in the payment-confirmed
// mail — a question counts as answered if every person it's asked of (0..N
// passengers, or just the registrant) has a stored answer.
export function isRegistrationComplete(
  questions: PassengerQuestion[],
  passengerCount: number,
  answers: { questionId: string; passengerIndex: number }[],
): boolean {
  const answered = new Set(answers.map((a) => `${a.questionId}:${a.passengerIndex}`));
  return expandQuestionsForPassengers(
    questions.filter((q) => q.required),
    passengerCount,
  ).every(({ question, passengerIndex }) => answered.has(`${question.id}:${passengerIndex}`));
}
