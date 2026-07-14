import type { CharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";

/** D&D 5e alignments with short descriptions (DE/EN). */
export const DND5E_ALIGNMENTS = [
  {
    value: "Lawful Good",
    labelDe: "Rechtschaffen Gut",
    labelEn: "Lawful Good",
    shortDe:
      "Ordnet das Gute durch Gesetze und Tradition. Hält Versprechen, schützt Schwache, respektiert Autorität — wenn sie gerecht ist.",
    shortEn:
      "Brings good through law and tradition. Keeps promises, protects the weak, respects authority when it is just.",
  },
  {
    value: "Neutral Good",
    labelDe: "Neutral Gut",
    labelEn: "Neutral Good",
    shortDe:
      "Tut Gutes ohne starre Regeln. Hilft, wo es nötig ist, und wählt das moralisch Richtige über bequeme Ordnung.",
    shortEn:
      "Does good without rigid rules. Helps where needed and chooses what is morally right over convenient order.",
  },
  {
    value: "Chaotic Good",
    labelDe: "Chaotisch Gut",
    labelEn: "Chaotic Good",
    shortDe:
      "Freiheit und Mitgefühl über Regeln. Handelt spontan gegen Ungerechtigkeit, auch wenn es die Ordnung bricht.",
    shortEn:
      "Freedom and compassion over rules. Acts spontaneously against injustice, even when it breaks order.",
  },
  {
    value: "Lawful Neutral",
    labelDe: "Rechtschaffen Neutral",
    labelEn: "Lawful Neutral",
    shortDe:
      "Ordnung, Pflicht und Tradition zuerst. Gesetze und Verträge wiegen schwerer als persönliche Moral.",
    shortEn:
      "Order, duty, and tradition first. Laws and contracts outweigh personal morality.",
  },
  {
    value: "True Neutral",
    labelDe: "Neutral",
    labelEn: "True Neutral",
    shortDe:
      "Balance und Pragmatismus. Vermeidet Extreme, handelt oft aus Gleichgewicht oder persönlichem Interesse.",
    shortEn:
      "Balance and pragmatism. Avoids extremes, often acts from equilibrium or self-interest.",
  },
  {
    value: "Chaotic Neutral",
    labelDe: "Chaotisch Neutral",
    labelEn: "Chaotic Neutral",
    shortDe:
      "Freiheit und Selbstbestimmung. Unberechenbar — folgt Laune, Impuls oder eigenem Kodex, nicht fremden Regeln.",
    shortEn:
      "Freedom and self-determination. Unpredictable — follows whim, impulse, or a personal code, not others' rules.",
  },
  {
    value: "Lawful Evil",
    labelDe: "Rechtschaffen Böse",
    labelEn: "Lawful Evil",
    shortDe:
      "Nutzt Systeme und Hierarchien für Macht. Kalt, planvoll, bindet sich an Regeln, solange sie dem Ziel dienen.",
    shortEn:
      "Uses systems and hierarchies for power. Cold, deliberate, follows rules as long as they serve the goal.",
  },
  {
    value: "Neutral Evil",
    labelDe: "Neutral Böse",
    labelEn: "Neutral Evil",
    shortDe:
      "Egoismus ohne Skrupel. Nimmt, was er kann — ohne Loyalität, außer sie zahlt sich aus.",
    shortEn:
      "Selfishness without scruples. Takes what they can — loyal only when it pays off.",
  },
  {
    value: "Chaotic Evil",
    labelDe: "Chaotisch Böse",
    labelEn: "Chaotic Evil",
    shortDe:
      "Zerstörung, Grausamkeit und Freiheit ohne Grenzen. Gewalt und Chaos als Selbstzweck oder Triebbefriedigung.",
    shortEn:
      "Destruction, cruelty, and freedom without limits. Violence and chaos as ends in themselves or impulse.",
  },
] as const;

export type Dnd5eAlignmentValue = (typeof DND5E_ALIGNMENTS)[number]["value"];

export function findAlignmentOption(value: string | null | undefined) {
  const v = (value ?? "").trim();
  if (!v) return null;
  const lower = v.toLowerCase();
  return (
    DND5E_ALIGNMENTS.find((a) => a.value.toLowerCase() === lower) ??
    DND5E_ALIGNMENTS.find((a) => a.labelDe.toLowerCase() === lower) ??
    DND5E_ALIGNMENTS.find((a) => a.labelEn.toLowerCase() === lower) ??
    DND5E_ALIGNMENTS.find(
      (a) =>
        lower.includes(a.labelDe.toLowerCase()) ||
        a.labelDe.toLowerCase().includes(lower) ||
        lower.includes(a.labelEn.toLowerCase()) ||
        a.labelEn.toLowerCase().includes(lower),
    ) ??
    null
  );
}

export function normalizeAlignmentValue(value: string | null | undefined): string {
  return findAlignmentOption(value)?.value ?? (value ?? "").trim();
}

export function getAlignmentLabel(
  locale: CharacterSheetLocale,
  value: string | null | undefined,
): string {
  const opt = findAlignmentOption(value);
  if (opt) return locale === "en" ? opt.labelEn : opt.labelDe;
  const trimmed = (value ?? "").trim();
  return trimmed || "—";
}

export function getAlignmentShortDescription(
  locale: CharacterSheetLocale,
  value: string | null | undefined,
): string | null {
  const opt = findAlignmentOption(value);
  if (!opt) return null;
  return locale === "en" ? opt.shortEn : opt.shortDe;
}

/** @deprecated Use getAlignmentLabel(locale, value) in character sheet UI. */
export function alignmentDisplayLabel(value: string | null | undefined): string {
  return getAlignmentLabel("de", value);
}
