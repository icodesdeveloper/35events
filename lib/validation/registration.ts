import { z } from "zod";

export const registrationFormSchema = z.object({
  vehicleMake: z.string().trim().min(1, "Merk is verplicht"),
  vehicleModel: z.string().trim().min(1, "Model is verplicht"),
  vehicleType: z.string().trim().optional(),
  passengerCount: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
    z.number().int().min(0, "Ongeldig aantal passagiers"),
  ),
  discountCode: z.string().trim().optional(),
});

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>;
