"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Map, X } from "lucide-react";
import { TravelDowntimeGmPanel } from "@/src/components/session/TravelDowntimeGmPanel";
import type { FapAllocationsMap } from "@/src/lib/downtime-fap-types";

type PartyCharacter = {
  id: string;
  name: string;
  rations_count: number;
  starvation_days: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  partyCharacters: PartyCharacter[];
  downtimeActive: boolean;
  downtimeCurrentDay: number;
  downtimeTotalDays: number;
  fapAllocations: FapAllocationsMap;
  onReload: () => void | Promise<void>;
};

/**
 * GM: Reise / FAP / Rationen — volle Fläche statt gequetschter linker Spalte.
 * z unter Loot-Gun (110), Jagdbeute-Overlay im Panel darüber (z-130).
 */
export function TravelDowntimeGmModal({
  open,
  onClose,
  sessionId,
  partyCharacters,
  downtimeActive,
  downtimeCurrentDay,
  downtimeTotalDays,
  fapAllocations,
  onReload,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="travel-downtime-gm-modal"
          role="presentation"
          className="fixed inset-0 z-[108] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            role="button"
            tabIndex={0}
            aria-label="Schließen"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="travel-gm-modal-title"
            className="relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-background-card/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-md sm:max-w-3xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hero-border/60 bg-black/20 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Map className="h-7 w-7 shrink-0 text-accent-gold" aria-hidden />
                <div className="min-w-0">
                  <h2
                    id="travel-gm-modal-title"
                    className="font-barlow text-xl font-extrabold uppercase tracking-wide text-hero-vibrant sm:text-2xl"
                  >
                    Reise & FAP
                  </h2>
                  <p className="font-libre text-xs text-gray-400 sm:text-sm">
                    Reisetage, Gruppen-Fortschritt, Rationen und nächster Tag — mit genug Platz für alle Einstellungen.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/20 text-gray-200 transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
                aria-label="Modal schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <TravelDowntimeGmPanel
                layout="modal"
                sessionId={sessionId}
                partyCharacters={partyCharacters}
                downtimeActive={downtimeActive}
                downtimeCurrentDay={downtimeCurrentDay}
                downtimeTotalDays={downtimeTotalDays}
                fapAllocations={fapAllocations}
                onReload={onReload}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
