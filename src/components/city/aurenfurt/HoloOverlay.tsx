"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { HoloSelection, CityBuilding, LandmarkModel, SimSubject } from "./aurenfurt-districts";
import type { FactionStanding } from "./aurenfurt-factions";
import type { ActiveInfluence, DistrictDay } from "./aurenfurt-history";
import type { KeyLocation } from "./aurenfurt-locations";
import type { AurenfurtPlaceLore } from "./aurenfurt-lore";
import type { AurenfurtMapPoi } from "./aurenfurt-map-pois";
import type { AurenfurtNpc, NpcDetailLinkContext } from "./aurenfurt-npcs";
import type { SimProfile } from "./aurenfurt-sim";
import type { DayWeather } from "./aurenfurt-weather";
import { HoloBuildingPanel } from "./HoloBuildingPanel";
import { HoloNpcPanel } from "./HoloNpcPanel";
import { HoloPoiPanel } from "./HoloPoiPanel";
import type { HoloLeadNpc } from "./holo-overlay-utils";

type Props = {
  subject: SimSubject | null;
  lore: AurenfurtPlaceLore | null;
  sim: SimProfile;
  series: DistrictDay[] | null;
  weather: DayWeather;
  weatherSeries: DayWeather[];
  influences: ActiveInfluence[];
  factions: FactionStanding[];
  factionRecordIds?: Record<string, string>;
  locations: KeyLocation[];
  selectedLocation: KeyLocation | null;
  /** Anführer mit Fraktionspräsenz im Viertel */
  leaders?: AurenfurtNpc[];
  /** Betreiber der gewählten Key-Location */
  operator?: AurenfurtNpc | null;
  /** Kontext für NPC-Detail-Links (nur bei vorhandener recordId) */
  npcLinkContext?: NpcDetailLinkContext;
  /** Betrachteter Kalendertag `YYYY-MM-DD` für Diagramm-Marke */
  viewDay?: string;
  isGm?: boolean;
  selectedPoi?: AurenfurtMapPoi | null;
  districtPois?: AurenfurtMapPoi[];
  /** Einflussbereich des besonderen Orts auf der Karte hervorheben. */
  influenceReachOn?: boolean;
  onToggleInfluenceReach?: () => void;
  /** Führender NPC des Orts (Portrait oben rechts am Bild). */
  leadNpc?: HoloLeadNpc | null;
  /** Gewähltes Gebäude (kompaktes Modal wie bei besonderen Orten). */
  selectedBuilding?: CityBuilding | null;
  /** Lore-/Location-UUID des Gebäudes für den Mehr-Link. */
  buildingLocationId?: string | null;
  /** Kurzinfo zum Sektor-Einfluss (Reichweite / Art). */
  buildingReachHint?: string | null;
  /** 3D-Modell des gewählten Gebäudes, auch wenn es nur im Editor liegt. */
  landmark?: LandmarkModel | null;
  onClose: () => void;
  onSelect: (selection: HoloSelection) => void;
};

export function HoloOverlay({
  subject,
  lore,
  operator = null,
  npcLinkContext = {},
  isGm = false,
  selectedPoi = null,
  influenceReachOn = false,
  onToggleInfluenceReach,
  leadNpc = null,
  selectedBuilding = null,
  buildingLocationId = null,
  buildingReachHint = null,
  landmark = null,
  onClose,
}: Props) {
  const [npcOpen, setNpcOpen] = useState(false);
  const placeKey =
    subject?.type === "poi"
      ? `poi:${subject.id}`
      : subject?.type === "building"
        ? `building:${subject.id}`
        : null;

  useEffect(() => {
    setNpcOpen(false);
  }, [placeKey]);

  // Viertel nur auf der Karte hervorheben — kein Seitenfenster.
  if (!subject || subject.type === "district") return null;

  const worldId = npcLinkContext.worldId ?? null;
  const canOpenNpc = Boolean(leadNpc?.imageUrl && worldId);
  const placeShifted = npcOpen && canOpenNpc;

  const placePanel =
    subject.type === "poi" && selectedPoi ? (
      <HoloPoiPanel
        poi={selectedPoi}
        leadNpc={leadNpc}
        npcLinkContext={npcLinkContext}
        influenceReachOn={influenceReachOn}
        onToggleInfluenceReach={onToggleInfluenceReach}
        onClose={onClose}
        onOpenNpc={canOpenNpc ? () => setNpcOpen(true) : undefined}
        shifted={placeShifted}
      />
    ) : subject.type === "building" ? (
      <HoloBuildingPanel
        subject={subject}
        lore={lore}
        selectedBuilding={selectedBuilding}
        buildingLocationId={buildingLocationId}
        buildingReachHint={buildingReachHint}
        landmark={landmark}
        operator={operator}
        leadNpc={leadNpc}
        npcLinkContext={npcLinkContext}
        influenceReachOn={influenceReachOn}
        onToggleInfluenceReach={onToggleInfluenceReach}
        onClose={onClose}
        onOpenNpc={canOpenNpc ? () => setNpcOpen(true) : undefined}
        shifted={placeShifted}
      />
    ) : null;

  if (!placePanel) return null;

  return (
    <div className="flex h-full items-center justify-end gap-3 overflow-hidden p-3">
      <AnimatePresence mode="popLayout">{placePanel}</AnimatePresence>
      <AnimatePresence>
        {npcOpen && leadNpc && worldId ? (
          <HoloNpcPanel
            lead={leadNpc}
            worldId={worldId}
            npcLinkContext={npcLinkContext}
            isGm={isGm}
            onClose={() => setNpcOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
