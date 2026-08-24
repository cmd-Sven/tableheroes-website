/**
 * Per-Spieler Würfel-Skins für Live-Session 3D-Würfel.
 * Persistenz: localStorage `th:dice-skin:{userId}` — Skin-Id wandert im Roll-Meta mit.
 */

export const DICE_SKIN_IDS = [
  "gm-marble",
  "gm-void",
  "gm-chrome",
  "red",
  "blue",
  "green",
  "violet",
  "black",
  "white",
  "gold",
  "orange",
] as const;

export type DiceSkinId = (typeof DICE_SKIN_IDS)[number];

export type DiceSkinPattern = "solid" | "marble" | "void-swirl" | "chrome";

export type DiceSkinDef = {
  id: DiceSkinId;
  labelDe: string;
  /** Palette-Swatch (CSS). */
  swatch: string;
  bodyColor: string;
  numeralColor: string;
  pattern: DiceSkinPattern;
  /** SL-Voreinstellung / nur in der GM-Palette hervorgehoben. */
  gmPreset?: boolean;
};

/** Sentinel-Charakter-Id für SL-Würfe ohne PC. */
export const GM_DICE_ROLLER_ID = "__gm__";
export const GM_DICE_ROLLER_NAME = "Spielleiter";

export function isGmDiceRollerId(characterId: string | null | undefined): boolean {
  return characterId === GM_DICE_ROLLER_ID;
}

export const DICE_SKINS: readonly DiceSkinDef[] = [
  {
    id: "gm-marble",
    labelDe: "SL Marmor",
    swatch:
      "linear-gradient(135deg, #f2f2f0 0%, #c8c8c4 40%, #9a9a96 55%, #e8e8e6 100%)",
    bodyColor: "#d4d4d0",
    numeralColor: "#c41e1e",
    pattern: "marble",
    gmPreset: true,
  },
  {
    id: "gm-void",
    labelDe: "SL Void",
    swatch:
      "radial-gradient(circle at 30% 30%, #9b59ff 0%, #2a0a3d 45%, #050508 100%)",
    bodyColor: "#0a0a0e",
    numeralColor: "#7ec8ff",
    pattern: "void-swirl",
    gmPreset: true,
  },
  {
    id: "gm-chrome",
    labelDe: "SL Chrom",
    swatch:
      "linear-gradient(135deg, #fff8e7 0%, #e8c547 35%, #8a7020 70%, #f5e6a8 100%)",
    bodyColor: "#c9a227",
    numeralColor: "#3d2914",
    pattern: "chrome",
    gmPreset: true,
  },
  {
    id: "red",
    labelDe: "Rot",
    swatch: "#a11d1d",
    bodyColor: "#8b1a1a",
    numeralColor: "#ffffff",
    pattern: "solid",
  },
  {
    id: "blue",
    labelDe: "Blau",
    swatch: "#1e4a8c",
    bodyColor: "#1a3d78",
    numeralColor: "#ffffff",
    pattern: "solid",
  },
  {
    id: "green",
    labelDe: "Grün",
    swatch: "#217d42",
    bodyColor: "#1b5e34",
    numeralColor: "#ffffff",
    pattern: "solid",
  },
  {
    id: "violet",
    labelDe: "Violett",
    swatch: "#5b2d8e",
    bodyColor: "#4a2474",
    numeralColor: "#ffffff",
    pattern: "solid",
  },
  {
    id: "black",
    labelDe: "Schwarz",
    swatch: "#1a1a1a",
    bodyColor: "#141414",
    numeralColor: "#f0f0f0",
    pattern: "solid",
  },
  {
    id: "white",
    labelDe: "Weiß",
    swatch: "#e8e8e8",
    bodyColor: "#e0e0e0",
    numeralColor: "#1a1a1a",
    pattern: "solid",
  },
  {
    id: "gold",
    labelDe: "Gold",
    swatch: "#cab926",
    bodyColor: "#b8a61f",
    numeralColor: "#1a1408",
    pattern: "solid",
  },
  {
    id: "orange",
    labelDe: "Orange",
    swatch: "#c45c12",
    bodyColor: "#a84d0f",
    numeralColor: "#ffffff",
    pattern: "solid",
  },
] as const;

const SKIN_BY_ID = new Map<DiceSkinId, DiceSkinDef>(
  DICE_SKINS.map((s) => [s.id, s]),
);

export function isDiceSkinId(value: unknown): value is DiceSkinId {
  return typeof value === "string" && DICE_SKIN_IDS.includes(value as DiceSkinId);
}

export function parseDiceSkinId(value: unknown): DiceSkinId | null {
  return isDiceSkinId(value) ? value : null;
}

/** SL: Marmor; Spieler: klassisches Grün (TableHeroes). */
export function defaultDiceSkinId(isGM: boolean): DiceSkinId {
  return isGM ? "gm-marble" : "green";
}

export function getDiceSkin(id: DiceSkinId | null | undefined): DiceSkinDef {
  if (id && SKIN_BY_ID.has(id)) return SKIN_BY_ID.get(id)!;
  return SKIN_BY_ID.get("green")!;
}

/** Skins für die Palette — SL-Presets nur für Spielleiter. */
export function diceSkinsForPalette(isGM: boolean): readonly DiceSkinDef[] {
  if (isGM) return DICE_SKINS;
  return DICE_SKINS.filter((s) => !s.gmPreset);
}

export function diceSkinStorageKey(userId: string): string {
  return `th:dice-skin:${userId}`;
}

export const DICE_SKIN_CHANGED_EVENT = "th:dice-skin-changed";

export type DiceSkinChangedDetail = {
  userId: string;
  skinId: DiceSkinId;
};

export function readStoredDiceSkin(
  userId: string | null | undefined,
  isGM: boolean,
): DiceSkinId {
  const fallback = defaultDiceSkinId(isGM);
  if (!userId || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(diceSkinStorageKey(userId));
    const parsed = parseDiceSkinId(raw);
    if (!parsed) return fallback;
    if (!isGM && getDiceSkin(parsed).gmPreset) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function writeStoredDiceSkin(
  userId: string | null | undefined,
  skinId: DiceSkinId,
): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(diceSkinStorageKey(userId), skinId);
    window.dispatchEvent(
      new CustomEvent<DiceSkinChangedDetail>(DICE_SKIN_CHANGED_EVENT, {
        detail: { userId, skinId },
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}
