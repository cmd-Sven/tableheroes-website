"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Eye,
  Flame,
  Mountain,
  Snowflake,
  Split,
  Skull,
} from "lucide-react";
import type {
  BattlemapGridConfig,
  BattlemapMarkerKind,
  SessionBattlemapMarker,
} from "@/src/lib/session/battlemap-types";
import { BATTLEMAP_MARKER_META } from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";

type Props = {
  markers: SessionBattlemapMarker[];
  config: BattlemapGridConfig;
  isGm?: boolean;
  interactive?: boolean;
  selectedMarkerId?: string | null;
  interactionScale?: number;
  draftCell?: { gridX: number; gridY: number; kind: BattlemapMarkerKind } | null;
  onSelectMarker?: (markerId: string | null) => void;
  onMarkerDragMove?: (markerId: string, gridX: number, gridY: number) => void;
  onMarkerDragEnd?: (markerId: string, gridX: number, gridY: number) => void;
  onDeleteMarker?: (markerId: string) => void;
};

function cellStyle(
  gridX: number,
  gridY: number,
  config: BattlemapGridConfig,
): CSSProperties {
  const origin = gridToPixel(gridX, gridY, config);
  const cell = config.cellSizePx;
  return {
    left: origin.x,
    top: origin.y,
    width: cell,
    height: cell,
  };
}

/** Weiche Aura hinter dem Badge — nur Glow, kein Symbol verdecken. */
const KIND_AURA: Record<BattlemapMarkerKind, string> = {
  fire: "bg-orange-500/35 shadow-[0_0_14px_6px_rgba(255,120,20,0.55)]",
  ice: "bg-sky-400/30 shadow-[0_0_14px_6px_rgba(120,210,255,0.55)]",
  debris: "bg-stone-400/25 shadow-[0_0_10px_4px_rgba(120,100,80,0.4)]",
  crack: "bg-violet-500/25 shadow-[0_0_12px_4px_rgba(139,92,246,0.45)]",
  danger: "bg-amber-400/30 shadow-[0_0_12px_5px_rgba(245,158,11,0.5)]",
  interest: "bg-yellow-400/25 shadow-[0_0_12px_5px_rgba(202,185,38,0.5)]",
  trap: "bg-red-500/30 shadow-[0_0_12px_5px_rgba(220,38,38,0.5)]",
};

const KIND_BADGE: Record<BattlemapMarkerKind, string> = {
  fire: "border-orange-400/90 bg-orange-950/90",
  ice: "border-sky-300/90 bg-sky-950/90",
  debris: "border-stone-300/80 bg-stone-900/90",
  crack: "border-violet-300/90 bg-violet-950/90",
  danger: "border-amber-300/90 bg-amber-950/90",
  interest: "border-yellow-300/90 bg-[#2a2410]/90",
  trap: "border-red-400/90 bg-red-950/90",
};

const KIND_ICON: Record<BattlemapMarkerKind, string> = {
  fire: "text-orange-300",
  ice: "text-sky-200",
  debris: "text-stone-100",
  crack: "text-violet-200",
  danger: "text-amber-200",
  interest: "text-yellow-200",
  trap: "text-red-200",
};

function MarkerGlyph({ kind }: { kind: BattlemapMarkerKind }) {
  const cls = `h-[72%] w-[72%] ${KIND_ICON[kind]}`;
  const common = { className: cls, strokeWidth: 2.6 as const, "aria-hidden": true as const };
  switch (kind) {
    case "fire":
      return <Flame {...common} fill="currentColor" fillOpacity={0.35} />;
    case "ice":
      return <Snowflake {...common} fill="currentColor" fillOpacity={0.25} />;
    case "debris":
      return <Mountain {...common} fill="currentColor" fillOpacity={0.3} />;
    case "crack":
      return <Split {...common} fill="currentColor" fillOpacity={0.2} />;
    case "danger":
      return <AlertTriangle {...common} fill="currentColor" fillOpacity={0.35} />;
    case "interest":
      return <Eye {...common} fill="currentColor" fillOpacity={0.3} />;
    case "trap":
      return <Skull {...common} fill="currentColor" fillOpacity={0.35} />;
  }
}

function MarkerVisual({
  kind,
  animate = true,
}: {
  kind: BattlemapMarkerKind;
  animate?: boolean;
}) {
  return (
    <div className="relative grid h-full w-full place-items-center p-[6%]">
      {/* Aura: nur Transform/Opacity — Symbol bleibt klar */}
      <motion.div
        className={`absolute inset-[4%] rounded-full ${KIND_AURA[kind]}`}
        animate={
          animate
            ? {
                opacity: [0.55, 0.95, 0.65, 1],
                scale: [0.92, 1.06, 0.96, 1.04],
              }
            : undefined
        }
        transition={
          animate
            ? {
                duration: kind === "fire" ? 1.2 : 2,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
        aria-hidden
      />
      {/* Dunkles Badge + festes Symbol (kein Opacity-Flicker) */}
      <div
        className={`relative z-[1] grid h-[78%] w-[78%] place-items-center rounded-full border-2 shadow-md ${KIND_BADGE[kind]}`}
      >
        <motion.div
          className="grid h-full w-full place-items-center"
          animate={
            animate && (kind === "fire" || kind === "ice")
              ? { scale: [1, 1.06, 0.98, 1.04, 1] }
              : undefined
          }
          transition={
            animate && (kind === "fire" || kind === "ice")
              ? {
                  duration: kind === "fire" ? 0.85 : 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        >
          <MarkerGlyph kind={kind} />
        </motion.div>
      </div>
    </div>
  );
}

export function BattlemapMarkerLayer({
  markers,
  config,
  isGm = false,
  interactive = false,
  interactionScale = 1,
  selectedMarkerId,
  draftCell,
  onSelectMarker,
  onMarkerDragMove,
  onMarkerDragEnd,
  onDeleteMarker,
}: Props) {
  const canInteract = Boolean(isGm && interactive);
  const cellPx = Math.max(1, config.cellSizePx * Math.max(0.05, interactionScale));

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${canInteract ? "z-[47]" : "z-[38]"}`}
    >
      {markers.map((marker) => {
        const selected = selectedMarkerId === marker.id;
        const meta = BATTLEMAP_MARKER_META[marker.kind];
        return (
          <div
            key={marker.id}
            data-battlemap-marker={marker.id}
            role={canInteract ? "button" : undefined}
            className={`absolute ${
              canInteract
                ? "pointer-events-auto cursor-grab active:cursor-grabbing"
                : ""
            } ${
              selected
                ? "ring-[3px] ring-accent-gold border-2 border-accent-gold shadow-[0_0_0_1px_#cab926]"
                : ""
            }`}
            style={cellStyle(marker.grid_x, marker.grid_y, config)}
            title={isGm ? `${meta.label} — ${meta.hint}` : meta.label}
            onPointerDown={
              canInteract
                ? (e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    onSelectMarker?.(marker.id);
                    const startClientX = e.clientX;
                    const startClientY = e.clientY;
                    const originX = marker.grid_x;
                    const originY = marker.grid_y;
                    const el = e.currentTarget;
                    const onMove = (ev: PointerEvent) => {
                      const dx = Math.round((ev.clientX - startClientX) / cellPx);
                      const dy = Math.round((ev.clientY - startClientY) / cellPx);
                      onMarkerDragMove?.(marker.id, originX + dx, originY + dy);
                    };
                    const onUp = (ev: PointerEvent) => {
                      el.releasePointerCapture(ev.pointerId);
                      el.removeEventListener("pointermove", onMove);
                      el.removeEventListener("pointerup", onUp);
                      el.removeEventListener("pointercancel", onUp);
                      const dx = Math.round((ev.clientX - startClientX) / cellPx);
                      const dy = Math.round((ev.clientY - startClientY) / cellPx);
                      onMarkerDragEnd?.(marker.id, originX + dx, originY + dy);
                    };
                    el.addEventListener("pointermove", onMove);
                    el.addEventListener("pointerup", onUp);
                    el.addEventListener("pointercancel", onUp);
                  }
                : undefined
            }
          >
            <MarkerVisual kind={marker.kind} />
            {canInteract && selected && onDeleteMarker ? (
              <button
                type="button"
                aria-label="Marker löschen"
                title="Marker löschen"
                className="absolute -right-1.5 -top-1.5 z-[2] grid h-5 w-5 place-items-center rounded-full border border-red-500/80 bg-red-950 text-[10px] font-bold text-red-200 hover:bg-red-800"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMarker(marker.id);
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
      {draftCell ? (
        <div
          className="absolute opacity-80 ring-2 ring-dashed ring-accent-gold/70"
          style={cellStyle(draftCell.gridX, draftCell.gridY, config)}
        >
          <MarkerVisual kind={draftCell.kind} animate={false} />
        </div>
      ) : null}
    </div>
  );
}

export { MarkerVisual, MarkerGlyph };
