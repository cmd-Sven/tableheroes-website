/**
 * Parsebare Rassenboni aus Kampagnen-Lore (`world_lore.race_traits`)
 * + Katalog für bekannte Kassadras-Rassen.
 */
import type { AbilityKey, Dnd5eFeatureEntry, Dnd5eSheetData, Dnd5eSkillKey, SkillProficiency } from "@/src/lib/characters/dnd5e/types";
import type { AbilityKeyShort } from "@/src/lib/characters/dnd5e/progression/types";
import { DND5E_SKILL_BY_KEY } from "@/src/lib/characters/dnd5e/skills";

export const RACE_BONUSES_MARKER_START = "<<<RACE_BONUSES";
export const RACE_BONUSES_MARKER_END = ">>>";
export const LORE_RACE_FEATURE_SOURCE = "lore-race";

export type LoreRaceAbilityBonuses = Partial<Record<AbilityKeyShort, number>>;

export type LoreRaceFeatureType = "skill" | "other";

export type LoreRaceFeatureEntry = {
  id?: string;
  name: string;
  description: string;
  /** skill = Fertigkeitsbonus; other = Freitext-Besonderheit */
  type?: LoreRaceFeatureType;
  skillKey?: Dnd5eSkillKey;
  skillBonus?: number;
};

export type LoreRaceBonusSpec = {
  v: 1;
  /** Kurzüberblick für UI */
  summary?: string;
  abilityBonuses?: LoreRaceAbilityBonuses;
  features?: LoreRaceFeatureEntry[];
  toolProficiencies?: string[];
  weaponProficiencies?: string[];
  armorProficiencies?: string[];
  skillProficiencies?: string[];
  /** z. B. Zwergische Zähigkeit: +1 TP pro Stufe */
  hpBonusPerLevel?: number;
};

export type ParsedRaceTraits = {
  /** Freitext / narrative Merkmale (ohne JSON-Block) */
  displayText: string;
  bonuses: LoreRaceBonusSpec | null;
};

export type SheetCampaignLoreState = {
  raceLoreId?: string | null;
  religionIds?: string[];
  religionNames?: string[];
  /** Zuletzt angewandte Attributsboni (zum Rückgängigmachen beim Rassenwechsel) */
  appliedAbilityBonuses?: LoreRaceAbilityBonuses;
  appliedRaceKey?: string | null;
  appliedTools?: string[];
  appliedWeapons?: string[];
  appliedSkills?: Partial<Record<Dnd5eSkillKey, SkillProficiency>>;
  appliedSkillBonuses?: Partial<Record<Dnd5eSkillKey, number>>;
  appliedHpBonus?: number;
};

const ABILITY_KEYS: AbilityKeyShort[] = ["str", "dex", "con", "int", "wis", "cha"];

const ABILITY_LABEL_DE: Record<AbilityKeyShort, string> = {
  str: "Stärke",
  dex: "Geschicklichkeit",
  con: "Konstitution",
  int: "Intelligenz",
  wis: "Weisheit",
  cha: "Charisma",
};

export function normalizeRaceKey(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function isExileCultureName(name: string | null | undefined): boolean {
  return /exilant/i.test(name ?? "");
}

/** Rassen einer Kultur: race_ids ∪ culture_id; Exilanten → explizite Liste oder alle. */
export function filterRacesForCulture<T extends { id: string; culture_id?: string | null }>(
  races: T[],
  culture: { id: string; name: string; race_ids: string[] } | null | undefined,
): T[] {
  if (!culture) return [];
  const byIds = new Set(culture.race_ids ?? []);
  const linked = races.filter(
    (r) => byIds.has(r.id) || r.culture_id === culture.id,
  );
  if (linked.length > 0) return linked;
  if (isExileCultureName(culture.name)) return [...races];
  return [];
}

export function serializeRaceTraits(
  displayText: string,
  bonuses: LoreRaceBonusSpec | null,
): string {
  const text = displayText.trim();
  if (!bonuses || !hasLoreRaceBonusContent(bonuses)) return text;
  const block = `${RACE_BONUSES_MARKER_START}\n${JSON.stringify(bonuses, null, 2)}\n${RACE_BONUSES_MARKER_END}`;
  return text ? `${text}\n\n${block}` : block;
}

export function hasLoreRaceBonusContent(spec: LoreRaceBonusSpec): boolean {
  if (spec.summary?.trim()) return true;
  if (spec.abilityBonuses && Object.values(spec.abilityBonuses).some((v) => (v ?? 0) !== 0)) {
    return true;
  }
  if ((spec.features ?? []).length > 0) return true;
  if (spec.toolProficiencies?.length) return true;
  if (spec.weaponProficiencies?.length) return true;
  if (spec.armorProficiencies?.length) return true;
  if (spec.skillProficiencies?.length) return true;
  if (spec.hpBonusPerLevel) return true;
  return false;
}

function normalizeFeatureEntry(raw: LoreRaceFeatureEntry): LoreRaceFeatureEntry {
  const type = raw.type ?? (raw.skillKey ? "skill" : "other");
  return { ...raw, type };
}

function normalizeBonusSpec(raw: LoreRaceBonusSpec): LoreRaceBonusSpec {
  return {
    ...raw,
    features: (raw.features ?? []).map(normalizeFeatureEntry),
  };
}

export function parseRaceTraits(raw: string | null | undefined): ParsedRaceTraits {
  const full = (raw ?? "").trim();
  if (!full) return { displayText: "", bonuses: null };

  const start = full.indexOf(RACE_BONUSES_MARKER_START);
  if (start >= 0) {
    const jsonStart = full.indexOf("{", start);
    const end = full.indexOf(RACE_BONUSES_MARKER_END, jsonStart >= 0 ? jsonStart : start);
    if (jsonStart >= 0 && end > jsonStart) {
      const jsonStr = full.slice(jsonStart, end).trim();
      const displayText = `${full.slice(0, start).trim()}\n${full.slice(end + RACE_BONUSES_MARKER_END.length).trim()}`.trim();
      try {
        const parsed = JSON.parse(jsonStr) as LoreRaceBonusSpec;
        if (parsed && parsed.v === 1) {
          return { displayText, bonuses: normalizeBonusSpec(parsed) };
        }
      } catch {
        /* fall through */
      }
    }
  }

  if (full.startsWith("{")) {
    try {
      const parsed = JSON.parse(full) as LoreRaceBonusSpec;
      if (parsed && parsed.v === 1) {
        return {
          displayText: parsed.summary?.trim() ?? "",
          bonuses: normalizeBonusSpec(parsed),
        };
      }
    } catch {
      /* plain text */
    }
  }

  return { displayText: full, bonuses: null };
}

/** Katalog-Overrides für Kampagnen-Rassen (Name-Matching). */
export const KASSADRAS_RACE_BONUS_CATALOG: Record<string, LoreRaceBonusSpec> = {
  maschinenzwerge: {
    v: 1,
    summary: "Intelligenz +1; Maschinist; Kleiner Roboter-Begleiter.",
    abilityBonuses: { int: 1 },
    toolProficiencies: ["Handwerkswerkzeug"],
    features: [
      {
        id: "maschinenzwerg-maschinist",
        name: "Maschinist",
        description:
          "Du bist geübt im Umgang mit Handwerkswerkzeug. Mit 1 Stunde Arbeit und Materialien im Wert von mindestens 12 GM (inkl. eines Energiebehälters) kannst du kleine Maschinen entwerfen und bauen.",
      },
      {
        id: "maschinenzwerg-kleiner-roboter",
        name: "Kleiner Roboter",
        description:
          "Du besitzt einen kleinen Roboter (ca. 50 cm). Er benötigt Wartung: 10 GM alle 24 Stunden bzw. bei einer langen Rast, sonst wird er inaktiv. Er kann einem Tier oder einer kleinen Kreatur ähneln. Betrieb erfordert einen mittelgroßen Energiebehälter (zusätzlich 10 Gold Anschaffung).",
      },
    ],
  },
  dahrinokzwerg: {
    v: 1,
    summary:
      "Wie Hügelzwerg (KON +2, WEI +1) plus Bund fürs Leben (permanenter Vertrauter).",
    abilityBonuses: { con: 2, wis: 1 },
    hpBonusPerLevel: 1,
    weaponProficiencies: ["Streitaxt", "Beil", "Leichter Hammer", "Kriegshammer"],
    toolProficiencies: ["Handwerkszeug (Schmied, Brauer oder Maurer — Wahl)"],
    features: [
      {
        id: "dahrinok-dunkelsicht",
        name: "Dunkelsicht",
        description:
          "Im Radius von 18 m siehst du bei dämmrigem Licht wie bei hellem Licht und bei Dunkelheit wie bei dämmrigem Licht. In Dunkelheit erkennst du keine Farben, nur Graustufen.",
      },
      {
        id: "dahrinok-unverwuestlichkeit",
        name: "Zwergische Unverwüstlichkeit",
        description:
          "Du hast Vorteil bei Rettungswürfen gegen den Zustand Vergiftet und Resistenz gegen Giftschaden.",
      },
      {
        id: "dahrinok-kampftraining",
        name: "Zwergisches Kampftraining",
        description:
          "Du bist geübt im Umgang mit Streitaxt, Beil, leichtem Hammer und Kriegshammer.",
      },
      {
        id: "dahrinok-werkzeug",
        name: "Werkzeugkenntnis",
        description:
          "Du erhältst Übung mit einem Handwerkszeug deiner Wahl: Schmiedewerkzeug, Brauereibedarf oder Maurerwerkzeug.",
      },
      {
        id: "dahrinok-steinsinn",
        name: "Steinsinn (Steingespür)",
        description:
          "Bei Intelligenzprüfungen (Geschichte) zur Herkunft von Steinwerken giltst du als geübt und addierst den doppelten Übungsbonus.",
      },
      {
        id: "dahrinok-zaehigkeit",
        name: "Zwergische Zähigkeit",
        description:
          "Dein Trefferpunktemaximum steigt um 1 und bei jedem Stufenaufstieg um 1 weiteren Punkt.",
      },
      {
        id: "dahrinok-bund-fuers-leben",
        name: "Bund fürs Leben",
        description:
          "Du hast einen permanenten Vertrauten (Wahl: Spatz/Rabe/Papagei/Huhn | Katze/Marder/kleiner Hund | Maus/großer Käfer/Spinne). Er ist treu. Bei 0 TP flüchtet er statt zu sterben. Stirbt dein Charakter, stirbt auch der Vertraute.",
      },
    ],
  },
  // Narrative Platzhalter / ableitbare Hinweise für weitere Rassen
  arckoloth: {
    v: 1,
    summary: "Handelsgeschick und zwergenhafte Zähigkeit (Platzhalter — mechanisch wie Zwerg-Basis).",
    abilityBonuses: { con: 2, cha: 1 },
    features: [
      {
        id: "arc-koloth-haendler",
        name: "Händlerclan",
        description:
          "Die Arc-Koloth sind geschickte Händler. (Mechanik: KON +2, CHA +1 — vom GM bei Bedarf anpassen.)",
      },
    ],
  },
  aurumzwerge: {
    v: 1,
    summary: "Goldschmiedekunst und zwergenhafte Robustheit (Platzhalter).",
    abilityBonuses: { con: 2, int: 1 },
    toolProficiencies: ["Juwelierwerkzeug"],
    features: [
      {
        id: "aurum-goldschmied",
        name: "Goldschmiedekunst",
        description:
          "Du bist geübt mit Juwelierwerkzeug. (KON +2, INT +1 — Platzhalter aus Lore ableitbar.)",
      },
    ],
  },
  tiefenzwerg: {
    v: 1,
    summary: "Feuerresistenz und teuflisches Erbe (aus Lore).",
    abilityBonuses: { con: 2, cha: 1 },
    features: [
      {
        id: "tiefenzwerg-feuer",
        name: "Kind Pyrondras",
        description:
          "Besonders widerstandsfähig gegenüber Feuer: Resistenz gegen Feuerschaden. (KON +2, CHA +1 — Platzhalter.)",
      },
    ],
  },
  halbzwerg: {
    v: 1,
    summary: "Zähigkeit zwischen Mensch und Zwerg (Platzhalter).",
    abilityBonuses: { con: 2 },
    features: [
      {
        id: "halbzwerg-zaehigkeit",
        name: "Zwergenblut",
        description: "Hohe Ausdauer und Zähigkeit. (KON +2 — Platzhalter aus Lore.)",
      },
    ],
  },
  jakalblauertiefling: {
    v: 1,
    summary: "Kälteresistenz und Agilität (aus Lore).",
    abilityBonuses: { dex: 2, int: 1 },
    features: [
      {
        id: "jakal-kaelte",
        name: "Eisnomade",
        description:
          "Sehr widerstandsfähig gegenüber Kälte: Resistenz gegen Kälteschaden. Beweglich auf schwierigem Gelände. (DEX +2, INT +1 — Platzhalter.)",
      },
    ],
  },
  skotargrunertiefling: {
    v: 1,
    summary: "Tieflings-Erbe (Platzhalter).",
    abilityBonuses: { int: 1, cha: 2 },
    features: [
      {
        id: "skotar-erbe",
        name: "Dämonisches Erbe",
        description: "Klassische Tiefling-Attribute (INT +1, CHA +2 — Platzhalter).",
      },
    ],
  },
  tieflingrotertiefling: {
    v: 1,
    summary: "Klassisches Tiefling-Erbe (Platzhalter).",
    abilityBonuses: { int: 1, cha: 2 },
    features: [
      {
        id: "roter-tiefling-erbe",
        name: "Dämonisches Erbe",
        description: "INT +1, CHA +2 — Platzhalter analog PHB-Tiefling.",
      },
    ],
  },
};

export function resolveLoreRaceBonuses(input: {
  raceName: string | null | undefined;
  raceTraitsRaw?: string | null;
}): LoreRaceBonusSpec | null {
  const fromTraits = parseRaceTraits(input.raceTraitsRaw).bonuses;
  if (fromTraits) return fromTraits;

  const key = normalizeRaceKey(input.raceName);
  if (!key) return null;

  if (KASSADRAS_RACE_BONUS_CATALOG[key]) {
    return KASSADRAS_RACE_BONUS_CATALOG[key];
  }

  // Fuzzy: Maschinenzwerg / Dahrinok ohne Plural
  for (const [catalogKey, spec] of Object.entries(KASSADRAS_RACE_BONUS_CATALOG)) {
    if (key.includes(catalogKey) || catalogKey.includes(key)) return spec;
  }
  if (key.includes("maschinen") && key.includes("zwerg")) {
    return KASSADRAS_RACE_BONUS_CATALOG.maschinenzwerge;
  }
  if (key.includes("dahrinok")) {
    return KASSADRAS_RACE_BONUS_CATALOG.dahrinokzwerg;
  }
  return null;
}

export function resolveLoreRaceDisplayText(raceTraitsRaw?: string | null): string {
  return parseRaceTraits(raceTraitsRaw).displayText.trim();
}

export function formatAbilityBonusesDe(bonuses: LoreRaceAbilityBonuses | undefined): string {
  if (!bonuses) return "";
  return ABILITY_KEYS.filter((k) => (bonuses[k] ?? 0) !== 0)
    .map((k) => `${ABILITY_LABEL_DE[k]} ${(bonuses[k]! > 0 ? "+" : "") + bonuses[k]}`)
    .join(", ");
}

export function formatLoreRaceBonusesForDisplay(spec: LoreRaceBonusSpec | null): string[] {
  if (!spec) return [];
  const lines: string[] = [];
  const abi = formatAbilityBonusesDe(spec.abilityBonuses);
  if (abi) lines.push(`Attribute: ${abi}`);
  if (spec.hpBonusPerLevel) {
    lines.push(`TP-Maximum: +${spec.hpBonusPerLevel} pro Stufe`);
  }
  for (const f of spec.features ?? []) {
    const feature = normalizeFeatureEntry(f);
    if (feature.type === "skill" && feature.skillKey && (feature.skillBonus ?? 0) !== 0) {
      const label = DND5E_SKILL_BY_KEY[feature.skillKey]?.labelDe ?? feature.skillKey;
      const bonusLabel = feature.skillBonus! > 0 ? `+${feature.skillBonus}` : String(feature.skillBonus);
      const name = feature.name?.trim() || label;
      const desc = feature.description?.trim();
      lines.push(
        desc
          ? `${name} (${label} ${bonusLabel}): ${desc}`
          : `${name}: ${label} ${bonusLabel}`,
      );
      continue;
    }
    if (feature.name?.trim() || feature.description?.trim()) {
      lines.push(
        feature.description?.trim()
          ? `${feature.name || "Besonderheit"}: ${feature.description}`
          : feature.name,
      );
    }
  }
  if (spec.toolProficiencies?.length) {
    lines.push(`Werkzeuge: ${spec.toolProficiencies.join(", ")}`);
  }
  if (spec.weaponProficiencies?.length) {
    lines.push(`Waffen: ${spec.weaponProficiencies.join(", ")}`);
  }
  if (spec.skillProficiencies?.length) {
    lines.push(`Fertigkeiten (Übung): ${spec.skillProficiencies.join(", ")}`);
  }
  if (spec.summary && lines.length === 0) lines.push(spec.summary);
  return lines;
}

function slugFeatureId(name: string, fallback: string): string {
  const s = normalizeRaceKey(name) || fallback;
  return `lore-race:${s}`;
}

export function getSheetCampaignLore(sheet: Dnd5eSheetData): SheetCampaignLoreState {
  const raw = (sheet as Dnd5eSheetData & { campaignLore?: SheetCampaignLoreState }).campaignLore;
  return raw && typeof raw === "object" ? { ...raw } : {};
}

export function setSheetCampaignLore(
  sheet: Dnd5eSheetData,
  lore: SheetCampaignLoreState | null,
): Dnd5eSheetData {
  const next = { ...sheet } as Dnd5eSheetData & { campaignLore?: SheetCampaignLoreState };
  if (!lore || (Object.keys(lore).length === 0)) {
    delete next.campaignLore;
  } else {
    next.campaignLore = lore;
  }
  return next;
}

function applyAbilityDelta(
  sheet: Dnd5eSheetData,
  delta: LoreRaceAbilityBonuses,
  sign: 1 | -1,
): Dnd5eSheetData {
  const abilities = { ...sheet.abilities };
  for (const k of ABILITY_KEYS) {
    const d = delta[k] ?? 0;
    if (!d) continue;
    const key = k as AbilityKey;
    const prev = abilities[key]?.score ?? 10;
    abilities[key] = {
      score: Math.min(20, Math.max(1, prev + sign * d)),
    };
  }
  return { ...sheet, abilities };
}

function mergeUnique(list: string[], add: string[] | undefined): string[] {
  if (!add?.length) return list;
  const set = new Set(list.map((x) => x.trim().toLowerCase()));
  const out = [...list];
  for (const item of add) {
    const t = item.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (set.has(key)) continue;
    set.add(key);
    out.push(t);
  }
  return out;
}

function resolveSkillKey(raw: string): Dnd5eSkillKey | null {
  const key = raw.trim().toLowerCase();
  if (key in DND5E_SKILL_BY_KEY) return key as Dnd5eSkillKey;
  const byLabel = Object.values(DND5E_SKILL_BY_KEY).find(
    (s) => s.labelDe.toLowerCase() === key || s.labelEn.toLowerCase() === key,
  );
  return byLabel?.key ?? null;
}

function revertSkillBonuses(
  sheet: Dnd5eSheetData,
  applied: Partial<Record<Dnd5eSkillKey, number>> | undefined,
): Dnd5eSheetData {
  if (!applied || Object.keys(applied).length === 0) return sheet;
  const skills = { ...sheet.skills };
  for (const [rawKey, bonus] of Object.entries(applied)) {
    const key = rawKey as Dnd5eSkillKey;
    const entry = skills[key] ?? { proficient: "none" };
    const nextFlat = (entry.flatBonus ?? 0) - bonus;
    if (nextFlat === 0) {
      const { flatBonus: _drop, ...rest } = entry;
      skills[key] = rest;
    } else {
      skills[key] = { ...entry, flatBonus: nextFlat };
    }
  }
  return { ...sheet, skills };
}

function applySkillBonuses(
  sheet: Dnd5eSheetData,
  bonuses: Partial<Record<Dnd5eSkillKey, number>>,
): Dnd5eSheetData {
  if (Object.keys(bonuses).length === 0) return sheet;
  const skills = { ...sheet.skills };
  for (const [rawKey, bonus] of Object.entries(bonuses)) {
    if (!bonus) continue;
    const key = rawKey as Dnd5eSkillKey;
    const entry = skills[key] ?? { proficient: "none" };
    skills[key] = { ...entry, flatBonus: (entry.flatBonus ?? 0) + bonus };
  }
  return { ...sheet, skills };
}

function revertSkillProficiencies(
  sheet: Dnd5eSheetData,
  applied: Partial<Record<Dnd5eSkillKey, SkillProficiency>> | undefined,
): Dnd5eSheetData {
  if (!applied || Object.keys(applied).length === 0) return sheet;
  const skills = { ...sheet.skills };
  for (const [rawKey, previous] of Object.entries(applied)) {
    const key = rawKey as Dnd5eSkillKey;
    const entry = skills[key] ?? { proficient: "none" };
    skills[key] = { ...entry, proficient: previous };
  }
  return { ...sheet, skills };
}

function applySkillProficiencies(
  sheet: Dnd5eSheetData,
  keys: Dnd5eSkillKey[],
): { sheet: Dnd5eSheetData; applied: Partial<Record<Dnd5eSkillKey, SkillProficiency>> } {
  if (!keys.length) return { sheet, applied: {} };
  const skills = { ...sheet.skills };
  const applied: Partial<Record<Dnd5eSkillKey, SkillProficiency>> = {};
  for (const key of keys) {
    const entry = skills[key] ?? { proficient: "none" };
    if (entry.proficient === "none" || entry.proficient === "half") {
      applied[key] = entry.proficient;
      skills[key] = { ...entry, proficient: "proficient" };
    }
  }
  return { sheet: { ...sheet, skills }, applied };
}

function collectSkillBonusesFromSpec(
  spec: LoreRaceBonusSpec,
): Partial<Record<Dnd5eSkillKey, number>> {
  const out: Partial<Record<Dnd5eSkillKey, number>> = {};
  for (const raw of spec.features ?? []) {
    const f = normalizeFeatureEntry(raw);
    if (f.type !== "skill" || !f.skillKey || !(f.skillBonus ?? 0)) continue;
    out[f.skillKey] = (out[f.skillKey] ?? 0) + f.skillBonus!;
  }
  return out;
}

function collectSkillProficienciesFromSpec(spec: LoreRaceBonusSpec): Dnd5eSkillKey[] {
  const keys: Dnd5eSkillKey[] = [];
  for (const raw of spec.skillProficiencies ?? []) {
    const key = resolveSkillKey(raw);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

/**
 * Entfernt zuvor angewandte Lore-Rassenboni und wendet neue an.
 * SRD-Volksboni (character-create) bleiben unberührt, sofern source !== lore-race.
 */
export function applyLoreRaceBonusesToSheet(
  sheet: Dnd5eSheetData,
  opts: {
    raceName: string;
    raceTraitsRaw?: string | null;
    raceLoreId?: string | null;
    level?: number;
    applyAbilityBonuses?: boolean;
  },
): Dnd5eSheetData {
  const applyAbi = opts.applyAbilityBonuses !== false;
  let next = { ...sheet };
  const prevLore = getSheetCampaignLore(next);

  if (applyAbi && prevLore.appliedAbilityBonuses) {
    next = applyAbilityDelta(next, prevLore.appliedAbilityBonuses, -1);
  }

  if (prevLore.appliedHpBonus) {
    const rev = prevLore.appliedHpBonus;
    next = {
      ...next,
      combat: {
        ...next.combat,
        hpMax: Math.max(1, (next.combat.hpMax ?? 1) - rev),
        hpCurrent: Math.max(1, (next.combat.hpCurrent ?? 1) - rev),
      },
    };
  }

  // Alte Lore-Features entfernen
  next = {
    ...next,
    features: (next.features ?? []).filter(
      (f) => f.source !== LORE_RACE_FEATURE_SOURCE && !String(f.id ?? "").startsWith("lore-race:"),
    ),
  };

  // Alte lore-spezifische Proficiencies: nur die, die wir getaggt haben — wir merken uns nichts;
  // daher additiv und idempotent per Name. Beim Wechsel entfernen wir Features; Proficiencies
  // bleiben, außer wir tracken sie. Track tool/weapon adds in campaignLore.
  if (prevLore.appliedTools?.length || prevLore.appliedWeapons?.length) {
    const dropTools = new Set((prevLore.appliedTools ?? []).map((x) => x.toLowerCase()));
    const dropWeapons = new Set((prevLore.appliedWeapons ?? []).map((x) => x.toLowerCase()));
    next = {
      ...next,
      proficiencies: {
        ...next.proficiencies,
        tools: next.proficiencies.tools.filter((t) => !dropTools.has(t.toLowerCase())),
        weapons: next.proficiencies.weapons.filter((w) => !dropWeapons.has(w.toLowerCase())),
      },
    };
  }

  next = revertSkillBonuses(next, prevLore.appliedSkillBonuses);
  next = revertSkillProficiencies(next, prevLore.appliedSkills);

  const spec = resolveLoreRaceBonuses({
    raceName: opts.raceName,
    raceTraitsRaw: opts.raceTraitsRaw,
  });

  if (!spec) {
    return setSheetCampaignLore(next, {
      ...prevLore,
      raceLoreId: opts.raceLoreId ?? null,
      appliedAbilityBonuses: undefined,
      appliedRaceKey: null,
      appliedTools: undefined,
      appliedWeapons: undefined,
      appliedSkills: undefined,
      appliedSkillBonuses: undefined,
      appliedHpBonus: undefined,
    });
  }

  const raceKey = normalizeRaceKey(opts.raceName);
  let appliedAbility: LoreRaceAbilityBonuses | undefined;
  if (spec.abilityBonuses) {
    appliedAbility = { ...spec.abilityBonuses };
    if (applyAbi) {
      next = applyAbilityDelta(next, appliedAbility, 1);
    }
  }

  const featureEntries: Dnd5eFeatureEntry[] = (spec.features ?? [])
    .map((f, i) => normalizeFeatureEntry(f))
    .filter((f) => f.type !== "skill" || !f.skillKey || !(f.skillBonus ?? 0))
    .map((f, i) => ({
      id: f.id
        ? f.id.startsWith("lore-race:")
          ? f.id
          : `lore-race:${f.id}`
        : slugFeatureId(f.name || `feature-${i}`, String(i)),
      name: f.name || (f.skillKey ? DND5E_SKILL_BY_KEY[f.skillKey]?.labelDe ?? f.skillKey : "Besonderheit"),
      nameDe: f.name || (f.skillKey ? DND5E_SKILL_BY_KEY[f.skillKey]?.labelDe ?? f.skillKey : "Besonderheit"),
      description: f.description,
      descriptionDe: f.description,
      source: LORE_RACE_FEATURE_SOURCE,
    }));

  const appliedSkillBonuses = collectSkillBonusesFromSpec(spec);
  const skillProficiencyKeys = collectSkillProficienciesFromSpec(spec);
  const skillProficiencyResult = applySkillProficiencies(next, skillProficiencyKeys);
  next = skillProficiencyResult.sheet;
  const appliedSkillProficiencies = skillProficiencyResult.applied;

  next = applySkillBonuses(next, appliedSkillBonuses);

  next = {
    ...next,
    features: [...next.features, ...featureEntries],
    proficiencies: {
      ...next.proficiencies,
      tools: mergeUnique(next.proficiencies.tools, spec.toolProficiencies),
      weapons: mergeUnique(next.proficiencies.weapons, spec.weaponProficiencies),
      armor: mergeUnique(next.proficiencies.armor, spec.armorProficiencies),
    },
  };

  let appliedHp = 0;
  if (spec.hpBonusPerLevel && opts.level != null && opts.level > 0) {
    appliedHp = spec.hpBonusPerLevel * opts.level;
    next = {
      ...next,
      combat: {
        ...next.combat,
        hpMax: Math.max(1, (next.combat.hpMax ?? 1) + appliedHp),
        hpCurrent: Math.max(1, (next.combat.hpCurrent ?? 1) + appliedHp),
      },
    };
  }

  return setSheetCampaignLore(next, {
    ...prevLore,
    raceLoreId: opts.raceLoreId ?? null,
    appliedAbilityBonuses: appliedAbility,
    appliedRaceKey: raceKey,
    appliedTools: spec.toolProficiencies ?? [],
    appliedWeapons: spec.weaponProficiencies ?? [],
    appliedSkills:
      Object.keys(appliedSkillProficiencies).length > 0
        ? appliedSkillProficiencies
        : undefined,
    appliedSkillBonuses:
      Object.keys(appliedSkillBonuses).length > 0 ? appliedSkillBonuses : undefined,
    appliedHpBonus: appliedHp || undefined,
  });
}

/** Für Level-1-Create: Boni auf Basiswerte legen (ohne Sheet-Revert). */
export function applyLoreAbilityBonusesToScores(
  base: Record<AbilityKeyShort, number>,
  spec: LoreRaceBonusSpec | null,
): Record<AbilityKeyShort, number> {
  if (!spec?.abilityBonuses) return { ...base };
  const out = { ...base };
  for (const k of ABILITY_KEYS) {
    const d = spec.abilityBonuses[k] ?? 0;
    if (d) out[k] = Math.min(20, (out[k] ?? 10) + d);
  }
  return out;
}

export function loreRaceFeaturesToSheetEntries(
  spec: LoreRaceBonusSpec | null,
): Dnd5eFeatureEntry[] {
  if (!spec?.features?.length) return [];
  return spec.features
    .map((f, i) => normalizeFeatureEntry(f))
    .filter((f) => f.type !== "skill" || !f.skillKey || !(f.skillBonus ?? 0))
    .map((f, i) => ({
      id: f.id
        ? f.id.startsWith("lore-race:")
          ? f.id
          : `lore-race:${f.id}`
        : slugFeatureId(f.name || `feature-${i}`, String(i)),
      name: f.name,
      nameDe: f.name,
      description: f.description,
      descriptionDe: f.description,
      source: LORE_RACE_FEATURE_SOURCE,
    }));
}
