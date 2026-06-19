export type CampaignMode = "Online" | "InPerson" | "Hybrid" | string | null | undefined;

export const FOUNDRY_PROGRESSION_INFO_ONLINE =
  "Stufe, Klasse und Erfahrungspunkte werden für Online-Runden aus Foundry VTT übernommen. Bitte nach jeder Session dort synchronisieren — hier nicht manuell ändern.";

export const FOUNDRY_PROGRESSION_INFO_HYBRID =
  "Für diesen Charakter werden Stufe, Klasse und XP aus Foundry VTT synchronisiert (Online-Anteil). Bei reinen Tisch-Runden ohne Foundry kann der Spielleiter Werte weiterhin manuell pflegen.";

export function isFoundryProgressionLocked(opts: {
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
