import type { CSSProperties } from "react";

export type ImageDisplayFit = "cover" | "contain";

/** Gespeichert in DB (world_lore / npcs / factions / optional pro Galerie-Eintrag). */
export type ImageDisplaySettings = {
  fit: ImageDisplayFit;
  /** horizontaler Bildausschnitt 0 = links, 100 = rechts */
  posX: number;
  /** vertikaler Bildausschnitt 0 = oben, 100 = unten */
  posY: number;
  /** Hintergrund bei „Ganzes Bild“ (Contain), z. B. Portrait im Querformat */
  letterboxColor: string;
};

export const DEFAULT_IMAGE_DISPLAY: ImageDisplaySettings = {
  fit: "cover",
  posX: 50,
  posY: 18,
  letterboxColor: "#0a1f10",
};

const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Aus DB / JSON / Formular – liefert immer gültige Werte. */
export function normalizeImageDisplay(raw: unknown): ImageDisplaySettings {
  if (raw == null || typeof raw !== "object") {
    return { ...DEFAULT_IMAGE_DISPLAY };
  }
  const o = raw as Record<string, unknown>;
  const fit: ImageDisplayFit = o.fit === "contain" ? "contain" : "cover";

  let posX = DEFAULT_IMAGE_DISPLAY.posX;
  let posY = DEFAULT_IMAGE_DISPLAY.posY;
  if (typeof o.posX === "number" && Number.isFinite(o.posX)) {
    posX = clamp(o.posX, 0, 100);
  }
  if (typeof o.posY === "number" && Number.isFinite(o.posY)) {
    posY = clamp(o.posY, 0, 100);
  }

  let letterboxColor =
    typeof o.letterboxColor === "string" ? o.letterboxColor.trim() : DEFAULT_IMAGE_DISPLAY.letterboxColor;
  if (!HEX.test(letterboxColor)) {
    letterboxColor = DEFAULT_IMAGE_DISPLAY.letterboxColor;
  }

  return { fit, posX, posY, letterboxColor };
}

export function imageDisplayToObjectPosition(d: ImageDisplaySettings): string {
  return `${clamp(d.posX, 0, 100)}% ${clamp(d.posY, 0, 100)}%`;
}

/** Hintergrund nur bei Contain (Letterboxing). */
export function imageDisplayBackdropStyle(d: ImageDisplaySettings): CSSProperties {
  if (d.fit !== "contain") {
    return { backgroundColor: "transparent" };
  }
  return { backgroundColor: d.letterboxColor };
}

/** object-fit + object-position für next/image (fill). */
export function imageDisplayObjectStyle(d: ImageDisplaySettings): CSSProperties {
  return {
    objectFit: d.fit,
    objectPosition: imageDisplayToObjectPosition(d),
  };
}

/** JSON für Supabase jsonb (Klone ohne Zirkulare Referenzen). */
export function imageDisplayToJson(d: ImageDisplaySettings): Record<string, unknown> {
  const n = normalizeImageDisplay(d);
  return {
    fit: n.fit,
    posX: n.posX,
    posY: n.posY,
    letterboxColor: n.letterboxColor,
  };
}
