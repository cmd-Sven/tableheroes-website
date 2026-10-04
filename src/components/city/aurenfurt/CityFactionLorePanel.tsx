import Link from "next/link";
import {
  factionName,
  IDEOLOGY_LABELS,
  RELATIONSHIP_LABELS,
  type FactionStanding,
} from "./aurenfurt-factions";
import { findDistrict } from "./aurenfurt-districts";
import { loreIdFromDistrictId } from "./aurenfurt-district-lore-ids";

type Props = {
  worldId: string;
  standing: FactionStanding;
  dayLabel: string;
  /** Katalog-ID → Fraktions-UUID der Welt. */
  factionRecordIds: Record<string, string>;
};

function formatLegality(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function CityFactionLorePanel({ worldId, standing, dayLabel, factionRecordIds }: Props) {
  return (
    <section className="rounded-lg border border-hero-border bg-background-card p-6 shadow-lg">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-2">
        Stadtsimulation
      </h2>
      <p className="font-libre text-sm text-gray-400 mb-4">
        Stand {dayLabel}. Macht, Legalität und Wirtschaft folgen dem Stadttag und sind mit der Karte verbunden.
      </p>
      <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200 mb-3">
        {IDEOLOGY_LABELS[standing.ideologyAlignment]}
      </p>
      <dl className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Macht</dt>
          <dd className="font-barlow text-xl font-bold text-gray-100">{standing.power}</dd>
        </div>
        <div>
          <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Legalität</dt>
          <dd className="font-barlow text-xl font-bold text-gray-100">{formatLegality(standing.legality)}</dd>
        </div>
        <div>
          <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Wirtschaft</dt>
          <dd className="font-barlow text-xl font-bold text-gray-100">{standing.economicImpact}</dd>
        </div>
      </dl>
      <div className="mb-4">
        <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Präsenz</p>
        <ul className="flex flex-wrap gap-2">
          {standing.districtIds.map((districtId) => (
            <li key={districtId}>
              <Link
                href={`/dashboard/worlds/${worldId}/lore/${loreIdFromDistrictId(districtId)}`}
                className="inline-flex rounded border border-hero-border px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold hover:bg-white/5"
              >
                {findDistrict(districtId)?.name ?? districtId}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {standing.networkRelationships.length > 0 ? (
        <div>
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">
            Beziehungen
          </p>
          <ul className="space-y-1">
            {standing.networkRelationships.map((link) => {
              const recordId = factionRecordIds[link.targetId];
              const label = `${RELATIONSHIP_LABELS[link.kind]} · Stärke ${link.strength}`;
              return (
                <li key={`${link.targetId}-${link.kind}`} className="font-libre text-sm text-gray-200">
                  <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    {label}
                  </span>
                  {recordId ? (
                    <Link
                      href={`/dashboard/worlds/${worldId}/factions/${recordId}`}
                      className="ml-2 text-accent-gold hover:underline"
                    >
                      {factionName(link.targetId)}
                    </Link>
                  ) : (
                    <span className="ml-2">{factionName(link.targetId)}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
