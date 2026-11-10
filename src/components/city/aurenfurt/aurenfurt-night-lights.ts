/**
 * Nacht-Lichtpunkte für die Stadttafel — an Radialstraßen, Ring und Landmarken
 * aus der Aufsicht `aurenfurt.jpg` / District-Winkel abgeleitet.
 */

import { CITY_BUILDINGS, AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { CITY_CENTER, polarToImage } from "./aurenfurt-layout";
import { MAP_SURFACE_Y, surfacePoint } from "./scene/diorama-geometry";

export type NightLightKind = "street" | "window" | "gate" | "palace";

export type NightLightSpot = {
  u: number;
  v: number;
  kind: NightLightKind;
  /** 0.5–1.4 Skala der Sprite-Größe. */
  scale: number;
  /** Warme Tint-Stärke. */
  warmth: number;
};

/** Große Radialalleen = Viertelgrenzen (+ Norden 0°). */
const AVENUE_ANGLES = [0, 32, 76, 112, 166, 198, 292] as const;
/** Laternen entlang der Alleen (innen → außen). */
const AVENUE_RADII = [0.3, 0.42, 0.55, 0.68, 0.82] as const;
/** Innerer Ring um den Palast. */
const RING_RADIUS = 0.26;
const RING_STEPS = 16;

function midAngle(start: number, end: number) {
  const span = (end - start + 360) % 360;
  return (start + span / 2) % 360;
}

function pushUnique(target: NightLightSpot[], spot: NightLightSpot, minDist = 0.018) {
  for (const existing of target) {
    const du = existing.u - spot.u;
    const dv = existing.v - spot.v;
    if (du * du + dv * dv < minDist * minDist) return;
  }
  target.push(spot);
}

/**
 * Statische Lichtkarte: Alleen, Ring, Tore, Fenster an bekannten Gebäuden.
 * Dichter in Unterstadt / Handwerk (rote/braune Dachviertel).
 */
export function buildNightLightSpots(): NightLightSpot[] {
  const spots: NightLightSpot[] = [];

  for (const angle of AVENUE_ANGLES) {
    for (const radius of AVENUE_RADII) {
      const { u, v } = polarToImage(angle, radius);
      pushUnique(spots, {
        u,
        v,
        kind: radius > 0.75 ? "gate" : "street",
        scale: radius > 0.75 ? 1.15 : 0.85 + radius * 0.25,
        warmth: radius > 0.75 ? 1 : 0.75,
      });
    }
  }

  for (let i = 0; i < RING_STEPS; i += 1) {
    const angle = (i / RING_STEPS) * 360;
    const { u, v } = polarToImage(angle, RING_RADIUS);
    pushUnique(spots, { u, v, kind: "street", scale: 0.72, warmth: 0.85 }, 0.014);
  }

  // Palastkuppel / Hof — hellster Kern.
  pushUnique(spots, {
    u: CITY_CENTER.u,
    v: CITY_CENTER.v,
    kind: "palace",
    scale: 1.55,
    warmth: 1.2,
  });
  pushUnique(spots, {
    u: CITY_CENTER.u + 0.015,
    v: CITY_CENTER.v + 0.01,
    kind: "palace",
    scale: 0.9,
    warmth: 1,
  });
  pushUnique(spots, {
    u: CITY_CENTER.u - 0.012,
    v: CITY_CENTER.v - 0.008,
    kind: "palace",
    scale: 0.8,
    warmth: 0.95,
  });

  // Seitenstraßen-Laternen in dichten Vierteln.
  const dense: CityDistrictId[] = ["unterstadt", "handwerkerviertel", "suedtor"];
  for (const district of AURENFURT_DISTRICTS) {
    if (district.id === "palast") continue;
    const mid = midAngle(district.start, district.end);
    const radii = dense.includes(district.id) ? [0.38, 0.5, 0.64, 0.76] : [0.4, 0.58, 0.74];
    for (const radius of radii) {
      const left = polarToImage((mid - 8 + 360) % 360, radius);
      const right = polarToImage((mid + 8) % 360, radius);
      pushUnique(spots, {
        u: left.u,
        v: left.v,
        kind: "street",
        scale: dense.includes(district.id) ? 0.78 : 0.65,
        warmth: 0.7,
      });
      pushUnique(spots, {
        u: right.u,
        v: right.v,
        kind: "street",
        scale: dense.includes(district.id) ? 0.78 : 0.65,
        warmth: 0.7,
      });
    }
  }

  // Fenster / Hoflicht an Landmarken und wichtigen Häusern.
  for (const building of CITY_BUILDINGS) {
    const isGate = building.kind === "gate";
    const isTavern = building.kind === "tavern";
    const isPalace = building.districtId === "palast";
    const denseDistrict = dense.includes(building.districtId);
    pushUnique(
      spots,
      {
        u: building.u,
        v: building.v,
        kind: isGate ? "gate" : isPalace ? "palace" : "window",
        scale: isGate ? 1.25 : isTavern ? 1.05 : isPalace ? 1.1 : 0.7,
        warmth: isTavern || isGate ? 1.05 : 0.8,
      },
      0.012,
    );
    if (denseDistrict || isTavern) {
      pushUnique(
        spots,
        {
          u: building.u + 0.012,
          v: building.v - 0.008,
          kind: "window",
          scale: 0.55,
          warmth: 0.75,
        },
        0.01,
      );
    }
  }

  return spots;
}

export function nightLightWorldPosition(spot: { u: number; v: number }, lift = 0.006) {
  const point = surfacePoint(spot.u, spot.v);
  return { x: point.x, y: MAP_SURFACE_Y + lift, z: point.z };
}
