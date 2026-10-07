import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { formatPrice } from "@/lib/format";
import { getOutstandingPayments } from "@/lib/payments";
import { getSettings } from "@/lib/settings";

// Shown at the top of the participant's account pages and on an event they
// registered for, for as long as a payment is still due: amount, account
// number and the code to mention. Renders nothing once everything is paid.
// Pass eventId to limit it to that one event.
export default async function PaymentDueBanner({
  participantId,
  eventId,
  className = "",
}: {
  participantId: string;
  eventId?: string;
  className?: string;
}) {
  const outstanding = await getOutstandingPayments(participantId, eventId);
  if (outstanding.length === 0) return null;

  const settings = await getSettings();
  const iban = settings.bankAccountIban;
  const accountName = settings.bankAccountName;

  return (
    <div className={`border border-amber-400/40 bg-amber-400/5 px-5 py-4 text-sm text-amber-100 ${className}`}>
      <div className="flex items-center gap-2 font-medium text-amber-300">
        <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4" />
        Je moet nog betalen om je deelname te bevestigen
      </div>
      <ul className="mt-2 space-y-2">
        {outstanding.map((item) => (
          <li key={item.registrationId}>
            <span className="text-white">{item.eventName}</span>: schrijf{" "}
            <strong className="text-white">{formatPrice(item.amountDue)}</strong> over
            {iban ? (
              <>
                {" "}
                naar <strong className="font-mono text-white">{iban}</strong>
                {accountName ? ` (${accountName})` : ""}
              </>
            ) : null}{" "}
            met vermelding van code <strong className="font-mono text-white">{item.paymentReference}</strong>.
          </li>
        ))}
      </ul>
    </div>
  );
}
