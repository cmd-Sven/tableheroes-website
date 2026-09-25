"use client";

import { X } from "lucide-react";
import type { CityDistrict } from "./aurenfurt-districts";

type Props = {
  district: CityDistrict | null;
  onClose: () => void;
  onLeave: () => void;
};

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
        <div className={`h-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function HoloCityOverlay({ district, onClose, onLeave }: Props) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-cinzel text-sm font-bold text-accent-gold">Aurenfurt</p>
          <h2 className="font-barlow text-3xl font-extrabold uppercase tracking-wide text-hero-vibrant">
            Holo-Stadtkarte
          </h2>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-1.5 rounded border border-cyan-200/40 bg-cyan-400/10 px-3 py-1.5 font-barlow text-[11px] font-bold uppercase tracking-wide text-cyan-100 hover:bg-cyan-400/20"
        >
          <X className="h-3.5 w-3.5" />
          Lore
        </button>
      </div>

      {district ? (
        <aside className="absolute bottom-4 right-4 z-20 w-[min(100%,18rem)] rounded-lg border border-cyan-200/40 bg-[#041018]/90 p-4 shadow-[0_0_24px_rgba(80,220,255,0.25)] backdrop-blur-md">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-cinzel text-lg font-bold text-accent-gold">{district.name}</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Zoom zurück">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-3 font-libre text-sm leading-relaxed text-gray-200">{district.summary}</p>
          <div className="space-y-2">
            <Meter label="Kriminalität" value={district.crime} tone="bg-red-500" />
            <Meter label="Vattrak" value={district.vattrak} tone="bg-hero-vibrant" />
          </div>
          <ul className="mt-3 space-y-1">
            {district.locations.map((place) => (
              <li key={place.id} className="font-barlow text-xs uppercase tracking-wide text-cyan-100">
                {place.name}
              </li>
            ))}
          </ul>
        </aside>
      ) : (
        <p className="mt-2 font-libre text-sm text-gray-300">
          Ein Viertel oder den Palast wählen. Der Zoom blendet Orte, Kriminalität und Vattrak ein.
        </p>
      )}
    </>
  );
}
