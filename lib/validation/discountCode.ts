import { z } from "zod";

export const discountCodeFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Code is verplicht")
      .transform((v) => v.toUpperCase()),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.preprocess((v) => Number(v), z.number().positive("Moet groter dan 0 zijn")),
    eventId: z.string().trim().optional(),
    participantId: z.string().trim().optional(),
    validFrom: z.string().trim().optional(),
    validUntil: z.string().trim().optional(),
    maxUses: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z.number().int().positive().optional(),
    ),
  })
  .refine((data) => data.type !== "PERCENT" || data.value <= 100, {
    message: "Een percentage kan niet meer dan 100 zijn",
    path: ["value"],
  });

export type DiscountCodeFormValues = z.infer<typeof discountCodeFormSchema>;

export function parseDiscountCodeFormData(
  formData: FormData,
): { data: DiscountCodeFormValues; fieldErrors: null } | { data: null; fieldErrors: Record<string, string> } {
  const raw = {
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    eventId: formData.get("eventId") || undefined,
    participantId: formData.get("participantId") || undefined,
    validFrom: formData.get("validFrom") || undefined,
    validUntil: formData.get("validUntil") || undefined,
    maxUses: formData.get("maxUses") || undefined,
  };

  const result = discountCodeFormSchema.safeParse(raw);
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
