import type { Json } from "@/src/lib/database.types";
import type { CampQualityId, TravelWeatherId } from "@/src/lib/travel-weather-rules";
import {
  getWeatherRule,
  resolveCampQuality,
  weatherFapPlayerExtra,
} from "@/src/lib/travel-weather-rules";

/** 6 FAP pro Tag: 3 Tagesabschnitte + 3 Nachtabschnitte */
export const FAP_PARTS_PER_DAY = 6;

export const FAP_DAY_PART_LABELS = ["Vormittag", "Mittag", "Abend"] as const;
export const FAP_NIGHT_PART_LABELS = ["Nacht I", "Nacht II", "Nacht III"] as const;
export const FAP_PART_LABELS = [...FAP_DAY_PART_LABELS, ...FAP_NIGHT_PART_LABELS] as const;

export type DowntimeMode = "travel" | "leisure";

/** Reisetempo */
export type TravelPace = "normal" | "fast" | "extreme";

/** Fortbewegungsmittel */
export type TravelTransport = "foot" | "horse";

/** Proviant-Strategie */
export type ProvisionsMode = "ration" | "hunt_daily";

export type TravelDayLog = {
  day: number;
  status?: "in_progress" | "completed";
  /** W20-Wurf der Gruppe (Wetter) */
  weatherRoll?: number;
  weatherId?: TravelWeatherId;
  /** Legacy-Text */
  weather?: string;
  /** Tempo an diesem Tag */
  pace?: TravelPace;
  /** Überleben-Wurf (Rastplatz) — effektiv nach SL-Modifikator */
  survivalRoll?: number;
  survivalEffective?: number;
  campQualityId?: CampQualityId;
  kmThisDay?: number;
  fapWeatherExtra?: number;
  fapCampExtra?: number;
  fapCampBonus?: number;
  travelHalted?: boolean;
  encounter?: string;
  event?: string;
  notes?: string;
};

/** Reise-/Freizeit-Konfiguration (persistiert in session_live_states.downtime_config) */
export type DowntimeConfig = {
  mode: DowntimeMode;
  pace?: TravelPace;
  transport?: TravelTransport;
  provisions?: ProvisionsMode;
  fromLocation?: string;
  toLocation?: string;
  distanceKm?: number;
  /** Bereits zurückgelegte Strecke */
  kmTraveled?: number;
  /** Ziel unbekannt — Kalender wächst dynamisch */
  openEnded?: boolean;
  /** Kalender-Slots (mindestens currentDay + Puffer) */
  calendarSlots?: number;
  dayLogs?: TravelDayLog[];
};

export const TRAVEL_PACE_LABELS: Record<TravelPace, string> = {
  normal: "Normal",
  fast: "Schnell",
  extreme: "Extrem schnell",
};

export const TRAVEL_TRANSPORT_LABELS: Record<TravelTransport, string> = {
  foot: "Zu Fuß",
  horse: "Zu Pferd",
};

export const PROVISIONS_LABELS: Record<ProvisionsMode, string> = {
  ration: "Rationieren",
  hunt_daily: "Täglich jagen (1 FAP Gruppe)",
};

/** Kilometer pro Tag bei normalem Tempo (3 FAP Reise) */
export const TRAVEL_KM_PER_DAY: Record<TravelTransport, number> = {
  foot: 30,
  horse: 70,
};

export function defaultDowntimeConfig(mode: DowntimeMode = "travel"): DowntimeConfig {
  return {
    mode,
    pace: "normal",
    transport: "foot",
    provisions: "ration",
    dayLogs: [],
  };
}

export function parseDowntimeConfig(raw: Json | unknown | null | undefined): DowntimeConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultDowntimeConfig();
  }
  const r = raw as Record<string, unknown>;
  const mode = r.mode === "leisure" ? "leisure" : "travel";
  const pace =
    r.pace === "fast" || r.pace === "extreme" || r.pace === "normal" ? r.pace : "normal";
  const transport = r.transport === "horse" ? "horse" : "foot";
  const provisions = r.provisions === "hunt_daily" ? "hunt_daily" : "ration";

  const dayLogs: TravelDayLog[] = [];
  if (Array.isArray(r.dayLogs)) {
    for (const entry of r.dayLogs) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const day = Math.max(1, Math.round(Number(e.day) || 1));
      dayLogs.push({
        day,
        status: e.status === "completed" ? "completed" : e.status === "in_progress" ? "in_progress" : undefined,
        weatherRoll: e.weatherRoll != null ? Number(e.weatherRoll) : undefined,
        weatherId: typeof e.weatherId === "string" ? (e.weatherId as TravelWeatherId) : undefined,
        weather: e.weather != null ? String(e.weather) : undefined,
        pace:
          e.pace === "fast" || e.pace === "extreme" || e.pace === "normal"
            ? e.pace
            : undefined,
        survivalRoll: e.survivalRoll != null ? Number(e.survivalRoll) : undefined,
        survivalEffective: e.survivalEffective != null ? Number(e.survivalEffective) : undefined,
        campQualityId:
          typeof e.campQualityId === "string" ? (e.campQualityId as CampQualityId) : undefined,
        kmThisDay: e.kmThisDay != null ? Number(e.kmThisDay) : undefined,
        fapWeatherExtra: e.fapWeatherExtra != null ? Number(e.fapWeatherExtra) : undefined,
        fapCampExtra: e.fapCampExtra != null ? Number(e.fapCampExtra) : undefined,
        fapCampBonus: e.fapCampBonus != null ? Number(e.fapCampBonus) : undefined,
        travelHalted: e.travelHalted === true,
        encounter: e.encounter != null ? String(e.encounter) : undefined,
        event: e.event != null ? String(e.event) : undefined,
        notes: e.notes != null ? String(e.notes) : undefined,
      });
    }
  }

  return {
    mode,
    pace,
    transport,
    provisions,
    fromLocation: r.fromLocation != null ? String(r.fromLocation) : undefined,
    toLocation: r.toLocation != null ? String(r.toLocation) : undefined,
    distanceKm:
      r.distanceKm != null && Number.isFinite(Number(r.distanceKm))
        ? Math.max(0, Number(r.distanceKm))
        : undefined,
    kmTraveled:
      r.kmTraveled != null && Number.isFinite(Number(r.kmTraveled))
        ? Math.max(0, Number(r.kmTraveled))
        : 0,
    openEnded: r.openEnded === true,
    calendarSlots:
      r.calendarSlots != null && Number.isFinite(Number(r.calendarSlots))
        ? Math.max(1, Math.round(Number(r.calendarSlots)))
        : undefined,
    dayLogs,
  };
}

export function downtimeConfigToJson(config: DowntimeConfig): Json {
  return config as unknown as Json;
}

/** FAP, die pro Tag automatisch für Reisen verbraucht werden */
export function travelFapCostPerDay(config: DowntimeConfig): number {
  if (config.mode === "leisure") return 0;
  switch (config.pace ?? "normal") {
    case "fast":
      return 4;
    case "extreme":
      return 5;
    default:
      return 3;
  }
}

/** Verbleibendes Spieler-Budget pro Tag (nach Reise-FAP) */
export function playerFapBudgetPerDay(config: DowntimeConfig): number {
  if (config.mode === "leisure") return FAP_PARTS_PER_DAY;
  const travel = travelFapCostPerDay(config);
  let budget = Math.max(0, FAP_PARTS_PER_DAY - travel);
  if (config.provisions === "hunt_daily") {
    budget = Math.max(0, budget - 1);
  }
  return budget;
}

/** Mindest-Schlaf-FAP bei schneller Reise */
export function mandatorySleepFap(config: DowntimeConfig, sleepDebtFap: number): number {
  const base = sleepDebtFap > 0 ? 3 : 2;
  if (config.mode === "travel" && config.pace === "fast") {
    return Math.max(base, 2);
  }
  return base;
}

/** Erschöpfungsstufen, die an diesem Reisetag dazukommen */
export function exhaustionGainForDay(
  config: DowntimeConfig,
  currentDay: number,
  totalDays: number,
): number {
  if (config.mode !== "travel") return 0;
  if (config.pace === "fast") return 1;
  if (config.pace === "extreme") {
    if (totalDays <= 0) return 0;
    const remaining = 5;
    const perDay = Math.floor(remaining / totalDays);
    const extra = remaining % totalDays;
    return perDay + (currentDay <= extra ? 1 : 0);
  }
  return 0;
}

/** Maximale Reisetage bei extrem schneller Reise */
export function maxTravelDaysForPace(pace: TravelPace | undefined): number {
  if (pace === "extreme") return 3;
  return 60;
}

/** Gesamt-FAP über alle Freizeittage (z. B. 3 Tage Stadt = 18) */
export function totalLeisureFap(totalDays: number): number {
  return Math.max(0, totalDays) * FAP_PARTS_PER_DAY;
}

/** Kilometer pro Tag bei gewähltem Transport (normales Gelände, normales Tempo) */
export function kmPerDayForTransport(transport: TravelTransport): number {
  return TRAVEL_KM_PER_DAY[transport];
}

/** Geschätzte Reisetage aus Distanz */
export function estimateTravelDays(distanceKm: number, transport: TravelTransport): number {
  const perDay = kmPerDayForTransport(transport);
  if (perDay <= 0) return 1;
  return Math.max(1, Math.ceil(distanceKm / perDay));
}

/** Spieler-Budget für einen konkreten Tag (Wetter, Lager, Tempo) */
export function playerFapBudgetForDay(
  config: DowntimeConfig,
  dayLog?: TravelDayLog | null,
): number {
  if (config.mode === "leisure") return FAP_PARTS_PER_DAY;
  const pace = dayLog?.pace ?? config.pace ?? "normal";
  const paceConfig: DowntimeConfig = { ...config, pace };
  let budget = playerFapBudgetPerDay(paceConfig);
  const weather = getWeatherRule(dayLog?.weatherId);
  if (weather) {
    budget = Math.max(0, budget - weatherFapPlayerExtra(weather, config.transport ?? "foot"));
    if (weather.fapTravelExtra > 0) {
      budget = Math.max(0, budget - weather.fapTravelExtra);
    }
  }
  if (dayLog?.fapCampExtra) budget = Math.max(0, budget - dayLog.fapCampExtra);
  if (dayLog?.fapCampBonus) budget = Math.min(FAP_PARTS_PER_DAY, budget + dayLog.fapCampBonus);
  return budget;
}

export function getDayLog(config: DowntimeConfig, day: number): TravelDayLog | undefined {
  return config.dayLogs?.find((l) => l.day === day);
}

/** Kalender-Tage zum Anzeigen */
export function calendarDayCount(
  config: DowntimeConfig,
  currentDay: number,
  totalDays: number,
): number {
  if (config.openEnded) {
    return Math.max(currentDay + 2, config.calendarSlots ?? currentDay + 4);
  }
  return Math.max(totalDays, config.calendarSlots ?? totalDays);
}

export function travelProgressPct(config: DowntimeConfig): number | null {
  const target = config.distanceKm;
  if (!target || target <= 0) return null;
  const traveled = config.kmTraveled ?? 0;
  return Math.min(100, Math.round((traveled / target) * 100));
}

export function formatTravelSummary(config: DowntimeConfig): string {
  if (config.mode === "leisure") {
    return "Freizeit (volle 6 FAP/Tag)";
  }
  const parts = [
    TRAVEL_PACE_LABELS[config.pace ?? "normal"],
    TRAVEL_TRANSPORT_LABELS[config.transport ?? "foot"],
    PROVISIONS_LABELS[config.provisions ?? "ration"],
  ];
  if (config.fromLocation && config.toLocation) {
    parts.unshift(`${config.fromLocation} → ${config.toLocation}`);
  }
  return parts.join(" · ");
}
