"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function toggleParticipantDisabled(participantId: string, disabled: boolean) {
  await prisma.participant.update({
    where: { id: participantId },
    data: { disabledAt: disabled ? new Date() : null },
  });
  revalidatePath("/admin/participants");
}

// Hard delete — cascades to their registrations, answers, payments and
// magic-link tokens via the existing onDelete: Cascade relations in
// prisma/schema.prisma. The vehicle photos aren't part of that DB cascade,
// so they're swept from storage separately afterwards.
export async function deleteParticipant(participantId: string) {
  const registrations = await prisma.registration.findMany({
    where: { participantId },
    select: { vehiclePhotoPath: true },
  });

  await prisma.participant.delete({ where: { id: participantId } });
  await Promise.all(registrations.map((r) => storage.delete(r.vehiclePhotoPath)));

  revalidatePath("/admin/participants");
}
