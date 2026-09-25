"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { CITY_BUILDINGS, districtName, type CityBuilding } from "./aurenfurt-districts";

type Props = {
  building: CityBuilding | null;
  hovered: CityBuilding | null;
  onClose: () => void;
  onLeave: () => void;
  onSelect: (id: string) => void;
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

export function HoloCityOverlay({ building, hovered, onClose, onLeave, onSelect }: Props) {
  const hint = hovered && hovered.id !== building?.id ? hovered.name : null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(2,8,12,0.78)_100%)]" />

      <div className="pointer-events-auto absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-cinzel text-sm font-bold text-accent-gold">Aurenfurt</p>
          <h2 className="font-barlow text-3xl font-extrabold uppercase tracking-wide text-hero-vibrant">
            Holo-Diorama
          </h2>
          <p className="mt-1 font-libre text-sm text-gray-300">
            {hint
              ? hint
              : "Gebäude auf der schwebenden Tafel wählen. Kriminalität und Vattrak hängen am Ort."}
          </p>
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

      <AnimatePresence>
        {building ? (
          <motion.aside
            key={building.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28 }}
            className="pointer-events-auto absolute bottom-20 right-4 z-20 w-72 max-w-[calc(100%-2rem)] rounded-lg border border-cyan-200/40 bg-[#041018]/90 p-4 shadow-[0_0_24px_rgba(80,220,255,0.25)] backdrop-blur-md"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                  {districtName(building.districtId)}
                </p>
                <h3 className="font-cinzel text-lg font-bold text-accent-gold">{building.name}</h3>
              </div>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Auswahl aufheben">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 font-libre text-sm leading-relaxed text-gray-200">{building.summary}</p>
            <div className="space-y-2">
              <Meter label="Kriminalität" value={building.crime} tone="bg-red-500" />
              <Meter label="Vattrak" value={building.vattrak} tone="bg-hero-vibrant" />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-auto absolute inset-x-4 bottom-4 flex gap-2 overflow-x-auto pb-1">
        {CITY_BUILDINGS.map((place) => {
          const active = building?.id === place.id;
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => onSelect(place.id)}
              className={`shrink-0 rounded border px-2.5 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide ${
                active
                  ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                  : "border-cyan-200/35 bg-[#041018]/75 text-cyan-50 hover:border-cyan-100/70"
              }`}
            >
              {place.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
