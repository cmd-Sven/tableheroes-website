import type { TravelPace, TravelTransport } from "@/src/lib/travel-fap-config";

/** Wetter-Typen (SL wählt nach W20-Wurf der Gruppe) */
export type TravelWeatherId =
  | "clear"
  | "warm"
  | "cold"
  | "light_fog"
  | "heavy_precipitation"
  | "strong_wind"
  | "heavy_fog"
  | "ice"
  | "extreme_heat"
  | "extreme_cold"
  | "severe_storm";

export type CampQualityId =
  | "unsuitable"
  | "poor"
  | "adequate"
  | "good"
  | "perfect";

export type TravelWeatherRule = {
  id: TravelWeatherId;
  label: string;
  w20Range: string;
  effect: string;
  speedFootPct: number;
  speedHorsePct: number;
  fapTravelExtra: number;
  fapPlayerExtraMin: number;
  fapPlayerExtraMax: number;
  fapNotes: string;
  survivalMod: number | "disadvantage";
  mandatoryCampFap?: number;
};

export type CampQualityRule = {
  id: CampQualityId;
  label: string;
  w20Range: string;
  effect: string;
  fapExtra: number;
  fapBonus: number;
};

export const TRAVEL_WEATHER_RULES: TravelWeatherRule[] = [
  {
    id: "clear",
    label: "Klar / Normal",
    w20Range: "1–7",
    effect: "Keine negativen Effekte. Normale Sicht und Bewegung.",
    speedFootPct: 100,
    speedHorsePct: 100,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 0,
    fapPlayerExtraMax: 0,
    fapNotes: "Regulärer Ablauf (3 FAP Reise / 3 FAP frei bei normaler Reise).",
    survivalMod: 0,
  },
  {
    id: "warm",
    label: "Warm",
    w20Range: "8–9",
    effect: "25–37 °C. Wasserbedarf verdoppelt (8 L/Tag).",
    speedFootPct: 90,
    speedHorsePct: 85,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 0,
    fapPlayerExtraMax: 1,
    fapNotes: "Optional +1 FAP Reise, um Pferdetempo ohne Abzug zu halten.",
    survivalMod: 0,
  },
  {
    id: "cold",
    label: "Kälte",
    w20Range: "10–11",
    effect: "−16 bis 0 °C. Keine Rast-Erholung ohne Schutz.",
    speedFootPct: 95,
    speedHorsePct: 90,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 0,
    fapPlayerExtraMax: 0,
    fapNotes: "1 FAP Abend zwingend für isoliertes Lager/Feuer.",
    survivalMod: 0,
    mandatoryCampFap: 1,
  },
  {
    id: "light_fog",
    label: "Leichter Nebel",
    w20Range: "12–13",
    effect: "Lightly Obscured. Nachteil auf Perception (Sehen).",
    speedFootPct: 95,
    speedHorsePct: 90,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 0,
    fapPlayerExtraMax: 0,
    fapNotes: "Erhöhte Vorsicht bei Orientierung.",
    survivalMod: -1,
  },
  {
    id: "heavy_precipitation",
    label: "Starkregen / Schnee",
    w20Range: "14",
    effect: "Lightly Obscured. Feuer erlischt leicht.",
    speedFootPct: 75,
    speedHorsePct: 60,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 1,
    fapPlayerExtraMax: 1,
    fapNotes: "+1 FAP aus Spieler-Budget (schlammige Wege).",
    survivalMod: -3,
  },
  {
    id: "strong_wind",
    label: "Starker Wind",
    w20Range: "15",
    effect: "Nachteil Fernkampf. Fliegen verboten.",
    speedFootPct: 80,
    speedHorsePct: 75,
    fapTravelExtra: 1,
    fapPlayerExtraMin: 1,
    fapPlayerExtraMax: 1,
    fapNotes: "+1 FAP Reise, um Tempo zu halten.",
    survivalMod: -2,
  },
  {
    id: "heavy_fog",
    label: "Dichter Nebel",
    w20Range: "16",
    effect: "Heavily Obscured. Effektiv Blinded.",
    speedFootPct: 60,
    speedHorsePct: 40,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 1,
    fapPlayerExtraMax: 2,
    fapNotes: "+1 FAP (Fuß) / +2 FAP (Pferd) Orientierungssuche.",
    survivalMod: -1,
  },
  {
    id: "ice",
    label: "Glatteis / Eisregen",
    w20Range: "17",
    effect: "Difficult Terrain. DC 10 DEX-Save bei Tempo sonst Prone.",
    speedFootPct: 50,
    speedHorsePct: 25,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 2,
    fapPlayerExtraMax: 2,
    fapNotes: "+2 FAP extra fürs Tagesziel (Pferde geführt).",
    survivalMod: -4,
  },
  {
    id: "extreme_heat",
    label: "Extreme Hitze",
    w20Range: "18",
    effect: "≥ 38 °C. Stündlich CON-Save (DC 5 + 1/h), sonst Erschöpfung.",
    speedFootPct: 50,
    speedHorsePct: 35,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 2,
    fapPlayerExtraMax: 2,
    fapNotes: "Mittagspause (2 FAP Schatten). Reise verschiebt sich in Nacht-FAP.",
    survivalMod: "disadvantage",
  },
  {
    id: "extreme_cold",
    label: "Extreme Kälte",
    w20Range: "19",
    effect: "≤ −17 °C. Stündlich DC 10 CON-Save, sonst Erschöpfung.",
    speedFootPct: 60,
    speedHorsePct: 45,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 1,
    fapPlayerExtraMax: 2,
    fapNotes: "+1/+2 FAP Reise. 1 FAP Lager für Auftauen von Wasser/Rationen.",
    survivalMod: -4,
    mandatoryCampFap: 1,
  },
  {
    id: "severe_storm",
    label: "Schweres Unwetter",
    w20Range: "20",
    effect: "Gewitter / Hagel / Sandsturm.",
    speedFootPct: 25,
    speedHorsePct: 10,
    fapTravelExtra: 0,
    fapPlayerExtraMin: 3,
    fapPlayerExtraMax: 3,
    fapNotes: "+3 FAP extra oder Reisestopp zum Schutz.",
    survivalMod: "disadvantage",
  },
];

export const CAMP_QUALITY_RULES: CampQualityRule[] = [
  {
    id: "unsuitable",
    label: "Ungeeignet / Gefährlich",
    w20Range: "1–4",
    effect: "Kein geschützter Platz. Lange Rast: halbe HP/TW. Bei Extremwetter CON-Saves automatisch fehl.",
    fapExtra: 1,
    fapBonus: 0,
  },
  {
    id: "poor",
    label: "Mangelhaft",
    w20Range: "5–9",
    effect: "Minimaler Schutz. Feuer bei Regen/Wind: DC 12 Überleben.",
    fapExtra: 1,
    fapBonus: 0,
  },
  {
    id: "adequate",
    label: "Passabel",
    w20Range: "10–14",
    effect: "Standard-Lager. Normaler Wetterschutz.",
    fapExtra: 0,
    fapBonus: 0,
  },
  {
    id: "good",
    label: "Gut / Geschützt",
    w20Range: "15–19",
    effect: "+1 FAP zurück. Vorteil auf Rettungswürfe gegen Umwelt im Lager.",
    fapExtra: 0,
    fapBonus: 1,
  },
  {
    id: "perfect",
    label: "Perfekte Zuflucht",
    w20Range: "20+",
    effect: "+1 FAP zurück. Getarnt (Nachteil Wahrnehmung Monster). Lange Rast: −1 Erschöpfung extra.",
    fapExtra: 0,
    fapBonus: 1,
  },
];

export function getWeatherRule(id: TravelWeatherId | undefined | null): TravelWeatherRule | null {
  if (!id) return null;
  return TRAVEL_WEATHER_RULES.find((w) => w.id === id) ?? null;
}

export function resolveCampQuality(effectiveRoll: number): CampQualityRule {
  const r = Math.round(effectiveRoll);
  if (r <= 4) return CAMP_QUALITY_RULES[0];
  if (r <= 9) return CAMP_QUALITY_RULES[1];
  if (r <= 14) return CAMP_QUALITY_RULES[2];
  if (r <= 19) return CAMP_QUALITY_RULES[3];
  return CAMP_QUALITY_RULES[4];
}

export function weatherFromW20(roll: number): TravelWeatherId {
  const r = Math.max(1, Math.min(20, Math.round(roll)));
  if (r <= 7) return "clear";
  if (r <= 9) return "warm";
  if (r <= 11) return "cold";
  if (r <= 13) return "light_fog";
  if (r === 14) return "heavy_precipitation";
  if (r === 15) return "strong_wind";
  if (r === 16) return "heavy_fog";
  if (r === 17) return "ice";
  if (r === 18) return "extreme_heat";
  if (r === 19) return "extreme_cold";
  return "severe_storm";
}

export function formatSurvivalMod(mod: number | "disadvantage"): string {
  if (mod === "disadvantage") return "Nachteil (2W20, niedrigeres)";
  if (mod === 0) return "±0";
  return mod > 0 ? `+${mod}` : String(mod);
}

/** Kilometer an diesem Tag (Basis × Wetter × Transport) */
export function calculateDayKm(params: {
  transport: TravelTransport;
  weather: TravelWeatherRule | null;
  baseKmPerDay: number;
  travelHalted?: boolean;
}): number {
  if (params.travelHalted || !params.weather) return 0;
  const pct =
    params.transport === "horse" ? params.weather.speedHorsePct : params.weather.speedFootPct;
  return Math.round((params.baseKmPerDay * pct) / 100);
}

/** FAP-Mehrkosten Wetter (Spieler-Budget) — Fuß vs. Pferd */
export function weatherFapPlayerExtra(
  weather: TravelWeatherRule | null,
  transport: TravelTransport,
): number {
  if (!weather) return 0;
  if (weather.id === "heavy_fog") {
    return transport === "horse" ? 2 : 1;
  }
  if (weather.id === "extreme_cold") {
    return transport === "horse" ? 2 : 1;
  }
  return weather.fapPlayerExtraMax;
}

export function isDayWorkflowComplete(log: {
  weatherId?: string;
  pace?: TravelPace;
  survivalRoll?: number;
  travelHalted?: boolean;
}): boolean {
  if (!log.weatherId) return false;
  if (!log.pace && !log.travelHalted) return false;
  if (log.survivalRoll == null || !Number.isFinite(log.survivalRoll)) return false;
  return true;
}
