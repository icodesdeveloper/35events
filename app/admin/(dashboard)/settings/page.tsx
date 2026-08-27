import { getSettings } from "@/lib/settings";
import { fieldClass, labelClass } from "@/components/forms/EventFormFields";
import { saveSettings } from "@/app/admin/(dashboard)/settings/actions";
import FileDropzone from "@/components/admin/FileDropzone";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-white">Instellingen</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Algemene instellingen voor 35events.
      </p>

      <form action={saveSettings} className="max-w-md space-y-8">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Logo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Wordt gebruikt in de header van de site, het admin-dashboard en bovenaan elke mail.
          </p>
          <FileDropzone
            name="logo"
            accept="image/*"
            existingPreviewUrl={settings.logoPath ? `/api/media/${settings.logoPath}` : undefined}
            helpText="PNG met transparante achtergrond werkt het best"
          />
        </div>

        <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Bankrekening voor overschrijvingen</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Wordt getoond op de registratie-bevestigingspagina en in de bevestigingsmail, samen met de betaalcode.
          </p>
          <div>
            <label className={labelClass} htmlFor="bankAccountIban">
              IBAN
            </label>
            <input
              id="bankAccountIban"
              name="bankAccountIban"
              defaultValue={settings.bankAccountIban ?? ""}
              placeholder="BE00 0000 0000 0000"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="bankAccountName">
              Naam rekeninghouder
            </label>
            <input
              id="bankAccountName"
              name="bankAccountName"
              defaultValue={settings.bankAccountName ?? ""}
              placeholder="35events"
              className={fieldClass}
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
        >
          Opslaan
        </button>
      </form>
    </div>
  );
}
