/** D&D-5e-Gesinnungen mit Kurzbeschreibung (DE). */
export const DND5E_ALIGNMENTS = [
  {
    value: "Lawful Good",
    labelDe: "Rechtschaffen Gut",
    shortDe:
      "Ordnet das Gute durch Gesetze und Tradition. Hält Versprechen, schützt Schwache, respektiert Autorität — wenn sie gerecht ist.",
  },
  {
    value: "Neutral Good",
    labelDe: "Neutral Gut",
    shortDe:
      "Tut Gutes ohne starre Regeln. Hilft, wo es nötig ist, und wählt das moralisch Richtige über bequeme Ordnung.",
  },
  {
    value: "Chaotic Good",
    labelDe: "Chaotisch Gut",
    shortDe:
      "Freiheit und Mitgefühl über Regeln. Handelt spontan gegen Ungerechtigkeit, auch wenn es die Ordnung bricht.",
  },
  {
    value: "Lawful Neutral",
    labelDe: "Rechtschaffen Neutral",
    shortDe:
      "Ordnung, Pflicht und Tradition zuerst. Gesetze und Verträge wiegen schwerer als persönliche Moral.",
  },
  {
    value: "True Neutral",
    labelDe: "Neutral",
    shortDe:
      "Balance und Pragmatismus. Vermeidet Extreme, handelt oft aus Gleichgewicht oder persönlichem Interesse.",
  },
  {
    value: "Chaotic Neutral",
    labelDe: "Chaotisch Neutral",
    shortDe:
      "Freiheit und Selbstbestimmung. Unberechenbar — folgt Laune, Impuls oder eigenem Kodex, nicht fremden Regeln.",
  },
  {
    value: "Lawful Evil",
    labelDe: "Rechtschaffen Böse",
    shortDe:
      "Nutzt Systeme und Hierarchien für Macht. Kalt, planvoll, bindet sich an Regeln, solange sie dem Ziel dienen.",
  },
  {
    value: "Neutral Evil",
    labelDe: "Neutral Böse",
    shortDe:
      "Egoismus ohne Skrupel. Nimmt, was er kann — ohne Loyalität, außer sie zahlt sich aus.",
  },
  {
    value: "Chaotic Evil",
    labelDe: "Chaotisch Böse",
    shortDe:
      "Zerstörung, Grausamkeit und Freiheit ohne Grenzen. Gewalt und Chaos als Selbstzweck oder Triebbefriedigung.",
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
    DND5E_ALIGNMENTS.find(
      (a) =>
        lower.includes(a.labelDe.toLowerCase()) ||
        a.labelDe.toLowerCase().includes(lower),
    ) ??
    null
  );
}

export function normalizeAlignmentValue(value: string | null | undefined): string {
  return findAlignmentOption(value)?.value ?? (value ?? "").trim();
}

export function alignmentDisplayLabel(value: string | null | undefined): string {
  const opt = findAlignmentOption(value);
  if (opt) return opt.labelDe;
  const trimmed = (value ?? "").trim();
  return trimmed || "—";
}
