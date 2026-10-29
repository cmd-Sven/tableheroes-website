"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Radar, X } from "lucide-react";
import { findDistrict } from "./aurenfurt-districts";
import {
  aspectLabel,
  influenceInWords,
  poiLoreHref,
  poiTooltipImage,
  POI_INFLUENCE_COLORS,
  type AurenfurtMapPoi,
} from "./aurenfurt-map-pois";
import type { NpcDetailLinkContext } from "./aurenfurt-npcs";
import { CityHudChrome } from "./CityHudFrame";
import { shortIntro, type HoloLeadNpc } from "./holo-overlay-utils";

type HoloPoiPanelProps = {
  poi: AurenfurtMapPoi;
  leadNpc: HoloLeadNpc | null;
  npcLinkContext: NpcDetailLinkContext;
  influenceReachOn: boolean;
  onToggleInfluenceReach?: () => void;
  onClose: () => void;
  /** Portrait-Klick öffnet das NPC-Modal. */
  onOpenNpc?: () => void;
  /** Ort-Panel seitlich weggeschoben, während das NPC-Modal offen ist. */
  shifted?: boolean;
};

export function HoloPoiPanel({
  poi,
  leadNpc,
  npcLinkContext,
  influenceReachOn,
  onToggleInfluenceReach,
  onClose,
  onOpenNpc,
  shifted = false,
}: HoloPoiPanelProps) {
  const poiImage = poiTooltipImage(poi.imageUrl) ?? poi.imageUrl;
  const loreHref = poiLoreHref(npcLinkContext.worldId ?? "", poi.id, npcLinkContext.campaignId);
  const intro = poi.description ? shortIntro(poi.description) : null;
  const districtName = findDistrict(poi.districtId)?.name ?? "Viertel";
  const influences = poi.influences;

  return (
    <motion.aside
      key={`poi:${poi.id}`}
      role="dialog"
      aria-modal={!shifted}
      aria-label={poi.name}
      initial={{ opacity: 0, x: 48 }}
      animate={{
        opacity: shifted ? 0.55 : 1,
        x: shifted ? -28 : 0,
        scale: shifted ? 0.96 : 1,
      }}
      exit={{ opacity: 0, x: 48 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`pointer-events-auto relative flex h-auto max-h-full w-sm max-w-[min(calc(100vw-2.75rem),24rem)] flex-col overflow-hidden bg-linear-to-b from-background-card/98 via-background-card/95 to-background-dark/98 shadow-2xl backdrop-blur-md ${
        shifted ? "z-10" : "z-20"
      }`}
    >
      <CityHudChrome density="panel" />
      <div className="relative z-10 flex shrink-0 items-start justify-between gap-2 border-b border-hero-dark/50 px-4 pb-2 pt-14">
        <div className="min-w-0">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
            {poi.kind}
          </p>
          <h2 className="truncate font-cinzel text-lg font-bold text-accent-gold">{poi.name}</h2>
          <p className="mt-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200/80">
            {districtName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
          aria-label="Auswahl aufheben"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative z-10 space-y-3 overflow-y-auto px-4 pb-14 pt-3">
        {poiImage || leadNpc?.imageUrl ? (
          <div className="relative">
            {poiImage ? (
              <div className="relative aspect-[2.4/1] max-h-36 overflow-hidden rounded border border-accent-gold/40">
                <Image src={poiImage} alt={poi.name} fill sizes="24rem" className="object-cover" />
              </div>
            ) : (
              <div className="aspect-[2.4/1] max-h-36 rounded border border-accent-gold/20 bg-background-dark/50" />
            )}
            {leadNpc?.imageUrl ? (
              onOpenNpc ? (
                <button
                  type="button"
                  onClick={onOpenNpc}
                  className="absolute -right-1 -top-3 z-20 h-20 w-20 overflow-hidden rounded-full border-2 border-accent-gold bg-background-dark shadow-lg shadow-black/50 ring-0 transition hover:ring-2 hover:ring-accent-gold/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
                  title={`${leadNpc.name} öffnen`}
                  aria-label={`${leadNpc.name} – Dossier öffnen`}
                >
                  <Image
                    src={leadNpc.imageUrl}
                    alt={leadNpc.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <div
                  className="absolute -right-1 -top-3 z-20 h-20 w-20 overflow-hidden rounded-full border-2 border-accent-gold bg-background-dark shadow-lg shadow-black/50"
                  title={leadNpc.role ? `${leadNpc.name} · ${leadNpc.role}` : leadNpc.name}
                >
                  <Image
                    src={leadNpc.imageUrl}
                    alt={leadNpc.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                </div>
              )
            ) : null}
          </div>
        ) : null}
        {intro ? <p className="font-libre text-sm leading-relaxed text-gray-200">{intro}</p> : null}

        <div>
          <p className="mb-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
            Einfluss
          </p>
          {influences.length > 0 ? (
            <ul className="space-y-1.5" aria-label="Wichtige Attribute des Orts">
              {influences.map((entry) => {
                const sign = entry.delta > 0 ? "+" : "";
                return (
                  <li
                    key={`${entry.aspect}-${entry.delta}`}
                    className="flex items-center justify-between gap-3 rounded border border-hero-dark/60 bg-background-dark/40 px-2.5 py-1.5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: POI_INFLUENCE_COLORS[entry.aspect] }}
                        aria-hidden
                      />
                      <span className="truncate font-barlow text-xs font-bold uppercase tracking-wide text-gray-100">
                        {aspectLabel(entry.aspect)}
                      </span>
                    </span>
                    <span
                      className="shrink-0 font-barlow text-xs font-bold uppercase tracking-wide"
                      style={{ color: POI_INFLUENCE_COLORS[entry.aspect] }}
                      title={influenceInWords(entry)}
                    >
                      {sign}
                      {entry.delta}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="font-libre text-xs text-gray-400">Keine Einflusswerte hinterlegt.</p>
          )}
        </div>

        {onToggleInfluenceReach ? (
          <button
            type="button"
            onClick={onToggleInfluenceReach}
            aria-pressed={influenceReachOn}
            className={`inline-flex w-full items-center justify-center gap-2 rounded border px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide transition-colors ${
              influenceReachOn
                ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                : "border-hero-dark bg-hero-dark/30 text-cyan-100 hover:border-accent-gold/60 hover:text-accent-gold"
            }`}
          >
            <Radar className="h-3.5 w-3.5" aria-hidden />
            {influenceReachOn ? "Einflussbereich aus" : "Einflussbereich"}
          </button>
        ) : null}

        {npcLinkContext.worldId ? (
          <a
            href={loreHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded border border-hero-vibrant bg-hero-vibrant/15 px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant hover:bg-hero-vibrant/25"
          >
            Mehr
          </a>
        ) : null}
      </div>
    </motion.aside>
  );
}
