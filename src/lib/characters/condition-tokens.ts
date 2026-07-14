/** Foundry / D&D-5e-Zustände für Karten-Token-Varianten. */
export const CHARACTER_CONDITION_KEYS = [
  "charmed",
  "unconscious",
  "blinded",
  "exhaustion",
  "restrained",
  "paralyzed",
  "grappled",
  "incapacitated",
  "prone",
  "deafened",
  "invisible",
  "poisoned",
] as const;

export type CharacterConditionKey = (typeof CHARACTER_CONDITION_KEYS)[number];

export type ConditionTokenEntry = {
  url: string;
  storage_path: string;
  is_ai_generated?: boolean;
  generated_at?: string;
};

export type ConditionTokensMap = Partial<Record<CharacterConditionKey, ConditionTokenEntry>>;

export type CharacterConditionDefinition = {
  key: CharacterConditionKey;
  labelDe: string;
  labelEn: string;
  /** Visuelle Anweisung für die Bild-KI — nur Avatar anpassen, Identität beibehalten. */
  aiVisualHint: string;
};

export const CHARACTER_CONDITION_DEFINITIONS: CharacterConditionDefinition[] = [
  {
    key: "charmed",
    labelDe: "Bezaubert",
    labelEn: "Charmed",
    aiVisualHint:
      "Subtle magical sparkle in the eyes, faint rose-gold glow around the head, serene enchanted expression.",
  },
  {
    key: "unconscious",
    labelDe: "Bewusstlos",
    labelEn: "Unconscious",
    aiVisualHint:
      "Eyes closed, head tilted or slumped, limp posture, peaceful unconscious expression.",
  },
  {
    key: "blinded",
    labelDe: "Blind",
    labelEn: "Blinded",
    aiVisualHint:
      "Eyes closed or covered with a cloth/blindfold, slightly disoriented expression.",
  },
  {
    key: "exhaustion",
    labelDe: "Erschöpfung",
    labelEn: "Exhaustion",
    aiVisualHint:
      "Heavy dark circles under eyes, pale tired face, slumped shoulders, exhausted expression.",
  },
  {
    key: "restrained",
    labelDe: "Festgesetzt",
    labelEn: "Restrained",
    aiVisualHint:
      "Visible ropes or chains restraining arms, strained struggling expression.",
  },
  {
    key: "paralyzed",
    labelDe: "Gelähmt",
    labelEn: "Paralyzed",
    aiVisualHint:
      "Frozen stiff posture, wide panicked eyes that cannot move, magical paralysis aura.",
  },
  {
    key: "grappled",
    labelDe: "Gepackt",
    labelEn: "Grappled",
    aiVisualHint:
      "Arms pinned or gripped from off-frame, strained neck, struggling expression.",
  },
  {
    key: "incapacitated",
    labelDe: "Handlungsunfähig",
    labelEn: "Incapacitated",
    aiVisualHint:
      "Dazed unfocused eyes, slack jaw, unable to act, stunned helpless expression.",
  },
  {
    key: "prone",
    labelDe: "Liegend",
    labelEn: "Prone",
    aiVisualHint:
      "Character shown lying flat on the ground, horizontal composition, fallen posture.",
  },
  {
    key: "deafened",
    labelDe: "Taub",
    labelEn: "Deafened",
    aiVisualHint:
      "Hands pressed against ears, pained expression, sound-wave distortion effect around head.",
  },
  {
    key: "invisible",
    labelDe: "Unsichtbar",
    labelEn: "Invisible",
    aiVisualHint:
      "Semi-transparent ghostly figure, faint outline only, fading edges, ethereal translucency.",
  },
  {
    key: "poisoned",
    labelDe: "Vergiftet",
    labelEn: "Poisoned",
    aiVisualHint:
      "Green veins visible on face and neck, sickly greenish skin tint, nauseated pained expression.",
  },
];

const CONDITION_BY_KEY = Object.fromEntries(
  CHARACTER_CONDITION_DEFINITIONS.map((d) => [d.key, d]),
) as Record<CharacterConditionKey, CharacterConditionDefinition>;

export function getConditionDefinition(key: string): CharacterConditionDefinition | null {
  return CONDITION_BY_KEY[key as CharacterConditionKey] ?? null;
}

export function parseConditionTokensMap(raw: unknown): ConditionTokensMap {
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data) as unknown;
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: ConditionTokensMap = {};
  for (const def of CHARACTER_CONDITION_DEFINITIONS) {
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

export function buildConditionTokenEditPrompt(
  def: CharacterConditionDefinition,
  characterName: string,
): string {
  return [
    `Edit this exact character portrait/token image of "${characterName}".`,
    "CRITICAL: Keep the same character identity, face structure, race, clothing, armor, art style, lighting, and composition.",
    "Do NOT change who the character is — ONLY apply the following condition effect to the existing portrait:",
    `Condition: ${def.labelEn} (${def.labelDe}).`,
    `Visual effect: ${def.aiVisualHint}`,
    "Square token suitable for a virtual tabletop map.",
    "No text, no watermark, no UI frames.",
  ].join(" ");
}
