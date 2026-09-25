"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  AURENFURT_DISTRICTS,
  buildingsInDistrict,
  sameSelection,
  type HoloSelection,
  type SimSubject,
} from "./aurenfurt-districts";
import { SIM_METERS, type SimProfile } from "./aurenfurt-sim";

type Props = {
  subject: SimSubject | null;
  hovered: SimSubject | null;
  selection: HoloSelection | null;
  onClose: () => void;
  onLeave: () => void;
  onSelect: (selection: HoloSelection) => void;
};

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function SimReadout({ sim }: { sim: SimProfile }) {
  return (
    <div className="space-y-2">
      {SIM_METERS.map((meter) => (
        <Meter key={meter.key} label={meter.label} value={sim[meter.key] as number} tone={meter.tone} />
      ))}
      <div className="pt-1">
        <p className="mb-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
          Kulte & Untergrund
        </p>
        {sim.underground.length === 0 ? (
          <p className="font-libre text-sm text-gray-400">Keine bekannte Zelle.</p>
        ) : (
          <ul className="space-y-2">
            {sim.underground.map((cell) => (
              <li key={cell.name}>
                <Meter label={cell.name} value={cell.strength} tone="bg-[#58180D]" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function HoloOverlay({ subject, hovered, selection, onClose, onLeave, onSelect }: Props) {
  const hint = hovered && hovered.id !== subject?.id ? hovered.name : null;
  const places = subject ? buildingsInDistrict(subject.districtId) : [];

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(2,8,12,0.78)_100%)]" />

      <div className="pointer-events-auto absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="font-cinzel text-sm font-bold text-accent-gold">Aurenfurt</p>
          <h2 className="font-barlow text-3xl font-extrabold uppercase tracking-wide text-hero-vibrant">
            Holo-Diorama
          </h2>
          <p className="mt-1 font-libre text-sm text-gray-300">
            {hint ?? "Ein Viertel oder ein Gebäude wählen. Die Tafel zeigt die Lage der Stadt."}
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {AURENFURT_DISTRICTS.map((district) => {
              const active = sameSelection(selection, { type: "district", id: district.id });
              return (
                <button
                  key={district.id}
                  type="button"
                  onClick={() => onSelect({ type: "district", id: district.id })}
                  className={`shrink-0 rounded border px-2.5 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide ${
                    active
                      ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                      : "border-cyan-200/35 bg-[#041018]/75 text-cyan-50 hover:border-cyan-100/70"
                  }`}
                >
                  {district.name}
                </button>
              );
            })}
          </div>
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
        {subject ? (
          <motion.aside
            key={`${subject.type}:${subject.id}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28 }}
            className="pointer-events-auto absolute bottom-4 right-4 z-20 max-h-[min(68vh,34rem)] w-80 max-w-[calc(100%-2rem)] overflow-y-auto rounded-lg border border-cyan-200/40 bg-[#041018]/92 p-4 shadow-[0_0_24px_rgba(80,220,255,0.25)] backdrop-blur-md"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                  {subject.kicker}
                </p>
                <h3 className="font-cinzel text-lg font-bold text-accent-gold">{subject.name}</h3>
              </div>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Auswahl aufheben">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 font-libre text-sm leading-relaxed text-gray-200">{subject.summary}</p>
            <SimReadout sim={subject.sim} />
            {subject.type === "building" ? (
              <button
                type="button"
                onClick={() => onSelect({ type: "district", id: subject.districtId })}
                className="mt-3 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200 hover:text-white"
              >
                Viertel öffnen
              </button>
            ) : (
              <ul className="mt-3 space-y-1 border-t border-cyan-200/20 pt-3">
                {places.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => onSelect({ type: "building", id: place.id })}
                      className="font-barlow text-xs font-bold uppercase tracking-wide text-cyan-100 hover:text-accent-gold"
                    >
                      {place.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
