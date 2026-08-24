import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht"),
  email: z.email("Ongeldig e-mailadres"),
  message: z.string().trim().min(1, "Bericht is verplicht"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
