import { z } from "zod";

export const participantRegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Minstens 3 tekens")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Enkel letters, cijfers, . _ -"),
  email: z.email("Ongeldig e-mailadres"),
  password: z.string().min(8, "Minstens 8 tekens"),
});

export type ParticipantRegisterValues = z.infer<typeof participantRegisterSchema>;
