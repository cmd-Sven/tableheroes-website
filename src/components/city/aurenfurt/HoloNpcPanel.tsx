"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Layers, Loader2, X } from "lucide-react";
import { layNpcCityCard } from "@/src/app/dashboard/worlds/city-sim-event-actions";
import { factionName, isCityFactionId } from "./aurenfurt-factions";
import {
  loadMapNpcOverlayDetail,
  type MapNpcOverlayDetail,
} from "./aurenfurt-map-poi-actions";
import { npcDetailHref, type NpcDetailLinkContext } from "./aurenfurt-npcs";
import { CityHudChrome } from "./CityHudFrame";
import { shortIntro, type HoloLeadNpc } from "./holo-overlay-utils";
import {
  CARD_RANGE_LABELS,
  CITY_INFLUENCE_TIER_LABELS,
  CITY_METER_LABELS,
  defaultCardDuration,
  defaultCardRange,
  type CityInfluenceTier,
  type CityMeter,
} from "@/src/lib/npcs/city-simulation";

type Props = {
  lead: HoloLeadNpc;
  worldId: string;
  npcLinkContext: NpcDetailLinkContext;
  /** Client-Prop; Server prüft zusätzlich die GM-Rechte. */
  isGm: boolean;
  onClose: () => void;
};

const AXES: Array<{
  key: keyof Pick<
    MapNpcOverlayDetail,
    | "cityAxisLoyalCriminal"
    | "cityAxisGreedyAltruist"
    | "cityAxisPiousSkeptic"
    | "cityAxisSuperstitionReason"
  >;
  left: string;
  right: string;
}> = [
  { key: "cityAxisLoyalCriminal", left: "Loyal", right: "Kriminell" },
  { key: "cityAxisGreedyAltruist", left: "Habgierig", right: "Gutmensch" },
  { key: "cityAxisPiousSkeptic", left: "Gläubig", right: "Ungläubig" },
  { key: "cityAxisSuperstitionReason", left: "Aberglaube", right: "Aufgeklärt" },
];

function playIsOpen(startedOn: string, durationDays: number) {
  const start = Date.parse(`${startedOn}T00:00:00Z`);
  if (!Number.isFinite(start)) return false;
  return Date.now() < start + durationDays * 86_400_000;
}

export function HoloNpcPanel({ lead, worldId, npcLinkContext, isGm, onClose }: Props) {
  const [detail, setDetail] = useState<MapNpcOverlayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [layPendingId, setLayPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    setShowCards(false);
    void loadMapNpcOverlayDetail(worldId, lead.id).then((row) => {
      if (!active) return;
      if (!row) {
        setError("NPC-Daten konnten nicht geladen werden.");
        setLoading(false);
        return;
      }
      setDetail(row);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [lead.id, worldId]);

  const href = npcDetailHref({ recordId: lead.id }, npcLinkContext);
  const canSeeCards = Boolean(isGm && detail?.isGm);
  const cards = detail?.eventCards ?? [];
  const tier = (detail?.cityInfluenceTier ?? null) as CityInfluenceTier | null;
  const faction =
    detail?.cityFactionId && isCityFactionId(detail.cityFactionId)
      ? factionName(detail.cityFactionId)
      : null;

  function layCard(cardId: string) {
    if (!detail || layPendingId) return;
    setLayPendingId(cardId);
    startTransition(() => {
      void layNpcCityCard(worldId, detail.id, cardId)
        .then(() => {
          const startedOn = new Date().toISOString().slice(0, 10);
          setDetail((current) =>
            current
              ? {
                  ...current,
                  cardPlays: [...current.cardPlays, { cardId, startedOn }],
                }
              : current,
          );
        })
        .catch((err: Error) => alert(err.message || "Karte konnte nicht ausgelegt werden."))
        .finally(() => setLayPendingId(null));
    });
  }

  return (
    <motion.aside
      key={`npc:${lead.id}`}
      role="dialog"
      aria-modal="true"
      aria-label={lead.name}
      initial={{ opacity: 0, x: 56, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.98 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto relative z-20 flex h-auto max-h-full w-sm max-w-[min(calc(100vw-2.75rem),24rem)] flex-col overflow-hidden bg-linear-to-b from-background-card/98 via-background-card/95 to-background-dark/98 shadow-2xl backdrop-blur-md"
    >
      <CityHudChrome density="panel" />
      <div className="relative z-10 flex shrink-0 items-start justify-between gap-2 border-b border-hero-dark/50 px-4 pb-2 pt-14">
        <div className="min-w-0">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
            {detail?.role || lead.role || "NPC"}
          </p>
          <h2 className="truncate font-cinzel text-lg font-bold text-accent-gold">
            {detail?.name || lead.name}
          </h2>
          {detail?.title ? (
            <p className="mt-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200/80">
              {detail.title}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
          aria-label="NPC-Fenster schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative z-10 space-y-3 overflow-y-auto px-4 pb-14 pt-3">
        <div className="flex items-start gap-3">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-accent-gold bg-background-dark shadow-lg shadow-black/40">
            <Image
              src={detail?.imageUrl || lead.imageUrl}
              alt={detail?.name || lead.name}
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 pt-1">
            {detail?.race || detail?.alignment || detail?.status ? (
              <p className="font-libre text-xs text-gray-300">
                {[detail.race, detail.alignment, detail.status].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {faction ? (
              <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                {faction}
              </p>
            ) : null}
            {detail?.cityInfluenceTier &&
            detail.cityInfluenceTier in CITY_INFLUENCE_TIER_LABELS ? (
              <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {CITY_INFLUENCE_TIER_LABELS[detail.cityInfluenceTier as CityInfluenceTier]}
              </p>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 font-barlow text-xs font-bold uppercase tracking-wide text-cyan-100/70">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Dossier wird geöffnet…
          </p>
        ) : null}
        {error ? <p className="font-libre text-sm text-red-300">{error}</p> : null}

        {detail?.description ? (
          <p className="font-libre text-sm leading-relaxed text-gray-200">
            {shortIntro(detail.description, 280)}
          </p>
        ) : null}

        {detail?.cityAgenda ? (
          <div className="rounded border border-hero-dark/60 bg-background-dark/40 px-2.5 py-2">
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
              Agenda
            </p>
            <p className="mt-1 font-libre text-sm leading-relaxed text-gray-200">{detail.cityAgenda}</p>
          </div>
        ) : null}

        {detail?.forCitySimulation ? (
          <div>
            <p className="mb-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
              Gesinnung
            </p>
            <ul className="space-y-2">
              {AXES.map((axis) => {
                const value = detail[axis.key] ?? 0;
                const marker = ((value + 5) / 10) * 100;
                return (
                  <li key={axis.key}>
                    <div className="flex justify-between font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      <span>{axis.left}</span>
                      <span className="text-accent-gold">{value}</span>
                      <span>{axis.right}</span>
                    </div>
                    <div className="relative mt-1 h-1.5 rounded-full bg-slate-900">
                      <span
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-hero-vibrant bg-hero-vibrant"
                        style={{ left: `calc(${marker}% - 5px)` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            {detail.cityDeity ? (
              <p className="mt-2 font-libre text-xs text-gray-400">Gottheit: {detail.cityDeity}</p>
            ) : null}
          </div>
        ) : null}

        {canSeeCards ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowCards((open) => !open)}
              aria-expanded={showCards}
              className={`inline-flex w-full items-center justify-center gap-2 rounded border px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide transition-colors ${
                showCards
                  ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                  : "border-hero-dark bg-hero-dark/30 text-cyan-100 hover:border-accent-gold/60 hover:text-accent-gold"
              }`}
            >
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {showCards
                ? "Ereigniskarten schließen"
                : cards.length > 0
                  ? `Ereigniskarten (${cards.length})`
                  : "Ereigniskarten"}
            </button>

            <AnimatePresence initial={false}>
              {showCards ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  {cards.length === 0 ? (
                    <p className="font-libre text-xs text-gray-400">
                      Für diesen NPC liegen noch keine Ereigniskarten im Deck.
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {[...cards]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((card, index) => {
                          const duration = card.durationDays ?? defaultCardDuration(tier);
                          const range = card.range ?? defaultCardRange(tier);
                          const open = detail.cardPlays.some(
                            (play) =>
                              play.cardId === card.id && playIsOpen(play.startedOn, duration),
                          );
                          return (
                            <li
                              key={card.id}
                              className="rounded border border-hero-dark/70 bg-background-dark/50 p-3"
                            >
                              <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                Karte {index + 1}
                              </p>
                              <h3 className="mt-0.5 font-cinzel text-sm font-bold text-accent-gold">
                                {card.title}
                              </h3>
                              <p className="mt-1.5 font-libre text-xs leading-relaxed text-gray-200">
                                {card.text}
                              </p>
                              {card.trigger?.trim() ? (
                                <p className="mt-1 font-libre text-[11px] text-gray-400">
                                  Auslöser: {card.trigger}
                                </p>
                              ) : null}
                              <p className="mt-1 font-libre text-[11px] text-gray-400">
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
                                disabled={open || layPendingId === card.id}
                                onClick={() => layCard(card.id)}
                                className="mt-2 inline-flex items-center justify-center rounded border border-hero-border px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant disabled:border-gray-700 disabled:text-gray-500"
                              >
                                {open
                                  ? "Liegt bereits aus"
                                  : layPendingId === card.id
                                    ? "Wird ausgelegt…"
                                    : "Karte ausspielen"}
                              </button>
                            </li>
                          );
                        })}
                    </ol>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded border border-hero-vibrant bg-hero-vibrant/15 px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant hover:bg-hero-vibrant/25"
          >
            NPC-Akte öffnen
          </a>
        ) : null}
      </div>
    </motion.aside>
  );
}
