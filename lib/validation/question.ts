import { z } from "zod";

export const questionFormSchema = z.object({
  type: z.enum(["TEXT", "EMAIL", "NUMBER", "SELECT"]),
  label: z.string().trim().min(1, "Vraag is verplicht"),
  required: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  options: z.string().optional(),
});

export type QuestionType = z.infer<typeof questionFormSchema>["type"];

export function parseOptions(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
