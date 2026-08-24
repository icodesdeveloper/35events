import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faCalendarCheck,
  faCircleExclamation,
  faTriangleExclamation,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import { getRegistrationPaymentOverview } from "@/lib/payments";
import RecentRegistrationsTable, { type RecentRegistrationRow } from "@/components/admin/RecentRegistrationsTable";

const RECENT_REGISTRATIONS_LIMIT = 25;

async function getStats() {
  const now = new Date();
  const [totalEvents, upcomingEvents, paymentOverview] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({
      where: { OR: [{ endDate: { gte: now } }, { endDate: null, date: { gte: now } }] },
    }),
    getRegistrationPaymentOverview(),
  ]);

  return {
    totalEvents,
    upcomingEvents,
    unpaid: paymentOverview.filter((row) => row.balance === "UNPAID").length,
    partial: paymentOverview.filter((row) => row.balance === "PARTIAL").length,
    overpaid: paymentOverview.filter((row) => row.balance === "OVERPAID").length,
  };
}

async function getRecentRegistrations(): Promise<RecentRegistrationRow[]> {
  const registrations = await prisma.registration.findMany({
    orderBy: { createdAt: "desc" },
    take: RECENT_REGISTRATIONS_LIMIT,
    include: { participant: true, event: { select: { id: true, name: true } } },
  });

  return registrations.map((registration) => ({
    id: registration.id,
    createdAt: registration.createdAt,
    participant: `${registration.participant.username} · ${registration.participant.email}`,
    vehicle: `${registration.vehicleMake} ${registration.vehicleModel}`,
    eventId: registration.event.id,
    eventName: registration.event.name,
    status: registration.paymentStatus,
  }));
}

export default async function AdminDashboardPage() {
  const [stats, recentRegistrations] = await Promise.all([getStats(), getRecentRegistrations()]);

  const cards = [
    { label: "Totaal events", value: stats.totalEvents, icon: faCalendarDays, href: undefined },
    { label: "Aankomende events", value: stats.upcomingEvents, icon: faCalendarCheck, href: undefined },
    { label: "Nog te betalen", value: stats.unpaid, icon: faCoins, href: "/admin/payments?filter=unpaid" },
    { label: "Te weinig betaald", value: stats.partial, icon: faTriangleExclamation, href: "/admin/payments?filter=partial" },
    { label: "Te veel betaald", value: stats.overpaid, icon: faCircleExclamation, href: "/admin/payments?filter=overpaid" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-white">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const content = (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-zinc-600 dark:bg-zinc-800 dark:text-slate-300">
                <FontAwesomeIcon icon={card.icon} />
              </div>
              <div>
                <div className="text-2xl font-semibold text-zinc-900 dark:text-white">{card.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{card.label}</div>
              </div>
            </>
          );

          const className =
            "flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

          return card.href ? (
            <Link key={card.label} href={card.href} className={`${className} transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800`}>
              {content}
            </Link>
          ) : (
            <div key={card.label} className={className}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Nieuwe registraties</h2>
        <RecentRegistrationsTable rows={recentRegistrations} />
      </div>
    </div>
  );
}
