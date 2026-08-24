import { getRegistrationPaymentOverview } from "@/lib/payments";
import PaymentQuickEntry from "@/components/admin/PaymentQuickEntry";
import PaymentsTable, { type PaymentRow } from "@/components/admin/PaymentsTable";

const VALID_FILTERS = new Set(["unpaid", "partial", "overpaid", "paid"]);

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const overview = await getRegistrationPaymentOverview();

  const rows: PaymentRow[] = overview.map(({ registration, expected, totalReceived, balance }) => ({
    registrationId: registration.id,
    paymentReference: registration.paymentReference ?? "—",
    participant: `${registration.participant.username} · ${registration.participant.email}`,
    eventId: registration.event.id,
    eventName: registration.event.name,
    expected,
    received: totalReceived,
    balance,
    paymentStatus: registration.paymentStatus as PaymentRow["paymentStatus"],
    createdAt: registration.createdAt,
  }));

  const initialFilter =
    filter && VALID_FILTERS.has(filter) ? (filter.toUpperCase() as PaymentRow["balance"]) : undefined;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-white">Betalingen</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Overschrijvingen koppelen aan deelnames.</p>

      <PaymentQuickEntry />

      <div className="mt-8">
        <PaymentsTable rows={rows} initialFilter={initialFilter} />
      </div>
    </div>
  );
}
