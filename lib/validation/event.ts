import { z } from "zod";
import { sanitizeContentHtml } from "@/lib/sanitizeHtml";

const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().positive().optional(),
);

const optionalNonNegativeNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().nonnegative().optional(),
);

export const eventFormSchema = z
  .object({
    name: z.string().trim().min(1, "Naam is verplicht"),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is verplicht")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Enkel kleine letters, cijfers en koppeltekens"),
    description: z
      .string()
      .trim()
      .min(1, "Beschrijving is verplicht")
      .transform((html) => sanitizeContentHtml(html))
      .refine((html) => html.trim().length > 0, { message: "Beschrijving is verplicht" }),
    date: z.string().min(1, "Datum is verplicht"),
    endDate: z.string().optional(),
    distanceKm: optionalPositiveNumber,
    durationMinutes: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
      z.number().int().positive().optional(),
    ),
    price: optionalNonNegativeNumber,
    passengerPrice: optionalNonNegativeNumber,
    maxPassengers: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
      z.number().int().min(0, "Kan niet negatief zijn"),
    ),
    published: z.preprocess((value) => value === "on" || value === true, z.boolean()),
    registrationOpen: z.preprocess((value) => value === "on" || value === true, z.boolean()),
    registrationStartDate: z.string().optional(),
    registrationEndDate: z.string().optional(),
  })
  .refine(
    (data) => !data.endDate || new Date(data.endDate) >= new Date(data.date),
    { message: "Einddatum moet na de startdatum liggen", path: ["endDate"] },
  )
  .refine(
    (data) =>
      !data.registrationStartDate ||
      !data.registrationEndDate ||
      new Date(data.registrationEndDate) >= new Date(data.registrationStartDate),
    { message: "Einddatum moet na startdatum liggen", path: ["registrationEndDate"] },
  );

export type EventFormValues = z.infer<typeof eventFormSchema>;

export function parseEventFormData(
  formData: FormData,
): { data: EventFormValues; fieldErrors: null } | { data: null; fieldErrors: Record<string, string> } {
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    date: formData.get("date"),
    endDate: formData.get("endDate") || undefined,
    distanceKm: formData.get("distanceKm") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
    price: formData.get("price") || undefined,
    passengerPrice: formData.get("passengerPrice") || undefined,
    maxPassengers: formData.get("maxPassengers") || undefined,
    published: formData.get("published"),
    registrationOpen: formData.get("registrationOpen"),
    registrationStartDate: formData.get("registrationStartDate") || undefined,
    registrationEndDate: formData.get("registrationEndDate") || undefined,
  };

  const result = eventFormSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { data: null, fieldErrors };
  }
  return { data: result.data, fieldErrors: null };
}
