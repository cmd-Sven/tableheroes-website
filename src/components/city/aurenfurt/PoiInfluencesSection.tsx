import {
  formatInfluenceDelta,
  type PoiInfluence,
} from "./aurenfurt-map-pois";

type Props = {
  influences: PoiInfluence[];
  className?: string;
};

/** Lesbare Einflussfaktoren eines besonderen Orts (Lore-Detail). */
export function PoiInfluencesSection({ influences, className = "" }: Props) {
  if (!influences.length) return null;

  return (
    <div className={className}>
      <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
        Einflussfaktoren
      </h3>
      <ul className="flex flex-wrap gap-2">
        {influences.map((entry) => (
          <li
            key={`${entry.aspect}-${entry.delta}`}
            className="rounded border border-hero-border bg-hero-dark/50 px-3 py-1.5 font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold"
          >
            {formatInfluenceDelta(entry)}
          </li>
        ))}
      </ul>
    </div>
  );
}
