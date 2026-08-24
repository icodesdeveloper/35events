import { z } from "zod";

export const registrationFormSchema = z.object({
  vehicleMake: z.string().trim().min(1, "Merk is verplicht"),
  vehicleModel: z.string().trim().min(1, "Model is verplicht"),
  vehicleType: z.string().trim().optional(),
  hasPassenger: z.preprocess((value) => value === "on" || value === true, z.boolean()),
});

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>;
