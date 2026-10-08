/**
 * Situationsfähigkeiten, ausgelegte NPC-Karten und Stadtereignisse.
 * Der Vortag entscheidet, ob eine Fähigkeit zündet. Dauer und Sperrzeit
 * liegen dazwischen, damit Wache und Untergrund sich nicht am selben Tag jagen.
 */

import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import type {
  CardRange,
  CityCardPlay,
  CityEventCard,
  CityInfluenceTier,
  CityMeter,
  MeterEffect,
  NpcAbility,
} from "@/src/lib/npcs/city-simulation";

function defaultDuration(tier: CityInfluenceTier | null) {
  if (tier === "apex_global") return 14;
  if (tier === "authority_faction") return 10;
  if (tier === "regional_economy") return 7;
  return 3;
}

function defaultRange(tier: CityInfluenceTier | null): CardRange {
  if (tier === "apex_global") return "city";
  if (tier === "authority_faction" || tier === "regional_economy") return "adjacent";
  return "district";
}

const DAY = 86_400_000;
const CAP = 16;
const RING: CityDistrictId[] = [
  "adelsviertel",
  "tempelbezirk",
  "akademieviertel",
  "handwerkerviertel",
  "suedtor",
  "unterstadt",
];

export type MeterSnapshot = Record<CityMeter, number>;

export type CityActor = {
  id: string;
  name: string;
  alive: boolean;
  districtId: CityDistrictId;
  factionId: string | null;
  role: string;
  tier: CityInfluenceTier | null;
  axes: {
    loyalCriminal: number;
    greedyAltruist: number;
    piousSkeptic: number;
    superstitionReason: number;
  };
  abilities: NpcAbility[];
  cards: CityEventCard[];
  plays: Array<CityCardPlay & { startedOnMs: number }>;
};

export type CitySimEvent = {
  id: string;
  title: string;
  body: string;
  scope: "city" | "district" | "sector";
  districtId: CityDistrictId | null;
  sectorLabel: string | null;
  effects: MeterEffect[];
  durationDays: number | null;
  startOn: number;
  endWhen: { meter: CityMeter; op: "gt" | "lt"; value: number } | null;
  active: boolean;
};

export type RelationshipBias = {
  target: "same_faction" | "rival_faction";
  delta: number;
};

export type PressureNote = {
  id: string;
  title: string;
  kind: "ability" | "counter" | "npc-card" | "city-event";
  detail: string;
};

type Pulse = {
  key: string;
  title: string;
  kind: PressureNote["kind"];
  districtIds: CityDistrictId[];
  effects: MeterEffect[];
  start: number;
  end: number;
  endWhen: CitySimEvent["endWhen"];
  relationship: RelationshipBias | null;
  stopped: boolean;
};

export type PressureBook = {
  delta: (districtId: CityDistrictId, day: number) => MeterSnapshot;
  bias: (day: number) => RelationshipBias[];
  notes: (day: number) => PressureNote[];
};

const ZERO: MeterSnapshot = {
  crime: 0,
  guard: 0,
  vattrak: 0,
  malanthir: 0,
  economy: 0,
  unemployment: 0,
  refugees: 0,
};

export function neighborDistricts(id: CityDistrictId): CityDistrictId[] {
  if (id === "palast") return [...RING];
  const index = RING.indexOf(id);
  if (index < 0) return ["palast"];
  return [RING[(index + RING.length - 1) % RING.length], RING[(index + 1) % RING.length], "palast"];
}

export function reachDistricts(
  origin: CityDistrictId,
  range: CardRange | undefined,
  extra: string[] | undefined,
  tier: CityInfluenceTier | null,
): CityDistrictId[] {
  const resolved = range ?? defaultRange(tier);
  const ids = new Set<CityDistrictId>();
  if (resolved === "city") {
    for (const district of AURENFURT_DISTRICTS) ids.add(district.id);
  } else if (resolved === "adjacent") {
    ids.add(origin);
    for (const neighbor of neighborDistricts(origin)) ids.add(neighbor);
  } else {
    ids.add(origin);
  }
  for (const extraId of extra ?? []) {
    if (AURENFURT_DISTRICTS.some((district) => district.id === extraId)) {
      ids.add(extraId as CityDistrictId);
    }
  }
  return [...ids];
}

function blankDelta() {
  return { ...ZERO };
}

function addEffect(target: MeterSnapshot, effect: MeterEffect) {
  target[effect.meter] += effect.delta;
}

function cap(value: number) {
  return Math.max(-CAP, Math.min(CAP, value));
}

function meets(endWhen: CitySimEvent["endWhen"], meters: MeterSnapshot) {
  if (!endWhen) return false;
  return endWhen.op === "gt" ? meters[endWhen.meter] > endWhen.value : meters[endWhen.meter] < endWhen.value;
}

function gatesPass(actor: CityActor, ability: NpcAbility) {
  if (!ability.enabled || !actor.alive) return false;
  const role = ability.roleGate?.trim().toLowerCase();
  if (role && !actor.role.toLowerCase().includes(role)) return false;
  if (ability.factionGate && ability.factionGate !== actor.factionId) return false;
  if (ability.axisGate) {
    const value = actor.axes[ability.axisGate.axis] ?? 0;
    if (value < ability.axisGate.min || value > ability.axisGate.max) return false;
  }
  if (ability.conditions.length === 0 || ability.effects.length === 0) return false;
  return true;
}

function conditionsPass(ability: NpcAbility, meters: MeterSnapshot) {
  return ability.conditions.every((condition) =>
    condition.op === "gt" ? meters[condition.meter] > condition.value : meters[condition.meter] < condition.value,
  );
}

function eventDistricts(event: CitySimEvent): CityDistrictId[] {
  if (event.scope === "city") return AURENFURT_DISTRICTS.map((district) => district.id);
  if (event.districtId && AURENFURT_DISTRICTS.some((district) => district.id === event.districtId)) {
    return [event.districtId];
  }
  return [];
}

export function foldCityPressure(input: {
  from: number;
  to: number;
  actors: CityActor[];
  events: CitySimEvent[];
  readMeters: (districtId: CityDistrictId, day: number) => MeterSnapshot;
}): PressureBook {
  const pulses: Pulse[] = [];
  for (const event of input.events) {
    if (!event.active || event.effects.length === 0) continue;
    const districts = eventDistricts(event);
    if (districts.length === 0) continue;
    const days = event.durationDays ?? 30;
    pulses.push({
      key: event.id,
      title: event.title,
      kind: "city-event",
      districtIds: districts,
      effects: event.effects,
      start: event.startOn,
      end: event.startOn + days * DAY,
      endWhen: event.endWhen,
      relationship: null,
      stopped: false,
    });
  }
  for (const actor of input.actors) {
    for (const play of actor.plays) {
      const card = actor.cards.find((entry) => entry.id === play.cardId);
      if (!card) continue;
      const days = card.durationDays ?? defaultDuration(actor.tier);
      pulses.push({
        key: `${actor.id}:${card.id}:${play.startedOnMs}`,
        title: card.title,
        kind: "npc-card",
        districtIds: reachDistricts(actor.districtId, card.range, card.extraDistrictIds, actor.tier),
        effects: card.effects ?? [],
        start: play.startedOnMs,
        end: play.startedOnMs + days * DAY,
        endWhen: null,
        relationship: null,
        stopped: false,
      });
    }
  }

  const ready = new Map<string, number>();
  const deltas = new Map<number, Map<CityDistrictId, MeterSnapshot>>();
  const biases = new Map<number, RelationshipBias[]>();
  const notes = new Map<number, PressureNote[]>();

  for (let day = input.from; day <= input.to; day += DAY) {
    const dayDelta = new Map<CityDistrictId, MeterSnapshot>();
    const dayBias: RelationshipBias[] = [];
    const dayNotes: PressureNote[] = [];
    const touched = new Set<CityDistrictId>();

    for (const pulse of pulses) {
      if (pulse.stopped || day < pulse.start || day >= pulse.end) continue;
      for (const districtId of pulse.districtIds) touched.add(districtId);
    }
    for (const actor of input.actors) touched.add(actor.districtId);

    const seen = new Map<CityDistrictId, MeterSnapshot>();
    for (const districtId of touched) {
      seen.set(districtId, input.readMeters(districtId, day));
    }

    for (const pulse of pulses) {
      if (pulse.stopped || day < pulse.start || day >= pulse.end) continue;
      const probe = seen.get(pulse.districtIds[0]);
      if (probe && meets(pulse.endWhen, probe)) {
        pulse.stopped = true;
        continue;
      }
      for (const districtId of pulse.districtIds) {
        const bucket = dayDelta.get(districtId) ?? blankDelta();
        for (const effect of pulse.effects) addEffect(bucket, effect);
        dayDelta.set(districtId, bucket);
      }
      if (pulse.relationship && pulse.relationship.delta !== 0) dayBias.push(pulse.relationship);
      dayNotes.push({
        id: pulse.key,
        title: pulse.title,
        kind: pulse.kind,
        detail: pulse.kind === "counter" ? "Gegenreaktion einer rivalisierenden Fraktion." : pulse.title,
      });
    }

    for (const actor of input.actors) {
      const meters = seen.get(actor.districtId);
      if (!meters) continue;
      for (const ability of actor.abilities) {
        const key = `${actor.id}:${ability.id}`;
        if ((ready.get(key) ?? Number.NEGATIVE_INFINITY) > day) continue;
        if (!gatesPass(actor, ability) || !conditionsPass(ability, meters)) continue;
        pulses.push({
          key,
          title: `${actor.name}: ${ability.title}`,
          kind: "ability",
          districtIds: [actor.districtId],
          effects: ability.effects,
          start: day,
          end: day + ability.durationDays * DAY,
          endWhen: null,
          relationship:
            ability.relationshipTarget === "none" || ability.relationshipDelta === 0
              ? null
              : { target: ability.relationshipTarget, delta: ability.relationshipDelta },
          stopped: false,
        });
        const bucket = dayDelta.get(actor.districtId) ?? blankDelta();
        for (const effect of ability.effects) addEffect(bucket, effect);
        dayDelta.set(actor.districtId, bucket);
        if (ability.relationshipTarget !== "none" && ability.relationshipDelta !== 0) {
          dayBias.push({ target: ability.relationshipTarget, delta: ability.relationshipDelta });
        }
        dayNotes.push({
          id: key,
          title: `${actor.name}: ${ability.title}`,
          kind: "ability",
          detail: `${ability.durationDays} Tage Wirkung, danach ${ability.cooldownDays} Tage Ruhe.`,
        });
        ready.set(key, day + (ability.durationDays + ability.cooldownDays) * DAY);
        if (ability.counterFactionId && ability.counterEffects.length > 0) {
          pulses.push({
            key: `${key}:counter`,
            title: `Gegenreaktion auf ${ability.title}`,
            kind: "counter",
            districtIds: [actor.districtId],
            effects: ability.counterEffects,
            start: day + ability.counterDelayDays * DAY,
            end: day + (ability.counterDelayDays + ability.counterDurationDays) * DAY,
            endWhen: null,
            relationship: null,
            stopped: false,
          });
        }
      }
    }

    for (const [districtId, bucket] of dayDelta) {
      for (const meter of Object.keys(bucket) as CityMeter[]) bucket[meter] = cap(bucket[meter]);
      dayDelta.set(districtId, bucket);
    }
    deltas.set(day, dayDelta);
    biases.set(day, dayBias);
    notes.set(day, dayNotes);
  }

  return {
    delta: (districtId, day) => deltas.get(day)?.get(districtId) ?? ZERO,
    bias: (day) => biases.get(day) ?? [],
    notes: (day) => notes.get(day) ?? [],
  };
}
