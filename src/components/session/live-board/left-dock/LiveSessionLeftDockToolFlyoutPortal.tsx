/**
 * LiveSessionLeftDockToolFlyoutPortal — Portal-hosted fog/effect/marker/trap toolbars for the left dock.
 */
"use client";

import { createPortal } from "react-dom";
import {
  Bomb,
  Box,
  Circle,
  Eraser,
  MousePointer2,
  Pencil,
  Square,
  Trash2,
  Triangle,
  Undo2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerTool,
  BattlemapTrapTool,
  BattlemapContainerTool,
} from "@/src/lib/session/battlemap-types";
import {
  BATTLEMAP_MARKER_KINDS,
  BATTLEMAP_MARKER_META,
} from "@/src/lib/session/battlemap-types";
import type { MapDrawTool } from "@/src/lib/session/map-draw-types";
import { MAP_DRAW_PRESET_COLORS } from "@/src/lib/session/map-draw-types";
import {
  WORLD_MAP_ICON_KEYS,
  WORLD_MAP_ICON_LABELS,
  type WorldMapPoiTool,
} from "@/src/lib/world-maps/types";
import { WorldMapIcon } from "@/src/lib/world-maps/icons";
import type { ToolFlyoutId } from "./left-dock-constants";
import { FLYOUT_SLIDE } from "./left-dock-constants";
import { MarkerKindIcon, ToolFlyoutButton } from "./left-dock-ui";

type Props = {
  portalReady: boolean;
  toolFlyout: ToolFlyoutId | null;
  flyoutPos: { top: number; left: number } | null;
  fogTool: BattlemapFogTool;
  selectedFogShapeId: string | null;
  onFogToolChange?: (tool: BattlemapFogTool) => void;
  onFogDelete?: () => void;
  onFogClearAll?: () => void;
  fogCount: number;
  effectTool: BattlemapEffectTool;
  selectedEffectTemplateId: string | null;
  onEffectToolChange?: (tool: BattlemapEffectTool) => void;
  onEffectDelete?: () => void;
  onEffectClearAll?: () => void;
  effectCount: number;
  markerTool: BattlemapMarkerTool;
  selectedMarkerId: string | null;
  onMarkerToolChange?: (tool: BattlemapMarkerTool) => void;
  onMarkerDelete?: () => void;
  onMarkerClearAll?: () => void;
  markerCount: number;
  trapTool: BattlemapTrapTool;
  selectedTrapId: string | null;
  onTrapToolChange?: (tool: BattlemapTrapTool) => void;
  onTrapDelete?: () => void;
  onTrapClearAll?: () => void;
  trapCount: number;
  containerTool: BattlemapContainerTool;
  selectedContainerId: string | null;
  onContainerToolChange?: (tool: BattlemapContainerTool) => void;
  onContainerDelete?: () => void;
  onContainerClearAll?: () => void;
  containerCount: number;
  drawTool?: MapDrawTool;
  drawColor?: string;
  drawWidth?: number;
  onDrawToolChange?: (tool: MapDrawTool) => void;
  onDrawColorChange?: (color: string) => void;
  onDrawWidthChange?: (width: number) => void;
  onDrawUndo?: () => void;
  onDrawClearAll?: () => void;
  drawCount?: number;
  poiTool?: WorldMapPoiTool;
  selectedPoiId?: string | null;
  onPoiToolChange?: (tool: WorldMapPoiTool) => void;
  onPoiDelete?: () => void;
  onPoiClearAll?: () => void;
  poiCount?: number;
};

export function LiveSessionLeftDockToolFlyoutPortal({
  portalReady,
  toolFlyout,
  flyoutPos,
  fogTool,
  selectedFogShapeId,
  onFogToolChange,
  onFogDelete,
  onFogClearAll,
  fogCount,
  effectTool,
  selectedEffectTemplateId,
  onEffectToolChange,
  onEffectDelete,
  onEffectClearAll,
  effectCount,
  markerTool,
  selectedMarkerId,
  onMarkerToolChange,
  onMarkerDelete,
  onMarkerClearAll,
  markerCount,
  trapTool,
  selectedTrapId,
  onTrapToolChange,
  onTrapDelete,
  onTrapClearAll,
  trapCount,
  containerTool,
  selectedContainerId,
  onContainerToolChange,
  onContainerDelete,
  onContainerClearAll,
  containerCount,
  drawTool = null,
  drawColor = "#cab926",
  drawWidth = 4,
  onDrawToolChange,
  onDrawColorChange,
  onDrawWidthChange,
  onDrawUndo,
  onDrawClearAll,
  drawCount = 0,
  poiTool = null,
  selectedPoiId = null,
  onPoiToolChange,
  onPoiDelete,
  onPoiClearAll,
  poiCount = 0,
}: Props) {
  if (!portalReady || !toolFlyout || !flyoutPos) return null;

  return createPortal(
    <AnimatePresence>
      {toolFlyout === "fog" && onFogToolChange ? (
        <motion.div
          id="th-tool-flyout"
          key="fog-flyout"
          initial={FLYOUT_SLIDE.initial}
          animate={FLYOUT_SLIDE.animate}
          exit={FLYOUT_SLIDE.exit}
          transition={FLYOUT_SLIDE.transition}
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          className="pointer-events-auto fixed z-[200] flex items-center gap-1.5 rounded-xl border border-amber-900/60 bg-background-card/98 p-1.5 shadow-2xl backdrop-blur-md"
          role="toolbar"
          aria-label="Fog-of-War-Werkzeuge"
        >
          <span className="px-1.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
            Nebel
          </span>
          <ToolFlyoutButton
            label="Nebel: Auswählen"
            active={fogTool === "select"}
            onClick={() => onFogToolChange(fogTool === "select" ? null : "select")}
          >
            <MousePointer2 className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Nebel: Rechteck"
            active={fogTool === "rect"}
            onClick={() => onFogToolChange(fogTool === "rect" ? null : "rect")}
          >
            <Square className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Nebel: Kreis"
            active={fogTool === "circle"}
            onClick={() => onFogToolChange(fogTool === "circle" ? null : "circle")}
          >
            <Circle className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Nebel: Fläche löschen (Entf)"
            active={false}
            tone="danger"
            onClick={() => onFogDelete?.()}
          >
            <Trash2
              className={`h-4 w-4 ${selectedFogShapeId ? "text-red-300" : "opacity-40"}`}
            />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Nebel: Alle Flächen löschen"
            active={false}
            tone="danger"
            onClick={() => onFogClearAll?.()}
          >
            <Eraser className={`h-4 w-4 ${fogCount > 0 ? "text-red-300" : "opacity-40"}`} />
          </ToolFlyoutButton>
        </motion.div>
      ) : null}
      {toolFlyout === "effect" && onEffectToolChange ? (
        <motion.div
          id="th-tool-flyout"
          key="effect-flyout"
          initial={FLYOUT_SLIDE.initial}
          animate={FLYOUT_SLIDE.animate}
          exit={FLYOUT_SLIDE.exit}
          transition={FLYOUT_SLIDE.transition}
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          className="pointer-events-auto fixed z-[200] flex items-center gap-1.5 rounded-xl border border-red-900/50 bg-background-card/98 p-1.5 shadow-2xl backdrop-blur-md"
          role="toolbar"
          aria-label="Effekt-Schablonen-Werkzeuge"
        >
          <span className="px-1.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-red-300/80">
            Effekt
          </span>
          <ToolFlyoutButton
            label="Effekt: Auswählen"
            active={effectTool === "select"}
            tone="effect"
            onClick={() =>
              onEffectToolChange(effectTool === "select" ? null : "select")
            }
          >
            <MousePointer2 className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Effekt: Rechteck"
            active={effectTool === "rect"}
            tone="effect"
            onClick={() => onEffectToolChange(effectTool === "rect" ? null : "rect")}
          >
            <Square className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Effekt: Kreis"
            active={effectTool === "circle"}
            tone="effect"
            onClick={() =>
              onEffectToolChange(effectTool === "circle" ? null : "circle")
            }
          >
            <Circle className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Effekt: Kegel"
            active={effectTool === "cone"}
            tone="effect"
            onClick={() => onEffectToolChange(effectTool === "cone" ? null : "cone")}
          >
            <Triangle className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Effekt: Schablone löschen (Entf)"
            active={false}
            tone="danger"
            onClick={() => onEffectDelete?.()}
          >
            <Trash2
              className={`h-4 w-4 ${selectedEffectTemplateId ? "text-red-300" : "opacity-40"}`}
            />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Effekt: Alle Schablonen löschen"
            active={false}
            tone="danger"
            onClick={() => onEffectClearAll?.()}
          >
            <Eraser
              className={`h-4 w-4 ${effectCount > 0 ? "text-red-300" : "opacity-40"}`}
            />
          </ToolFlyoutButton>
        </motion.div>
      ) : null}
      {toolFlyout === "marker" && onMarkerToolChange ? (
        <motion.div
          id="th-tool-flyout"
          key="marker-flyout"
          initial={FLYOUT_SLIDE.initial}
          animate={FLYOUT_SLIDE.animate}
          exit={FLYOUT_SLIDE.exit}
          transition={FLYOUT_SLIDE.transition}
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          className="pointer-events-auto fixed z-[200] flex max-w-[min(92vw,28rem)] flex-wrap items-center gap-1.5 rounded-xl border border-accent-gold/40 bg-background-card/98 p-1.5 shadow-2xl backdrop-blur-md"
          role="toolbar"
          aria-label="Spezialeffekt-Marker"
        >
          <span className="px-1.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold/90">
            Spezial
          </span>
          <ToolFlyoutButton
            label="Marker: Auswählen / verschieben"
            active={markerTool === "select"}
            onClick={() =>
              onMarkerToolChange(markerTool === "select" ? null : "select")
            }
          >
            <MousePointer2 className="h-4 w-4" />
          </ToolFlyoutButton>
          {BATTLEMAP_MARKER_KINDS.map((kind) => (
            <ToolFlyoutButton
              key={kind}
              label={`${BATTLEMAP_MARKER_META[kind].label}: ${BATTLEMAP_MARKER_META[kind].hint}`}
              active={markerTool === kind}
              onClick={() => onMarkerToolChange(markerTool === kind ? null : kind)}
            >
              <MarkerKindIcon kind={kind} />
            </ToolFlyoutButton>
          ))}
          <ToolFlyoutButton
            label="Marker löschen (Entf)"
            active={false}
            tone="danger"
            onClick={() => onMarkerDelete?.()}
          >
            <Trash2
              className={`h-4 w-4 ${selectedMarkerId ? "text-red-300" : "opacity-40"}`}
            />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Alle Spezialeffekte löschen"
            active={false}
            tone="danger"
            onClick={() => onMarkerClearAll?.()}
          >
            <Eraser
              className={`h-4 w-4 ${markerCount > 0 ? "text-red-300" : "opacity-40"}`}
            />
          </ToolFlyoutButton>
        </motion.div>
      ) : null}
      {toolFlyout === "trap" && onTrapToolChange ? (
        <motion.div
          id="th-tool-flyout"
          key="trap-flyout"
          initial={FLYOUT_SLIDE.initial}
          animate={FLYOUT_SLIDE.animate}
          exit={FLYOUT_SLIDE.exit}
          transition={FLYOUT_SLIDE.transition}
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          className="pointer-events-auto fixed z-[200] flex items-center gap-1.5 rounded-xl border border-red-800/50 bg-background-card/98 p-1.5 shadow-2xl backdrop-blur-md"
          role="toolbar"
          aria-label="Fallen-Werkzeuge"
        >
          <span className="px-1.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-red-300/90">
            Falle
          </span>
          <ToolFlyoutButton
            label="Falle: Auswählen"
            active={trapTool === "select"}
            tone="effect"
            onClick={() => onTrapToolChange(trapTool === "select" ? null : "select")}
          >
            <MousePointer2 className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Falle platzieren (1 Trigger-Zelle)"
            active={trapTool === "place"}
            tone="effect"
            onClick={() => onTrapToolChange(trapTool === "place" ? null : "place")}
          >
            <Bomb className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Falle löschen"
            active={false}
            tone="danger"
            onClick={() => onTrapDelete?.()}
          >
            <Trash2
              className={`h-4 w-4 ${selectedTrapId ? "text-red-300" : "opacity-40"}`}
            />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Alle Fallen löschen"
            active={false}
            tone="danger"
            onClick={() => onTrapClearAll?.()}
          >
            <Eraser className={`h-4 w-4 ${trapCount > 0 ? "text-red-300" : "opacity-40"}`} />
          </ToolFlyoutButton>
        </motion.div>
      ) : null}
      {toolFlyout === "container" && onContainerToolChange ? (
        <motion.div
          id="th-tool-flyout"
          key="container-flyout"
          initial={FLYOUT_SLIDE.initial}
          animate={FLYOUT_SLIDE.animate}
          exit={FLYOUT_SLIDE.exit}
          transition={FLYOUT_SLIDE.transition}
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          className="pointer-events-auto fixed z-[200] flex items-center gap-1.5 rounded-xl border border-amber-700/50 bg-background-card/98 p-1.5 shadow-2xl backdrop-blur-md"
          role="toolbar"
          aria-label="Behälter-Werkzeuge"
        >
          <span className="px-1.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-amber-200/90">
            Behälter
          </span>
          <ToolFlyoutButton
            label="Behälter: Auswählen"
            active={containerTool === "select"}
            tone="effect"
            onClick={() =>
              onContainerToolChange(containerTool === "select" ? null : "select")
            }
          >
            <MousePointer2 className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Behälter platzieren"
            active={containerTool === "place"}
            tone="effect"
            onClick={() =>
              onContainerToolChange(containerTool === "place" ? null : "place")
            }
          >
            <Box className="h-4 w-4" />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Behälter löschen"
            active={false}
            tone="danger"
            onClick={() => onContainerDelete?.()}
          >
            <Trash2
              className={`h-4 w-4 ${selectedContainerId ? "text-red-300" : "opacity-40"}`}
            />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Alle Behälter löschen"
            active={false}
            tone="danger"
            onClick={() => onContainerClearAll?.()}
          >
            <Eraser
              className={`h-4 w-4 ${containerCount > 0 ? "text-red-300" : "opacity-40"}`}
            />
          </ToolFlyoutButton>
        </motion.div>
      ) : null}
      {toolFlyout === "draw" && onDrawToolChange ? (
        <motion.div
          id="th-tool-flyout"
          key="draw-flyout"
          initial={FLYOUT_SLIDE.initial}
          animate={FLYOUT_SLIDE.animate}
          exit={FLYOUT_SLIDE.exit}
          transition={FLYOUT_SLIDE.transition}
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          className="pointer-events-auto fixed z-[200] flex max-w-[min(92vw,22rem)] flex-wrap items-center gap-1.5 rounded-xl border border-accent-gold/40 bg-background-card/98 p-2 shadow-2xl backdrop-blur-md"
          role="toolbar"
          aria-label="Zeichnen"
        >
          <span className="px-1.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold/90">
            Zeichnen
          </span>
          <ToolFlyoutButton
            label="Zeichnen aktivieren"
            active={drawTool === "draw"}
            onClick={() => onDrawToolChange(drawTool === "draw" ? null : "draw")}
          >
            <Pencil className="h-4 w-4" />
          </ToolFlyoutButton>
          <div className="flex items-center gap-1 px-1">
            {MAP_DRAW_PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={`Farbe ${c}`}
                className={`h-5 w-5 rounded-full border-2 ${
                  drawColor === c ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => onDrawColorChange?.(c)}
              />
            ))}
          </div>
          <label className="flex items-center gap-1 px-1 font-barlow text-[9px] font-bold uppercase text-gray-400">
            Dicke
            <input
              type="range"
              min={2}
              max={24}
              value={drawWidth}
              onChange={(e) => onDrawWidthChange?.(Number(e.target.value))}
              className="w-16 accent-hero-vibrant"
            />
            <span className="w-4 tabular-nums text-accent-gold">{drawWidth}</span>
          </label>
          <ToolFlyoutButton
            label="Letzten Strich rückgängig"
            active={false}
            tone="danger"
            onClick={() => onDrawUndo?.()}
          >
            <Undo2 className={`h-4 w-4 ${drawCount > 0 ? "text-red-300" : "opacity-40"}`} />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Alle Zeichnungen löschen"
            active={false}
            tone="danger"
            onClick={() => onDrawClearAll?.()}
          >
            <Eraser className={`h-4 w-4 ${drawCount > 0 ? "text-red-300" : "opacity-40"}`} />
          </ToolFlyoutButton>
        </motion.div>
      ) : null}
      {toolFlyout === "poi" && onPoiToolChange ? (
        <motion.div
          id="th-tool-flyout"
          key="poi-flyout"
          initial={FLYOUT_SLIDE.initial}
          animate={FLYOUT_SLIDE.animate}
          exit={FLYOUT_SLIDE.exit}
          transition={FLYOUT_SLIDE.transition}
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          className="pointer-events-auto fixed z-[200] flex max-w-[min(92vw,28rem)] flex-wrap items-center gap-1.5 rounded-xl border border-accent-gold/40 bg-background-card/98 p-1.5 shadow-2xl backdrop-blur-md"
          role="toolbar"
          aria-label="Points of Interest"
        >
          <span className="px-1.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold/90">
            POI
          </span>
          <ToolFlyoutButton
            label="POI: Auswählen / Sichtbarkeit"
            active={poiTool === "select"}
            onClick={() => onPoiToolChange(poiTool === "select" ? null : "select")}
          >
            <MousePointer2 className="h-4 w-4" />
          </ToolFlyoutButton>
          {WORLD_MAP_ICON_KEYS.map((key) => (
            <ToolFlyoutButton
              key={key}
              label={`${WORLD_MAP_ICON_LABELS[key]} platzieren`}
              active={poiTool === key}
              onClick={() => onPoiToolChange(poiTool === key ? null : key)}
            >
              <WorldMapIcon icon={key} className="h-4 w-4" />
            </ToolFlyoutButton>
          ))}
          <ToolFlyoutButton
            label="POI löschen"
            active={false}
            tone="danger"
            onClick={() => onPoiDelete?.()}
          >
            <Trash2
              className={`h-4 w-4 ${selectedPoiId ? "text-red-300" : "opacity-40"}`}
            />
          </ToolFlyoutButton>
          <ToolFlyoutButton
            label="Alle POIs löschen"
            active={false}
            tone="danger"
            onClick={() => onPoiClearAll?.()}
          >
            <Eraser className={`h-4 w-4 ${poiCount > 0 ? "text-red-300" : "opacity-40"}`} />
          </ToolFlyoutButton>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
