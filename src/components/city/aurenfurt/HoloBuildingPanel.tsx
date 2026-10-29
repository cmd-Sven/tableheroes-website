"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "framer-motion";
import { Radar, X } from "lucide-react";
import { buildingCategoryForId } from "./aurenfurt-building-categories";
import {
  findBuilding,
  findDistrict,
  type CityBuilding,
  type LandmarkModel,
  type SimSubject,
} from "./aurenfurt-districts";
import { poiLoreHref, poiTooltipImage } from "./aurenfurt-map-pois";
import type { AurenfurtPlaceLore } from "./aurenfurt-lore";
import type { AurenfurtNpc, NpcDetailLinkContext } from "./aurenfurt-npcs";
import { CityHudChrome } from "./CityHudFrame";
import { shortIntro, type HoloLeadNpc } from "./holo-overlay-utils";

const HoloLandmarkPreview = dynamic(() => import("./scene/HoloLandmarkPreview"), {
  ssr: false,
});

type HoloBuildingPanelProps = {
  subject: SimSubject;
  lore: AurenfurtPlaceLore | null;
  selectedBuilding: CityBuilding | null;
  buildingLocationId: string | null;
  buildingReachHint: string | null;
  landmark: LandmarkModel | null;
  operator: AurenfurtNpc | null;
  leadNpc: HoloLeadNpc | null;
  npcLinkContext: NpcDetailLinkContext;
  influenceReachOn: boolean;
  onToggleInfluenceReach?: () => void;
  onClose: () => void;
  onOpenNpc?: () => void;
  shifted?: boolean;
};

export function HoloBuildingPanel({
  subject,
  lore,
  selectedBuilding,
  buildingLocationId,
  buildingReachHint,
  landmark,
  operator,
  leadNpc,
  npcLinkContext,
  influenceReachOn,
  onToggleInfluenceReach,
  onClose,
  onOpenNpc,
  shifted = false,
}: HoloBuildingPanelProps) {
  const landmarkModel: LandmarkModel | undefined =
    landmark ?? findBuilding(subject.id)?.landmark;
  const building = selectedBuilding ?? findBuilding(subject.id);
  const category = building
    ? buildingCategoryForId(building.id, building.category)
    : subject.kicker;
  const districtName = findDistrict(subject.districtId)?.name ?? "Viertel";
  const buildingImage = lore?.imageUrl ? poiTooltipImage(lore.imageUrl) ?? lore.imageUrl : null;
  const intro = shortIntro(
    lore?.description?.trim() || building?.summary || subject.summary || "",
  );
  const loreId = buildingLocationId || (building?.fromEditor ? building.id : null);
  const loreHref =
    loreId && npcLinkContext.worldId
      ? poiLoreHref(npcLinkContext.worldId, loreId, npcLinkContext.campaignId)
      : null;
  const kpiRows: { label: string; value: string; color: string }[] = [];
  if (building) {
    kpiRows.push({
      label: "Wohlstand",
      value: `${building.prosperityLevel}/5`,
      color: "#cab926",
    });
    kpiRows.push({
      label: "Unruhe",
      value: String(building.isHotspot),
      color: building.isHotspot >= 60 ? "#ef4444" : "#f59e0b",
    });
    if (building.specialBonus?.name) {
      kpiRows.push({
        label: "Bonus",
        value: building.specialBonus.name,
        color: "#67e8f9",
      });
    }
  }
  if (buildingReachHint) {
    kpiRows.push({ label: "Reichweite", value: buildingReachHint, color: "#cab926" });
  }
  if (operator) {
    kpiRows.push({
      label: "Betreiber",
      value: `${operator.influenceAndLoyalty.influence}`,
      color: "#379806",
    });
  }

  return (
    <motion.aside
      key={`building:${subject.id}`}
      role="dialog"
      aria-modal={!shifted}
      aria-label={subject.name}
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
            {category}
          </p>
          <h2 className="truncate font-cinzel text-lg font-bold text-accent-gold">{subject.name}</h2>
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
        {buildingImage || leadNpc?.imageUrl || landmarkModel ? (
          <div className="relative">
            {buildingImage ? (
              <div className="relative aspect-[2.4/1] max-h-36 overflow-hidden rounded border border-accent-gold/40">
                <Image
                  src={buildingImage}
                  alt={subject.name}
                  fill
                  sizes="24rem"
                  className="object-cover"
                />
              </div>
            ) : landmarkModel ? (
              <div className="overflow-hidden rounded border border-accent-gold/40">
                <HoloLandmarkPreview key={subject.id} model={landmarkModel} />
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
            Attribute
          </p>
          {kpiRows.length > 0 ? (
            <ul className="space-y-1.5" aria-label="Wichtige Attribute des Gebäudes">
              {kpiRows.map((row) => (
                <li
                  key={`${row.label}-${row.value}`}
                  className="flex items-center justify-between gap-3 rounded border border-hero-dark/60 bg-background-dark/40 px-2.5 py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                      aria-hidden
                    />
                    <span className="truncate font-barlow text-xs font-bold uppercase tracking-wide text-gray-100">
                      {row.label}
                    </span>
                  </span>
                  <span
                    className="max-w-[55%] shrink-0 truncate text-right font-barlow text-xs font-bold uppercase tracking-wide"
                    style={{ color: row.color }}
                  >
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-libre text-xs text-gray-400">Keine Attribute hinterlegt.</p>
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

        {loreHref ? (
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
