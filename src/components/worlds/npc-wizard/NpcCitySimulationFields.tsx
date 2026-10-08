"use client";

import { AURENFURT_FACTIONS } from "@/src/components/city/aurenfurt/aurenfurt-factions";
import type { FactionId } from "@/src/components/city/aurenfurt/aurenfurt-factions";
import {
  CITY_INFLUENCE_TIER_LABELS,
  CITY_INFLUENCE_TIERS,
  type CityInfluenceTier,
  type CitySimulationFields,
  requiresCityDeity,
} from "@/src/lib/npcs/city-simulation";
import { NpcCityPowers } from "@/src/components/worlds/npc-wizard/NpcCityPowers";

type Props = {
  value: CitySimulationFields;
  onChange: (next: CitySimulationFields) => void;
  /** Gottheiten aus der Welt-Lore (optional freier Text, wenn leer). */
  deities?: Array<{ id: string; name: string }>;
  /** Wenn true: Frage + Felder; wenn false und hideWhenNo: nur Frage. */
  className?: string;
};

function BipolarSlider({
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 font-barlow text-xs uppercase text-gray-400">
        <span className="text-left text-hero-dark">{leftLabel}</span>
        <span className="font-bold tabular-nums text-accent-gold">{value}</span>
        <span className="text-right text-hero-dark">{rightLabel}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={-5}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-hero-vibrant"
          aria-valuemin={-5}
          aria-valuemax={5}
          aria-valuenow={value}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-accent-gold/70"
          aria-hidden
        />
      </div>
      <div className="flex justify-between font-libre text-[10px] text-gray-500">
        <span>−5</span>
        <span className="text-accent-gold/80">0 · Mitte</span>
        <span>+5</span>
      </div>
    </div>
  );
}

export function NpcCitySimulationFields({
  value,
  onChange,
  deities = [],
  className,
}: Props) {
  const patch = (partial: Partial<CitySimulationFields>) =>
    onChange({ ...value, ...partial });

  const showDetails = value.forCitySimulation;
  const deityRequired = requiresCityDeity(value.cityAxisPiousSkeptic);

  return (
    <div className={className ?? "space-y-4 rounded-lg border border-hero-border bg-slate-900/40 p-4"}>
      <div>
        <p className="mb-2 font-barlow font-bold text-sm uppercase text-gray-300">
          Ist dieser NPC für eine Stadtsimulation wichtig?
        </p>
        <p className="mb-3 font-libre text-xs text-gray-400 leading-relaxed">
          Nur bei „Ja“ werden Kategorie, Wesensachsen, Fraktion und Zielvorgabe für die Stadt-Simulation
          erfasst. Du kannst das später jederzeit nachziehen.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => patch({ forCitySimulation: false })}
            className={`rounded border px-3 py-2 font-barlow font-bold text-xs uppercase ${
              !value.forCitySimulation
                ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                : "border-hero-dark text-gray-400 hover:border-hero-border"
            }`}
          >
            Nein
          </button>
          <button
            type="button"
            onClick={() =>
              patch({
                forCitySimulation: true,
                cityInfluenceTier: value.cityInfluenceTier ?? "local",
                cityAxisLoyalCriminal: value.cityAxisLoyalCriminal ?? 0,
                cityAxisGreedyAltruist: value.cityAxisGreedyAltruist ?? 0,
                cityAxisPiousSkeptic: value.cityAxisPiousSkeptic ?? 0,
                cityAxisSuperstitionReason: value.cityAxisSuperstitionReason ?? 0,
                cityAgenda: value.cityAgenda ?? "",
                cityEventDeck: value.cityEventDeck ?? [],
                cityAbilities: value.cityAbilities ?? [],
                cityCardPlays: value.cityCardPlays ?? [],
              })
            }
            className={`rounded border px-3 py-2 font-barlow font-bold text-xs uppercase ${
              value.forCitySimulation
                ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                : "border-hero-dark text-gray-400 hover:border-hero-border"
            }`}
          >
            Ja
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-5 border-t border-hero-border pt-4">
          <div>
            <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
              Kategorie / Einflussradius *
            </label>
            <select
              value={value.cityInfluenceTier ?? "local"}
              onChange={(e) =>
                patch({ cityInfluenceTier: e.target.value as CityInfluenceTier })
              }
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
            >
              {CITY_INFLUENCE_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {CITY_INFLUENCE_TIER_LABELS[tier]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <h4 className="font-cinzel font-bold text-sm text-accent-gold">Wesensachsen</h4>
            <BipolarSlider
              leftLabel="Loyal"
              rightLabel="Kriminell"
              value={value.cityAxisLoyalCriminal ?? 0}
              onChange={(v) => patch({ cityAxisLoyalCriminal: v })}
            />
            <BipolarSlider
              leftLabel="Habgierig"
              rightLabel="Gutmensch"
              value={value.cityAxisGreedyAltruist ?? 0}
              onChange={(v) => patch({ cityAxisGreedyAltruist: v })}
            />
            <BipolarSlider
              leftLabel="Gläubig"
              rightLabel="Ungläubig"
              value={value.cityAxisPiousSkeptic ?? 0}
              onChange={(v) => patch({ cityAxisPiousSkeptic: v })}
            />
            <BipolarSlider
              leftLabel="Aberglaube"
              rightLabel="Aufgeklärt"
              value={value.cityAxisSuperstitionReason ?? 0}
              onChange={(v) => patch({ cityAxisSuperstitionReason: v })}
            />
          </div>

          <div>
            <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
              Zugehörige Gottheit{deityRequired ? " *" : " (optional)"}
            </label>
            {deities.length > 0 ? (
              <select
                value={value.cityDeity ?? ""}
                onChange={(e) => patch({ cityDeity: e.target.value || null })}
                className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
              >
                <option value="">— keine / später —</option>
                {deities.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={value.cityDeity ?? ""}
                onChange={(e) => patch({ cityDeity: e.target.value || null })}
                placeholder="z.B. Elysia, Chromus, Malanthir …"
                className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
              />
            )}
            {deityRequired && (
              <p className="mt-1 font-libre text-xs text-accent-gold">
                Pflicht, weil der Gläubig-Slider auf der gläubigen Seite steht (≤ −1).
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
              Fraktionszugehörigkeit (Aurenfurt) *
            </label>
            <select
              value={value.cityFactionId ?? ""}
              onChange={(e) =>
                patch({
                  cityFactionId: (e.target.value || null) as FactionId | null,
                })
              }
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
            >
              <option value="">keine</option>
              {AURENFURT_FACTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <p className="mt-1 font-libre text-[11px] text-gray-500">
              Auswahl aus dem Aurenfurt-Fraktionsmodell — getrennt von der Welt-Fraktion oben.
            </p>
          </div>

          <div>
            <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-400">
              Individuelle Zielvorgabe *
            </label>
            <textarea
              value={value.cityAgenda ?? ""}
              onChange={(e) => patch({ cityAgenda: e.target.value })}
              rows={3}
              placeholder="Klarer Agenda-Satz für die Stadtsimulation …"
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none resize-y"
            />
          </div>

          <NpcCityPowers value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
