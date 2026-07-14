import type { CharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";

export const MOOD_STATE_KEYS = [
  "amused",
  "angry",
  "drunk",
  "shady",
  "exhausted",
  "sleeping",
] as const;

export type MoodStateKey = (typeof MOOD_STATE_KEYS)[number];

export type MoodTokenEntry = {
  url: string;
  storage_path: string;
  is_ai_generated?: boolean;
  generated_at?: string;
};

export type MoodTokensMap = Partial<Record<MoodStateKey, MoodTokenEntry>>;

export type MoodStateDefinition = {
  key: MoodStateKey;
  labelDe: string;
  labelEn: string;
  aiVisualHint: string;
};

export const MOOD_STATE_DEFINITIONS: MoodStateDefinition[] = [
  {
    key: "amused",
    labelDe: "Belustigt",
    labelEn: "Amused",
    aiVisualHint:
      "Broad grin, laughing eyes, relaxed cheerful expression, lighthearted amusement.",
  },
  {
    key: "angry",
    labelDe: "Zornig",
    labelEn: "Angry",
    aiVisualHint:
      "Furrowed brow, clenched jaw, fierce glaring eyes, flushed face with rage.",
  },
  {
    key: "drunk",
    labelDe: "Angetrunken",
    labelEn: "Drunk",
    aiVisualHint:
      "Glassy unfocused eyes, flushed cheeks, lopsided grin, slightly swaying tipsy expression.",
  },
  {
    key: "shady",
    labelDe: "Zwielichtig",
    labelEn: "Shady",
    aiVisualHint:
      "Hood shadow over eyes, sly half-smile, suspicious narrowed gaze, noir lighting.",
  },
  {
    key: "exhausted",
    labelDe: "Erschöpft",
    labelEn: "Exhausted",
    aiVisualHint:
      "Heavy eyelids, dark circles, slumped tired posture, weary drained expression.",
  },
  {
    key: "sleeping",
    labelDe: "Schlafend",
    labelEn: "Sleeping",
    aiVisualHint:
      "Eyes peacefully closed, relaxed sleeping face, soft calm breathing expression.",
  },
];

const MOOD_BY_KEY = Object.fromEntries(
  MOOD_STATE_DEFINITIONS.map((d) => [d.key, d]),
) as Record<MoodStateKey, MoodStateDefinition>;

export function getMoodDefinition(key: string): MoodStateDefinition | null {
  return MOOD_BY_KEY[key as MoodStateKey] ?? null;
}

export function getMoodLabel(locale: CharacterSheetLocale, key: MoodStateKey): string {
  const def = MOOD_BY_KEY[key];
  return locale === "en" ? def.labelEn : def.labelDe;
}

export function parseMoodTokensMap(raw: unknown): MoodTokensMap {
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data) as unknown;
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: MoodTokensMap = {};
  for (const def of MOOD_STATE_DEFINITIONS) {
    const entry = (data as Record<string, unknown>)[def.key];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    const url = String(row.url ?? "").trim();
    const storage_path = String(row.storage_path ?? "").trim();
    if (!url) continue;
    out[def.key] = {
      url,
      storage_path,
      is_ai_generated: row.is_ai_generated === true,
      generated_at: typeof row.generated_at === "string" ? row.generated_at : undefined,
    };
  }
  return out;
}

export function normalizeMoodState(raw: unknown): MoodStateKey | null {
  const key = String(raw ?? "").trim();
  return MOOD_BY_KEY[key as MoodStateKey] ? (key as MoodStateKey) : null;
}

export function buildMoodTokenEditPrompt(
  def: MoodStateDefinition,
  characterName: string,
): string {
  return [
    `Edit this exact character portrait/token image of "${characterName}".`,
    "CRITICAL: Keep the same character identity, face structure, race, clothing, armor, art style, lighting, and composition.",
    "Do NOT change who the character is — ONLY apply the following mood/roleplay expression to the existing portrait:",
    `Mood: ${def.labelEn} (${def.labelDe}).`,
    `Visual effect: ${def.aiVisualHint}`,
    "Square token suitable for a virtual tabletop map.",
    "No text, no watermark, no UI frames.",
  ].join(" ");
}
