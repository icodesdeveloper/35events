// Placeholders the admin can drop into a communication's subject or body —
// either via the buttons in the composer or by typing the code by hand, e.g.
// {{betaalcode}}. Filled in per recipient at send time (see
// resolveRecipientVariables in lib/campaigns.ts).
//
// Deliberately free of server imports: the composer (a client component)
// reads this list too.

// "event" variables describe one registration, so they only mean something
// when the audience is exactly one event — a participant can be registered
// for several, and there would be no telling which code or amount to use.
export type CampaignVariableScope = "always" | "event";

export type CampaignVariable = { key: string; label: string; scope: CampaignVariableScope };

export const CAMPAIGN_VARIABLES: CampaignVariable[] = [
  { key: "gebruikersnaam", label: "Gebruikersnaam", scope: "always" },
  { key: "email", label: "E-mailadres", scope: "always" },
  { key: "account_link", label: "Link naar account", scope: "always" },
  { key: "rekeningnummer", label: "Rekeningnummer", scope: "always" },
  { key: "begunstigde", label: "Naam rekeninghouder", scope: "always" },
  { key: "event", label: "Eventnaam", scope: "event" },
  { key: "event_datum", label: "Eventdatum", scope: "event" },
  { key: "betaalcode", label: "Betaalcode", scope: "event" },
  { key: "bedrag", label: "Totaalbedrag", scope: "event" },
  { key: "openstaand_bedrag", label: "Nog te betalen", scope: "event" },
];

// The variable whose presence makes a mail count as "payment info sent" for
// Registration.paymentInfoSentAt.
export const PAYMENT_CODE_VARIABLE = "betaalcode";

const VARIABLE_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export function variableCode(key: string): string {
  return `{{${key}}}`;
}

export function findVariableKeys(text: string): string[] {
  const keys = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) keys.add(match[1].toLowerCase());
  return Array.from(keys);
}

export function applyVariables(
  text: string,
  values: Record<string, string>,
  transform: (value: string) => string = (value) => value,
): string {
  return text.replace(VARIABLE_PATTERN, (_whole, key: string) => transform(values[key.toLowerCase()] ?? ""));
}

// Returns a message for the admin when the text uses a variable that could
// not be filled in for this audience, so a literal "{{betaalcode}}" or an
// empty account number never lands in someone's inbox.
export function validateVariableUsage(
  text: string,
  context: { singleEvent: boolean; hasIban: boolean; hasAccountName: boolean },
): string | null {
  const used = findVariableKeys(text);
  const known = new Map(CAMPAIGN_VARIABLES.map((variable) => [variable.key, variable]));

  const unknown = used.filter((key) => !known.has(key));
  if (unknown.length > 0) {
    return `Onbekende variabele: ${unknown.map(variableCode).join(", ")}.`;
  }

  if (!context.singleEvent) {
    const eventOnly = used.filter((key) => known.get(key)?.scope === "event");
    if (eventOnly.length > 0) {
      return `${eventOnly.map(variableCode).join(", ")} kan alleen gebruikt worden als de doelgroep precies één event is.`;
    }
  }

  if (used.includes("rekeningnummer") && !context.hasIban) {
    return "Er is nog geen rekeningnummer ingesteld. Vul het in bij Instellingen of haal {{rekeningnummer}} uit het bericht.";
  }
  if (used.includes("begunstigde") && !context.hasAccountName) {
    return "Er is nog geen naam van de rekeninghouder ingesteld. Vul die in bij Instellingen of haal {{begunstigde}} uit het bericht.";
  }
  return null;
}
