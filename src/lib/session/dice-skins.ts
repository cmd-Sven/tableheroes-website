/**
 * Per-Spieler Würfel-Skins für Live-Session 3D-Würfel.
 * Persistenz: localStorage `th:dice-skin:{userId}` — Skin-Id wandert im Roll-Meta mit.
 */

export const DICE_SKIN_IDS = [
  "gm-marble",
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

export type DiceSkinPattern = "solid" | "marble";

export type DiceSkinDef = {
  id: DiceSkinId;
  labelDe: string;
  /** Palette-Swatch (CSS). */
  swatch: string;
  bodyColor: string;
  numeralColor: string;
  pattern: DiceSkinPattern;
  /** SL-Voreinstellung / Marmor-Preset. */
  gmPreset?: boolean;
};

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
    return parseDiceSkinId(raw) ?? fallback;
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
