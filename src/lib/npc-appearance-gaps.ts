export type AppearanceGapId = "age" | "gender" | "build" | "face" | "clothing";

export type AppearanceGap = {
  id: AppearanceGapId;
  label: string;
  hint: string;
};

const GAP_DEFINITIONS: Record<AppearanceGapId, Omit<AppearanceGap, "id">> = {
  age: {
    label: "Alter",
    hint: "z. B. „Mitte 30“, „greisenhaft“, „jugendlich“",
  },
  gender: {
    label: "Geschlecht / Präsentation",
    hint: "z. B. „männlich“, „weiblich“, „androgyn“",
  },
  build: {
    label: "Statur",
    hint: "z. B. schlank, kräftig, zierlich",
  },
  face: {
    label: "Gesicht / Haare",
    hint: "Haarfarbe, Bart, markante Züge",
  },
  clothing: {
    label: "Kleidung / Ausrüstung",
    hint: "Gewandung, Rüstung, Accessoires",
  },
};

const AGE_PATTERN =
  /\b(jahr|jahre|jährig|alt\b|jung\b|jugendlich|teen|kind|greis|mittelalter|adult|elderly|fünfzig|vierzig|dreißig|zwanzig|\d+\s*(?:j|years?))\b/i;
const GENDER_PATTERN =
  /\b(mann|frau|männlich|weiblich|androgyn|nonbinary|non-binary|er\b|sie\b|his\b|her\b|bart|bärte|barthaar)\b/i;
const BUILD_PATTERN =
  /\b(schlank|kräftig|zierlich|muskul|untersetzt|groß|klein|hager|stämmig|athletisch|dünn|massiv)\b/i;
const FACE_PATTERN =
  /\b(haar|haare|bart|auge|augen|narbe|gesicht|stirn|kinn|mund|nase|flechten|glatze|kahlkopf)\b/i;
const CLOTHING_PATTERN =
  /\b(kleid|gewand|rüstung|umhang|mantel|robe|stiefel|hut|helm|kette|schwert|dolch|amulett|wappen)\b/i;

export function detectAppearanceGaps(
  appearance: string,
  fields: { age?: string; gender?: string },
): AppearanceGap[] {
  const text = appearance.trim();
  const gaps: AppearanceGapId[] = [];

  const hasAge = Boolean(fields.age?.trim()) || AGE_PATTERN.test(text);
  const hasGender = Boolean(fields.gender?.trim()) || GENDER_PATTERN.test(text);
  const hasBuild = BUILD_PATTERN.test(text);
  const hasFace = FACE_PATTERN.test(text);
  const hasClothing = CLOTHING_PATTERN.test(text);

  if (!hasAge) gaps.push("age");
  if (!hasGender) gaps.push("gender");
  if (!hasBuild) gaps.push("build");
  if (!hasFace) gaps.push("face");
  if (!hasClothing) gaps.push("clothing");

  return gaps.map((id) => ({ id, ...GAP_DEFINITIONS[id] }));
}

export function hasBlockingAppearanceGaps(gaps: AppearanceGap[]): boolean {
  return gaps.some((g) => g.id === "age" || g.id === "gender");
}
