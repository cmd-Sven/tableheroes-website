/**
 * Client-Persistenz für Verwaltung: Garde Soll/Ist, aktive Kaiser-Karten, Automationen.
 * Soll speichern → Ist driftet verzögert (kein Sofort-Snap).
 */

import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { findKaiserCard, KAISER_EVENT_CARDS, type KaiserEventCard } from "./aurenfurt-kaiser-cards";
import { bumpCitySimVersion, subscribeCitySim } from "./aurenfurt-city-sim-store";

const STORAGE_KEY = "aurenfurt-verwaltung-v1";
const DAY_MS = 86_400_000;
/** Anteil der Lücke Soll→Ist, den die Garde pro Tag schließt. */
export const GUARD_DRIFT_RATE = 0.2;

export type GuardShares = Record<CityDistrictId, number>;

export type ActiveKaiserPlay = {
  playId: string;
  cardId: string;
  startedOn: string;
  districtId: CityDistrictId | null;
};

type VerwaltungState = {
  guardSoll: GuardShares;
  /** ISO-Tag, ab dem der aktuelle Soll gilt (Drift-Start). */
  sollSince: string;
  activeKaiserPlays: ActiveKaiserPlay[];
  /** Keys: `${npcId}:${abilityId}` — deaktivierte Automationen. */
  disabledAutomations: string[];
  /** Kartenmotive der Kaiser-Hand (cardId → öffentliche Bild-URL). */
  kaiserCardImages: Record<string, string>;
};

function equalShares(): GuardShares {
  const n = AURENFURT_DISTRICTS.length;
  const base = Math.floor(10000 / n) / 100;
  const shares = {} as GuardShares;
  let sum = 0;
  for (let i = 0; i < AURENFURT_DISTRICTS.length; i++) {
    const id = AURENFURT_DISTRICTS[i].id;
    if (i === AURENFURT_DISTRICTS.length - 1) {
      shares[id] = Math.round((100 - sum) * 100) / 100;
    } else {
      shares[id] = base;
      sum += base;
    }
  }
  return shares;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDay(iso: string) {
  const ms = Date.parse(`${iso}T12:00:00.000Z`);
  return Number.isFinite(ms) ? ms : Date.now();
}

function normalizeShares(input: Partial<GuardShares>): GuardShares {
  const next = equalShares();
  for (const district of AURENFURT_DISTRICTS) {
    const value = input[district.id];
    if (typeof value === "number" && Number.isFinite(value)) {
      next[district.id] = Math.max(0, Math.min(100, value));
    }
  }
  const sum = AURENFURT_DISTRICTS.reduce((acc, d) => acc + next[d.id], 0);
  if (sum <= 0) return equalShares();
  if (Math.abs(sum - 100) < 0.05) return next;
  const scale = 100 / sum;
  let used = 0;
  for (let i = 0; i < AURENFURT_DISTRICTS.length; i++) {
    const id = AURENFURT_DISTRICTS[i].id;
    if (i === AURENFURT_DISTRICTS.length - 1) {
      next[id] = Math.round((100 - used) * 100) / 100;
    } else {
      next[id] = Math.round(next[id] * scale * 100) / 100;
      used += next[id];
    }
  }
  return next;
}

function normalizeKaiserCardImages(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

function defaultState(): VerwaltungState {
  return {
    guardSoll: equalShares(),
    sollSince: todayIso(),
    activeKaiserPlays: [],
    disabledAutomations: [],
    kaiserCardImages: {},
  };
}

let state: VerwaltungState = defaultState();
let hydrated = false;
let verwaltungVersion = 0;
const verwaltungListeners = new Set<() => void>();

function readStorage(): VerwaltungState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VerwaltungState>;
    return {
      guardSoll: normalizeShares(parsed.guardSoll ?? {}),
      sollSince: typeof parsed.sollSince === "string" ? parsed.sollSince : todayIso(),
      activeKaiserPlays: Array.isArray(parsed.activeKaiserPlays)
        ? parsed.activeKaiserPlays.filter(
            (play): play is ActiveKaiserPlay =>
              Boolean(play && typeof play.playId === "string" && typeof play.cardId === "string"),
          )
        : [],
      disabledAutomations: Array.isArray(parsed.disabledAutomations)
        ? parsed.disabledAutomations.filter((key): key is string => typeof key === "string")
        : [],
      kaiserCardImages: normalizeKaiserCardImages(parsed.kaiserCardImages),
    };
  } catch {
    return null;
  }
}

function writeStorage(next: VerwaltungState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode
  }
}

function emit() {
  verwaltungVersion += 1;
  for (const listener of verwaltungListeners) listener();
  bumpCitySimVersion();
}

export function verwaltungVersionNow() {
  ensureHydrated();
  return verwaltungVersion;
}

export function subscribeVerwaltung(listener: () => void) {
  ensureHydrated();
  verwaltungListeners.add(listener);
  return () => verwaltungListeners.delete(listener);
}

export function subscribeCityAndVerwaltung(listener: () => void) {
  const a = subscribeCitySim(listener);
  const b = subscribeVerwaltung(listener);
  return () => {
    a();
    b();
  };
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const stored = readStorage();
  if (stored) state = stored;
}

function commit(next: VerwaltungState) {
  state = next;
  writeStorage(next);
  emit();
}

export function getGuardSoll(): GuardShares {
  ensureHydrated();
  return { ...state.guardSoll };
}

/**
 * Setzt Soll für ein Viertel und nimmt den Delta anteilig von den anderen
 * (Kapazität begrenzt: mehr hier = weniger woanders).
 */
export function setGuardSollForDistrict(districtId: CityDistrictId, value: number) {
  ensureHydrated();
  const target = Math.max(0, Math.min(100, value));
  const next = { ...state.guardSoll, [districtId]: target };
  const others = AURENFURT_DISTRICTS.filter((d) => d.id !== districtId);
  const remaining = 100 - target;

  if (others.length === 0) {
    commit({ ...state, guardSoll: normalizeShares(next), sollSince: todayIso() });
    return;
  }

  const otherSum = others.reduce((acc, d) => acc + (next[d.id] ?? 0), 0);
  if (otherSum <= 0.01) {
    const each = remaining / others.length;
    for (const d of others) next[d.id] = each;
  } else {
    const scale = remaining / otherSum;
    for (const d of others) next[d.id] = Math.max(0, (next[d.id] ?? 0) * scale);
  }
  commit({ ...state, guardSoll: normalizeShares(next), sollSince: todayIso() });
}

/**
 * Ist-Verteilung am Tag `dayIso`: startet bei Gleichverteilung und driftet
 * ab `sollSince` Richtung aktuellem Soll.
 */
export function getGuardIstOn(dayIso: string): GuardShares {
  ensureHydrated();
  const equal = equalShares();
  const soll = state.guardSoll;
  const start = parseDay(state.sollSince);
  const day = parseDay(dayIso);
  if (day <= start) {
    return blend(equal, soll, 0.35);
  }
  const days = Math.max(0, Math.round((day - start) / DAY_MS));
  const ist = { ...equal };
  for (let i = 0; i < days; i++) {
    for (const d of AURENFURT_DISTRICTS) {
      const id = d.id;
      ist[id] = ist[id] + (soll[id] - ist[id]) * GUARD_DRIFT_RATE;
    }
  }
  return normalizeShares(ist);
}

function blend(a: GuardShares, b: GuardShares, t: number): GuardShares {
  const out = {} as GuardShares;
  for (const d of AURENFURT_DISTRICTS) {
    out[d.id] = a[d.id] * (1 - t) + b[d.id] * t;
  }
  return normalizeShares(out);
}

/** Meter-Bias: Abweichung vom Equal-Share → Garde ±. */
export function guardMeterBias(districtId: CityDistrictId, dayIso: string): number {
  const equal = 100 / AURENFURT_DISTRICTS.length;
  const ist = getGuardIstOn(dayIso)[districtId] ?? equal;
  return (ist - equal) * 0.65;
}

export function getActiveKaiserPlays(): ActiveKaiserPlay[] {
  ensureHydrated();
  return state.activeKaiserPlays.map((play) => ({ ...play }));
}

export function activateKaiserCard(cardId: string, districtId: CityDistrictId | null = null) {
  ensureHydrated();
  const card = findKaiserCard(cardId);
  if (!card) throw new Error("Unbekannte Kaiser-Karte.");
  if (card.scope === "district" && !districtId) {
    throw new Error("Bitte ein Viertel für die Razzia wählen.");
  }
  const play: ActiveKaiserPlay = {
    playId: `kp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cardId,
    startedOn: todayIso(),
    districtId: card.scope === "district" ? districtId : card.scope === "palace" ? "palast" : null,
  };
  commit({ ...state, activeKaiserPlays: [...state.activeKaiserPlays, play] });
  return play;
}

export function remainingDaysForPlay(play: ActiveKaiserPlay, dayIso: string): number {
  const card = findKaiserCard(play.cardId);
  if (!card) return 0;
  const start = parseDay(play.startedOn);
  const day = parseDay(dayIso);
  const elapsed = Math.max(0, Math.round((day - start) / DAY_MS));
  return Math.max(0, card.durationDays - elapsed);
}

export function pruneExpiredKaiserPlays(dayIso: string) {
  ensureHydrated();
  const next = state.activeKaiserPlays.filter((play) => remainingDaysForPlay(play, dayIso) > 0);
  if (next.length === state.activeKaiserPlays.length) return;
  commit({ ...state, activeKaiserPlays: next });
}

export function automationKey(npcId: string, abilityId: string) {
  return `${npcId}:${abilityId}`;
}

export function isAutomationDisabled(npcId: string, abilityId: string) {
  ensureHydrated();
  return state.disabledAutomations.includes(automationKey(npcId, abilityId));
}

export function setAutomationEnabled(npcId: string, abilityId: string, enabled: boolean) {
  ensureHydrated();
  const key = automationKey(npcId, abilityId);
  const set = new Set(state.disabledAutomations);
  if (enabled) set.delete(key);
  else set.add(key);
  commit({ ...state, disabledAutomations: [...set] });
}

export function listKaiserHand(): readonly KaiserEventCard[] {
  return KAISER_EVENT_CARDS.map((card) => withKaiserCardImage(card));
}

export function getKaiserCardImageUrl(cardId: string): string | null {
  ensureHydrated();
  const url = state.kaiserCardImages[cardId];
  return url?.trim() ? url.trim() : null;
}

export function setKaiserCardImageUrl(cardId: string, imageUrl: string | null) {
  ensureHydrated();
  if (!findKaiserCard(cardId)) throw new Error("Unbekannte Kaiser-Karte.");
  const next = { ...state.kaiserCardImages };
  const trimmed = imageUrl?.trim() ?? "";
  if (trimmed) next[cardId] = trimmed;
  else delete next[cardId];
  commit({ ...state, kaiserCardImages: next });
}

export function withKaiserCardImage(card: KaiserEventCard): KaiserEventCard {
  return { ...card, imageUrl: getKaiserCardImageUrl(card.id) };
}

export function resolveKaiserEventCard(cardId: string): KaiserEventCard | null {
  const card = findKaiserCard(cardId);
  return card ? withKaiserCardImage(card) : null;
}

export { KAISER_EVENT_CARDS, findKaiserCard };
