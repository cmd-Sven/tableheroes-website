"use client";

import { factionName, isCityFactionId } from "@/src/components/city/aurenfurt/aurenfurt-factions";
import {
  CITY_INFLUENCE_TIER_LABELS,
  type CitySimulationFields,
} from "@/src/lib/npcs/city-simulation";

const AXES = [
  { key: "cityAxisLoyalCriminal", left: "Loyal", right: "Kriminell" },
  { key: "cityAxisGreedyAltruist", left: "Habgierig", right: "Gutmensch" },
  { key: "cityAxisPiousSkeptic", left: "Gläubig", right: "Ungläubig" },
  { key: "cityAxisSuperstitionReason", left: "Aberglaube", right: "Aufgeklärt" },
] as const;

export function NpcCitySimulationSheet({
  cityName,
  fields,
}: {
  cityName: string;
  fields: CitySimulationFields;
}) {
  const faction =
    fields.cityFactionId && isCityFactionId(fields.cityFactionId)
      ? factionName(fields.cityFactionId)
      : null;
  const cards = [...fields.cityEventDeck].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6 p-6">
      <section>
        <h2 className="mb-3 border-b border-hero-border pb-2 font-barlow text-lg font-semibold text-accent-blood">
          Stadtsimulation
        </h2>
        <p className="font-libre text-gray-200">
          Dieser NPC gehört zur Stadtsimulation <span className="text-accent-gold">{cityName}</span>.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Fact label="Einfluss" value={fields.cityInfluenceTier ? CITY_INFLUENCE_TIER_LABELS[fields.cityInfluenceTier] : "—"} />
          <Fact label="Fraktion in der Stadt" value={faction ?? "keine"} />
          <Fact label="Gottheit" value={fields.cityDeity?.trim() || "—"} />
        </dl>
      </section>

      <section>
        <h2 className="mb-3 border-b border-hero-border pb-2 font-barlow text-lg font-semibold text-accent-blood">
          Attribute
        </h2>
        <div className="space-y-4">
          {AXES.map((axis) => (
            <AxisReadout
              key={axis.key}
              left={axis.left}
              right={axis.right}
              value={fields[axis.key]}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 border-b border-hero-border pb-2 font-barlow text-lg font-semibold text-accent-blood">
          Zielvorgabe
        </h2>
        <p className="font-libre leading-relaxed text-gray-200">
          {fields.cityAgenda?.trim() || "Keine Zielvorgabe hinterlegt."}
        </p>
      </section>

      <section>
        <h2 className="mb-3 border-b border-hero-border pb-2 font-barlow text-lg font-semibold text-accent-blood">
          Ereigniskarten
        </h2>
        {cards.length === 0 ? (
          <p className="font-libre text-sm text-gray-400">Noch keine Ereigniskarten in diesem Deck.</p>
        ) : (
          <ol className="space-y-3">
            {cards.map((card, index) => (
              <li key={card.id} className="rounded-md border border-hero-dark bg-slate-950/40 p-4">
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Karte {index + 1}
                </p>
                <h3 className="mt-1 font-cinzel text-base font-bold text-accent-gold">{card.title}</h3>
                <p className="mt-2 font-libre text-sm leading-relaxed text-gray-200">{card.text}</p>
                {card.trigger?.trim() ? (
                  <p className="mt-2 font-libre text-xs text-gray-400">Auslöser: {card.trigger}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hero-dark bg-black/20 px-3 py-2">
      <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 font-libre text-sm text-gray-100">{value}</dd>
    </div>
  );
}

function AxisReadout({ left, right, value }: { left: string; right: string; value: number | null }) {
  const score = value ?? 0;
  const lean = score < 0 ? left : score > 0 ? right : "Mitte";
  const marker = ((score + 5) / 10) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 font-barlow text-xs uppercase text-gray-400">
        <span>{left}</span>
        <span className="font-bold text-accent-gold">
          {lean} · {score}
        </span>
        <span>{right}</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-slate-800">
        <span className="absolute left-1/2 top-0 h-full w-px bg-accent-gold/80" />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-hero-vibrant bg-hero-vibrant"
          style={{ left: `calc(${marker}% - 6px)` }}
        />
      </div>
    </div>
  );
}
