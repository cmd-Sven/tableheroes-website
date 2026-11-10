"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Layers, Loader2, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { layNpcCityCard } from "@/src/app/dashboard/worlds/city-sim-event-actions";
import { factionName, isCityFactionId } from "./aurenfurt-factions";
import {
  loadMapNpcOverlayDetail,
  type MapNpcOverlayDetail,
} from "./aurenfurt-map-poi-actions";
import { npcDetailHref, type NpcDetailLinkContext } from "./aurenfurt-npcs";
import { CityHudChrome } from "./CityHudFrame";
import { HoloNpcEventCardsModal } from "./HoloNpcEventCardsModal";
import { shortIntro, type HoloLeadNpc } from "./holo-overlay-utils";
import {
  CITY_INFLUENCE_TIER_LABELS,
  type CityInfluenceTier,
} from "@/src/lib/npcs/city-simulation";

type Props = {
  lead: HoloLeadNpc;
  worldId: string;
  npcLinkContext: NpcDetailLinkContext;
  /** Client-Prop; Server prüft zusätzlich die GM-Rechte. */
  isGm: boolean;
  /** Live Session Scheduled → Vorbereitung. */
  isPrepMode?: boolean;
  sessionId?: string | null;
  /** Live: öffnet den Session-Shop-Fullscreen-Overlay. */
  onOpenShop?: (shopId: string, merchantNpcId: string) => void;
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

export function HoloNpcPanel({
  lead,
  worldId,
  npcLinkContext,
  isGm,
  isPrepMode = false,
  sessionId = null,
  onOpenShop,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<MapNpcOverlayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [layPendingId, setLayPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const liveShopAvailable = Boolean(onOpenShop && sessionId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    setShowCards(false);
    setShowShop(false);
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
    if (isPrepMode) {
      toast.message("Vorbereitung: Ereigniskarten können erst Live ausgespielt werden.");
      return;
    }
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

  function openLadenkatalog() {
    if (!detail?.shopId) return;
    if (liveShopAvailable && onOpenShop) {
      if (isPrepMode) {
        toast.message("Vorbereitung: Katalog nur zur Ansicht — kein Handel möglich.");
      }
      onOpenShop(detail.shopId, detail.id);
      return;
    }
    setShowShop((open) => !open);
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
            {detail?.isMerchant && detail.shopId ? (
              <p className="inline-flex items-center gap-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                <ShoppingBag className="h-3 w-3" aria-hidden />
                Händler
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

        {canSeeCards && detail?.shop ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={openLadenkatalog}
              aria-expanded={liveShopAvailable ? undefined : showShop}
              className={`inline-flex w-full items-center justify-center gap-2 rounded border px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide transition-colors ${
                !liveShopAvailable && showShop
                  ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                  : "border-hero-dark bg-hero-dark/30 text-cyan-100 hover:border-accent-gold/60 hover:text-accent-gold"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
              {liveShopAvailable
                ? `Ladenkatalog (${detail.shop.items.length})`
                : showShop
                  ? "Ladenkatalog schließen"
                  : `Ladenkatalog (${detail.shop.items.length})`}
            </button>

            <AnimatePresence initial={false}>
              {!liveShopAvailable && showShop ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="rounded border border-hero-dark/70 bg-background-dark/50 p-3">
                    <p className="font-cinzel text-sm font-bold text-accent-gold">
                      {detail.shop.name}
                    </p>
                    <p className="mt-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      {detail.shop.shop_mode === "archetype" ? "Archetyp" : "Unique"} · nur Ansicht
                    </p>
                    {detail.shop.items.length === 0 ? (
                      <p className="mt-2 font-libre text-xs text-gray-400">
                        Keine Waren hinterlegt.
                      </p>
                    ) : (
                      <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                        {detail.shop.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-2 rounded border border-hero-dark/50 bg-background-card/40 px-2 py-1.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-barlow text-[11px] font-bold uppercase tracking-wide text-cyan-100">
                                {item.name}
                              </p>
                              <p className="font-libre text-[10px] text-gray-400">
                                {[item.item_type, item.rarity, item.is_magical ? "magisch" : null]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <span className="shrink-0 font-barlow text-[11px] font-bold tabular-nums text-accent-gold">
                              {Number(item.base_price_gp).toLocaleString("de-DE", {
                                maximumFractionDigits: 2,
                              })}{" "}
                              GM
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 font-libre text-[10px] leading-relaxed text-gray-500">
                      Handel aktivieren: Live-Session → NPC auf die Bühne → „Shop öffnen“.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {canSeeCards ? (
          <button
            type="button"
            onClick={() => setShowCards(true)}
            aria-haspopup="dialog"
            className="inline-flex w-full items-center justify-center gap-2 rounded border border-hero-dark bg-hero-dark/30 px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-cyan-100 transition-colors hover:border-accent-gold/60 hover:text-accent-gold"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden />
            {cards.length > 0 ? `Ereigniskarten (${cards.length})` : "Ereigniskarten"}
          </button>
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

      {canSeeCards ? (
        <HoloNpcEventCardsModal
          open={showCards}
          onClose={() => setShowCards(false)}
          npcName={detail?.name || lead.name}
          cards={cards}
          cardPlays={detail?.cardPlays ?? []}
          tier={tier}
          npcHref={href}
          layPendingId={layPendingId}
          isPrepMode={isPrepMode}
          onLayCard={layCard}
        />
      ) : null}
    </motion.aside>
  );
}

