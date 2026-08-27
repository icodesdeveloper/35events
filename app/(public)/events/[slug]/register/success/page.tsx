import { notFound } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth } from "@/lib/auth/participant";
import { getExpectedAmount } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/format";

export default async function RegistrationSuccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await participantAuth();
  const participantId = session?.user?.participantId;
  if (!participantId) notFound();

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const registration = await prisma.registration.findUnique({
    where: { eventId_participantId: { eventId: event.id, participantId } },
  });
  if (!registration) notFound();

  const expectedAmount = getExpectedAmount(registration);
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center md:px-8">
      <FontAwesomeIcon icon={faCircleCheck} className="mb-4 h-10 w-10 text-emerald-500" />
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">Bedankt voor je aanmelding!</h1>

      {expectedAmount <= 0 ? (
        <p className="mb-8 text-slate-600 dark:text-slate-300">Deze deelname is gratis — je registratie is helemaal in orde.</p>
      ) : (
        <p className="mb-8 text-slate-600 dark:text-slate-300">
          Om je registratie voor <strong>{event.name}</strong> te voltooien, dien je{" "}
          <strong>{formatPrice(expectedAmount)}</strong> over te schrijven
          {settings.bankAccountIban ? (
            <>
              {" "}
              naar <strong>{settings.bankAccountIban}</strong>
              {settings.bankAccountName ? ` (${settings.bankAccountName})` : ""}
            </>
          ) : null}
          . Vermeld bij de overschrijving volgende code:{" "}
          <span className="font-mono-label rounded bg-slate-100 px-2 py-1 text-zinc-900 dark:bg-zinc-800 dark:text-white">
            {registration.paymentReference}
          </span>
        </p>
      )}

      <Link href="/account" className="font-medium text-zinc-900 underline dark:text-white">
        Bekijk mijn registraties
      </Link>
    </div>
  );
}
