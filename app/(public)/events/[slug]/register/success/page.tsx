import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";

export default function RegistrationSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center md:px-8">
      <FontAwesomeIcon icon={faCircleCheck} className="mb-4 h-10 w-10 text-emerald-500" />
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">Registratie ontvangen</h1>
      <p className="mb-8 text-slate-600 dark:text-slate-300">
        Betaling is nog niet verwerkt — we nemen binnenkort contact op met de details.
      </p>
      <Link href="/account" className="font-medium text-zinc-900 underline dark:text-white">
        Bekijk mijn registraties
      </Link>
    </div>
  );
}
