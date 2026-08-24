"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import type { PaymentStatus } from "@prisma/client";

export async function updatePaymentStatus(eventId: string, registrationId: string, status: PaymentStatus) {
  await prisma.registration.update({ where: { id: registrationId }, data: { paymentStatus: status } });
  revalidatePath(`/admin/events/${eventId}/registrations`);
}

// A hard delete, not a cancellation — the [eventId, participantId] unique
// constraint on Registration means a merely-cancelled row would still block
// the participant from registering again, which defeats the point of this
// action (the admin explicitly wants them able to re-register).
export async function deleteRegistration(eventId: string, registrationId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { vehiclePhotoPath: true },
  });
  if (!registration) return;

  await prisma.registration.delete({ where: { id: registrationId } });
  await storage.delete(registration.vehiclePhotoPath);

  revalidatePath(`/admin/events/${eventId}/registrations`);
  revalidatePath("/admin");
  revalidatePath("/admin/events");
}
