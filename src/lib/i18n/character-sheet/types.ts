export type CharacterSheetLocale = "de" | "en";

export const DEFAULT_CHARACTER_SHEET_LOCALE: CharacterSheetLocale = "de";

export function normalizeCharacterSheetLocale(
  value: string | null | undefined,
): CharacterSheetLocale {
  return value === "en" ? "en" : "de";
}
