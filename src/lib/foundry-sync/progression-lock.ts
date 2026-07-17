export type CampaignMode = "Online" | "InPerson" | "Hybrid" | string | null | undefined;

/** Hinweis: einmaliger Foundry-Import, danach Selbstpflege (keine Sperre mehr). */
export const FOUNDRY_PROGRESSION_INFO_ONLINE =
  "Stufe, Klasse und Erfahrungspunkte könnt ihr einmalig aus Foundry VTT übernehmen. Danach pflegt ihr diese Werte selbst im Charakterblatt — ein erneuter Foundry-Sync überschreibt sie nicht.";

export const FOUNDRY_PROGRESSION_INFO_HYBRID =
  "Bei Foundry-Verknüpfung: Stufe, Klasse und XP einmalig aus Foundry übernehmen, danach Selbstpflege im Charakterblatt. Ohne Foundry-Anbindung könnt ihr die Werte jederzeit manuell pflegen.";

/**
 * Früher: Online/Hybrid sperrten Stufe/Klasse/XP.
 * Jetzt: immer freigeben — Foundry nur als einmalige Übernahme.
 */
export function isFoundryProgressionLocked(_opts: {
  campaignMode: CampaignMode;
  hasFoundryCharacterMapping?: boolean;
}): boolean {
  return false;
}

/** Infotext anzeigen (ohne Felder zu sperren). */
export function shouldShowFoundryProgressionInfo(opts: {
  campaignMode: CampaignMode;
  hasFoundryCharacterMapping?: boolean;
}): boolean {
  const mode = opts.campaignMode ?? "Online";
  if (mode === "InPerson") return false;
  if (mode === "Online") return true;
  if (mode === "Hybrid") return Boolean(opts.hasFoundryCharacterMapping);
  return false;
}

export function foundryProgressionLockMessage(opts: {
  campaignMode: CampaignMode;
}): string {
  return opts.campaignMode === "Hybrid"
    ? FOUNDRY_PROGRESSION_INFO_HYBRID
    : FOUNDRY_PROGRESSION_INFO_ONLINE;
}

/** Felder, die nur beim ersten Foundry-Import gesetzt und danach vom Spieler gepflegt werden. */
export const FOUNDRY_ONE_TIME_PROGRESSION_FIELDS = [
  "level",
  "class",
  "subclass",
  "experience_points",
] as const;
