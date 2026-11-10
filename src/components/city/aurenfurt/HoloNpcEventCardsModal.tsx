"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Layers, Loader2, X } from "lucide-react";
import {
  CARD_RANGE_LABELS,
  CITY_METER_LABELS,
  defaultCardDuration,
  defaultCardRange,
  type CityEventCard,
  type CityInfluenceTier,
  type CityMeter,
} from "@/src/lib/npcs/city-simulation";

type CardPlay = { cardId: string; startedOn: string };

/** Lockerer als CityEventCard: Overlay liefert meter als string. */
type OverlayEventCard = {
  id: string;
  title: string;
  text: string;
  sortOrder: number;
  trigger?: string | null;
  durationDays?: number;
  range?: CityEventCard["range"];
  sectorLabel?: string | null;
  extraDistrictIds?: string[];
  effects?: Array<{ meter: string; delta: number }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  npcName: string;
  cards: OverlayEventCard[];
  cardPlays: CardPlay[];
  tier: CityInfluenceTier | null;
  npcHref: string | null;
  layPendingId: string | null;
  /** Live Session Scheduled → nur Ansicht. */
  isPrepMode?: boolean;
  onLayCard: (cardId: string) => void;
};

function playIsOpen(startedOn: string, durationDays: number) {
  const start = Date.parse(`${startedOn}T00:00:00Z`);
  if (!Number.isFinite(start)) return false;
  return Date.now() < start + durationDays * 86_400_000;
}

export function HoloNpcEventCardsModal({
  open,
  onClose,
  npcName,
  cards,
  cardPlays,
  tier,
  npcHref,
  layPendingId,
  isPrepMode = false,
  onLayCard,
}: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!host) return null;

  const sorted = [...cards].sort((a, b) => a.sortOrder - b.sortOrder);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="npc-event-cards-modal"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Modal schließen"
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Ereigniskarten: ${npcName}`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[min(88vh,52rem)] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-hero-border bg-background-card shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hero-dark/60 px-5 py-4">
              <div className="min-w-0">
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                  NPC-Ereigniskarten
                </p>
                <h2 className="truncate font-cinzel text-lg font-bold text-accent-gold">{npcName}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {sorted.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <Layers className="h-10 w-10 text-accent-gold/70" aria-hidden />
                  <p className="max-w-md font-libre text-sm leading-relaxed text-gray-200">
                    Für diesen NPC liegen noch keine Ereigniskarten im Deck. Lege sie in der NPC-Akte
                    an.
                  </p>
                  {npcHref ? (
                    <a
                      href={npcHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/15 px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant hover:bg-hero-vibrant/25"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      NPC-Akte öffnen
                    </a>
                  ) : (
                    <p className="font-libre text-xs text-gray-500">
                      Kein Direktlink zur NPC-Akte verfügbar.
                    </p>
                  )}
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {sorted.map((card, index) => {
                    const duration = card.durationDays ?? defaultCardDuration(tier);
                    const range = card.range ?? defaultCardRange(tier);
                    const openPlay = cardPlays.some(
                      (play) => play.cardId === card.id && playIsOpen(play.startedOn, duration),
                    );
                    return (
                      <li
                        key={card.id}
                        className="flex flex-col rounded border border-hero-dark/70 bg-background-dark/60 p-4 shadow-lg"
                      >
                        <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Karte {index + 1}
                        </p>
                        <h3 className="mt-0.5 font-cinzel text-base font-bold text-accent-gold">
                          {card.title}
                        </h3>
                        <p className="mt-2 flex-1 font-libre text-xs leading-relaxed text-gray-200">
                          {card.text}
                        </p>
                        {card.trigger?.trim() ? (
                          <p className="mt-2 font-libre text-[11px] text-gray-400">
                            Auslöser: {card.trigger}
                          </p>
                        ) : null}
                        <p className="mt-2 font-libre text-[11px] text-gray-400">
                          {CARD_RANGE_LABELS[range]}
                          {card.sectorLabel ? ` · ${card.sectorLabel}` : ""} · {duration} Tage
                          {(card.effects ?? [])
                            .map((effect) => {
                              const meter = effect.meter as CityMeter;
                              const label =
                                meter in CITY_METER_LABELS
                                  ? CITY_METER_LABELS[meter]
                                  : effect.meter;
                              return ` · ${label} ${effect.delta > 0 ? "+" : ""}${effect.delta}`;
                            })
                            .join("")}
                        </p>
                        <button
                          type="button"
                          disabled={openPlay || layPendingId === card.id || isPrepMode}
                          onClick={() => onLayCard(card.id)}
                          className="mt-3 inline-flex items-center justify-center rounded border border-hero-border px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant disabled:border-gray-700 disabled:text-gray-500"
                        >
                          {isPrepMode ? (
                            "Nur Ansicht · Vorbereitung"
                          ) : openPlay ? (
                            "Liegt bereits aus"
                          ) : layPendingId === card.id ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                              Wird ausgelegt…
                            </span>
                          ) : (
                            "Karte ausspielen"
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    host,
  );
}
