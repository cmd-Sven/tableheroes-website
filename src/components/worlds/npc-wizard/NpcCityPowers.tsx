"use client";

import { AURENFURT_DISTRICTS } from "@/src/components/city/aurenfurt/aurenfurt-districts";
import { AURENFURT_FACTIONS } from "@/src/components/city/aurenfurt/aurenfurt-factions";
import {
  CARD_RANGE_LABELS,
  CARD_RANGES,
  CITY_METER_LABELS,
  CITY_METERS,
  defaultCardDuration,
  defaultCardRange,
  newCityEventCard,
  newNpcAbility,
  type CardRange,
  type CityEventCard,
  type CityMeter,
  type CitySimulationFields,
  type MeterEffect,
  type NpcAbility,
} from "@/src/lib/npcs/city-simulation";
import { Plus, Trash2 } from "lucide-react";

const FIELD =
  "w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none";

type Props = {
  value: CitySimulationFields;
  onChange: (next: CitySimulationFields) => void;
};

export function NpcCityPowers({ value, onChange }: Props) {
  const tier = value.cityInfluenceTier;
  const patch = (partial: Partial<CitySimulationFields>) => onChange({ ...value, ...partial });

  const updateAbility = (index: number, partial: Partial<NpcAbility>) => {
    const next = [...value.cityAbilities];
    next[index] = { ...next[index], ...partial };
    patch({ cityAbilities: next });
  };

  const updateCard = (index: number, partial: Partial<CityEventCard>) => {
    const next = [...value.cityEventDeck].sort((a, b) => a.sortOrder - b.sortOrder);
    next[index] = { ...next[index], ...partial };
    patch({ cityEventDeck: next });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-cinzel font-bold text-sm text-accent-gold">Situationsfähigkeiten</h4>
          <button
            type="button"
            onClick={() => patch({ cityAbilities: [...value.cityAbilities, newNpcAbility()] })}
            className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow font-bold text-xs uppercase text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant"
          >
            <Plus className="h-3.5 w-3.5" />
            Fähigkeit
          </button>
        </div>
        <p className="font-libre text-xs leading-relaxed text-gray-500">
          Optional. Nur solange der NPC der Stadt zugeordnet und am Leben ist, prüft er jeden Tag die
          Zähler seines Viertels. Wirkzeit und Sperrzeit verhindern, dass sich Wache und Untergrund am selben Tag jagen.
        </p>
        {value.cityAbilities.map((ability, index) => (
          <AbilityForm
            key={ability.id}
            ability={ability}
            onChange={(partial) => updateAbility(index, partial)}
            onRemove={() => patch({ cityAbilities: value.cityAbilities.filter((_, i) => i !== index) })}
          />
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-cinzel font-bold text-sm text-accent-gold">Ereigniskarten</h4>
          <button
            type="button"
            onClick={() => {
              const sorted = [...value.cityEventDeck].sort((a, b) => a.sortOrder - b.sortOrder);
              patch({
                cityEventDeck: [
                  ...sorted,
                  newCityEventCard({
                    sortOrder: sorted.length,
                    durationDays: defaultCardDuration(tier),
                    range: defaultCardRange(tier),
                  }),
                ],
              });
            }}
            className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow font-bold text-xs uppercase text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant"
          >
            <Plus className="h-3.5 w-3.5" />
            Karte
          </button>
        </div>
        <p className="font-libre text-xs leading-relaxed text-gray-500">
          Nur der Spielleiter sieht diese Karten und legt sie von Hand aus. Die Reichweite folgt der
          Kategorie ({tier ? defaultCardRange(tier) : "district"}, {defaultCardDuration(tier)} Tage) und lässt sich erweitern.
          Ein Sektor wirkt auf das Viertel, in dem er liegt.
        </p>
        {[...value.cityEventDeck]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((card, index) => (
            <CardForm
              key={card.id}
              card={card}
              tierDefault={defaultCardRange(tier)}
              onChange={(partial) => updateCard(index, partial)}
              onRemove={() =>
                patch({
                  cityEventDeck: [...value.cityEventDeck]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .filter((_, i) => i !== index)
                    .map((entry, i) => ({ ...entry, sortOrder: i })),
                })
              }
            />
          ))}
      </section>
    </div>
  );
}

function AbilityForm({
  ability,
  onChange,
  onRemove,
}: {
  ability: NpcAbility;
  onChange: (partial: Partial<NpcAbility>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded border border-hero-dark bg-slate-950/50 p-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={ability.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Name der Fähigkeit"
          className={FIELD}
        />
        <button type="button" onClick={onRemove} className="rounded border border-hero-dark p-2 text-gray-400 hover:text-accent-blood" aria-label="Fähigkeit löschen">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <label className="flex items-center gap-2 font-barlow text-xs uppercase text-gray-300">
        <input type="checkbox" checked={ability.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} />
        Aktiv
      </label>
      <div className="grid gap-2 md:grid-cols-2">
        <input
          type="text"
          value={ability.roleGate ?? ""}
          onChange={(event) => onChange({ roleGate: event.target.value || null })}
          placeholder="Rolle, z.B. Hauptmann oder Waffenhändler"
          className={FIELD}
        />
        <select
          value={ability.factionGate ?? ""}
          onChange={(event) => onChange({ factionGate: event.target.value || null })}
          className={FIELD}
        >
          <option value="">Fraktion: keine Einschränkung</option>
          {AURENFURT_FACTIONS.map((faction) => (
            <option key={faction.id} value={faction.id}>{faction.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <select
          value={ability.axisGate?.axis ?? ""}
          onChange={(event) => {
            const axis = event.target.value as NonNullable<NpcAbility["axisGate"]>["axis"] | "";
            onChange({ axisGate: axis ? { axis, min: ability.axisGate?.min ?? -5, max: ability.axisGate?.max ?? 5 } : null });
          }}
          className={FIELD}
        >
          <option value="">Achse: keine Einschränkung</option>
          <option value="loyalCriminal">Loyal bis Kriminell</option>
          <option value="greedyAltruist">Habgierig bis Gutmensch</option>
          <option value="piousSkeptic">Gläubig bis Ungläubig</option>
          <option value="superstitionReason">Aberglaube bis Aufgeklärt</option>
        </select>
        {ability.axisGate ? (
          <>
            <NumberField label="Achse von" value={ability.axisGate.min} min={-5} max={5} onChange={(min) => onChange({ axisGate: { ...ability.axisGate!, min } })} />
            <NumberField label="Achse bis" value={ability.axisGate.max} min={-5} max={5} onChange={(max) => onChange({ axisGate: { ...ability.axisGate!, max } })} />
          </>
        ) : null}
      </div>
      <ConditionRow
        condition={ability.conditions[0] ?? { meter: "crime", op: "gt", value: 80 }}
        onChange={(condition) => onChange({ conditions: [condition] })}
      />
      <EffectRow
        effect={ability.effects[0] ?? { meter: "guard", delta: 6 }}
        onChange={(effect) => onChange({ effects: [effect] })}
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Wirkzeit (Tage)" value={ability.durationDays} min={1} max={60} onChange={(durationDays) => onChange({ durationDays })} />
        <NumberField label="Sperrzeit (Tage)" value={ability.cooldownDays} min={1} max={180} onChange={(cooldownDays) => onChange({ cooldownDays })} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <select
          value={ability.relationshipTarget}
          onChange={(event) => onChange({ relationshipTarget: event.target.value as NpcAbility["relationshipTarget"] })}
          className={FIELD}
        >
          <option value="none">Beziehung: unverändert</option>
          <option value="same_faction">Beziehungen der eigenen Fraktion</option>
          <option value="rival_faction">Beziehungen zu anderen Fraktionen</option>
        </select>
        <NumberField
          label="Beziehungswert"
          value={ability.relationshipDelta}
          min={-30}
          max={30}
          onChange={(relationshipDelta) => onChange({ relationshipDelta })}
        />
      </div>
      <p className="font-libre text-[11px] text-gray-500">
        Der Beziehungswert verschiebt sich nur, solange die Fähigkeit wirkt. Der Lore-Eintrag selbst bleibt stehen.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <select
          value={ability.counterFactionId ?? ""}
          onChange={(event) =>
            onChange({
              counterFactionId: event.target.value || null,
              counterEffects:
                event.target.value && ability.counterEffects.length === 0
                  ? [{ meter: "crime", delta: 4 }]
                  : event.target.value
                    ? ability.counterEffects
                    : [],
            })
          }
          className={FIELD}
        >
          <option value="">Keine Gegenreaktion</option>
          {AURENFURT_FACTIONS.map((faction) => (
            <option key={faction.id} value={faction.id}>{faction.name} antwortet</option>
          ))}
        </select>
        <NumberField label="Antwort nach Tagen" value={ability.counterDelayDays} min={1} max={30} onChange={(counterDelayDays) => onChange({ counterDelayDays })} />
      </div>
      {ability.counterFactionId ? (
        <div className="grid gap-2 md:grid-cols-2">
          <EffectRow
            effect={ability.counterEffects[0] ?? { meter: "crime", delta: 4 }}
            onChange={(effect) => onChange({ counterEffects: [effect] })}
          />
          <NumberField
            label="Antwort wirkt (Tage)"
            value={ability.counterDurationDays}
            min={1}
            max={30}
            onChange={(counterDurationDays) => onChange({ counterDurationDays })}
          />
        </div>
      ) : null}
    </div>
  );
}

function CardForm({
  card,
  tierDefault,
  onChange,
  onRemove,
}: {
  card: CityEventCard;
  tierDefault: CardRange;
  onChange: (partial: Partial<CityEventCard>) => void;
  onRemove: () => void;
}) {
  const range = card.range ?? tierDefault;
  const extra = new Set(card.extraDistrictIds ?? []);
  return (
    <div className="space-y-2 rounded border border-hero-dark bg-slate-950/50 p-3">
      <div className="flex items-center gap-2">
        <input type="text" value={card.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="Titel" className={FIELD} />
        <button type="button" onClick={onRemove} className="rounded border border-hero-dark p-2 text-gray-400 hover:text-accent-blood" aria-label="Karte löschen">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        value={card.text}
        onChange={(event) => onChange({ text: event.target.value })}
        rows={2}
        placeholder="Kartentext, nur für den Spielleiter"
        className={`${FIELD} font-libre resize-y`}
      />
      <input
        type="text"
        value={card.trigger ?? ""}
        onChange={(event) => onChange({ trigger: event.target.value || null })}
        placeholder="Wann der Spielleiter sie auslegen sollte"
        className={FIELD}
      />
      <div className="grid gap-2 md:grid-cols-2">
        <select value={range} onChange={(event) => onChange({ range: event.target.value as CardRange })} className={FIELD}>
          {CARD_RANGES.map((entry) => (
            <option key={entry} value={entry}>{CARD_RANGE_LABELS[entry]}</option>
          ))}
        </select>
        <NumberField
          label="Wirkzeit (Tage)"
          value={card.durationDays ?? defaultCardDuration(null)}
          min={1}
          max={90}
          onChange={(durationDays) => onChange({ durationDays })}
        />
      </div>
      {range === "sector" ? (
        <input
          type="text"
          value={card.sectorLabel ?? ""}
          onChange={(event) => onChange({ sectorLabel: event.target.value || null })}
          placeholder="Sektor, z.B. Unterstadt E19"
          className={FIELD}
        />
      ) : null}
      <EffectRow
        effect={(card.effects ?? [])[0] ?? { meter: "crime", delta: 0 }}
        onChange={(effect) => onChange({ effects: effect.delta === 0 ? [] : [effect] })}
      />
      <div className="flex flex-wrap gap-2">
        {AURENFURT_DISTRICTS.map((district) => (
          <label key={district.id} className="flex items-center gap-1 font-barlow text-[10px] uppercase text-gray-400">
            <input
              type="checkbox"
              checked={extra.has(district.id)}
              onChange={(event) => {
                const next = new Set(extra);
                if (event.target.checked) next.add(district.id);
                else next.delete(district.id);
                onChange({ extraDistrictIds: [...next] });
              }}
            />
            {district.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function ConditionRow({
  condition,
  onChange,
}: {
  condition: { meter: CityMeter; op: "gt" | "lt"; value: number };
  onChange: (next: { meter: CityMeter; op: "gt" | "lt"; value: number }) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <select value={condition.meter} onChange={(event) => onChange({ ...condition, meter: event.target.value as CityMeter })} className={FIELD}>
        {CITY_METERS.map((meter) => (
          <option key={meter} value={meter}>{CITY_METER_LABELS[meter]}</option>
        ))}
      </select>
      <select value={condition.op} onChange={(event) => onChange({ ...condition, op: event.target.value as "gt" | "lt" })} className={FIELD}>
        <option value="gt">über</option>
        <option value="lt">unter</option>
      </select>
      <input
        type="number"
        min={0}
        max={100}
        value={condition.value}
        onChange={(event) => onChange({ ...condition, value: clampNumber(event.target.value, 0, 100) })}
        className={FIELD}
      />
    </div>
  );
}

function EffectRow({ effect, onChange }: { effect: MeterEffect; onChange: (next: MeterEffect) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <select value={effect.meter} onChange={(event) => onChange({ ...effect, meter: event.target.value as CityMeter })} className={FIELD}>
        {CITY_METERS.map((meter) => (
          <option key={meter} value={meter}>{CITY_METER_LABELS[meter]}</option>
        ))}
      </select>
      <input
        type="number"
        min={-20}
        max={20}
        value={effect.delta}
        onChange={(event) => onChange({ ...effect, delta: clampNumber(event.target.value, -20, 20) })}
        className={FIELD}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-barlow text-[10px] font-bold uppercase text-gray-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(clampNumber(event.target.value, min, max))}
        className={FIELD}
      />
    </label>
  );
}

function clampNumber(raw: string, min: number, max: number) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
