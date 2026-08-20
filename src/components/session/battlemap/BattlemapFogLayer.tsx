import type { CSSProperties } from "react";
import type {
  BattlemapGridConfig,
  SessionBattlemapFogShape,
} from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";

type Props = {
  shapes: SessionBattlemapFogShape[];
  config: BattlemapGridConfig;
  isGm?: boolean;
  /** true = Klick/Drag auf Flächen aktiv (SL-Select-Tool) */
  interactive?: boolean;
  selectedShapeId?: string | null;
  /** Vorschau während des Zeichnens */
  draft?: {
    shape: "rect" | "circle";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
  } | null;
  /** Aktueller Zoom der TransformWrapper — für Drag-Zellenrechnung */
  interactionScale?: number;
  onSelectShape?: (shapeId: string | null) => void;
  /** Drag-Move: Startzelle beim PointerDown */
  onShapeDragStart?: (shapeId: string, gridX: number, gridY: number) => void;
  onShapeDragMove?: (shapeId: string, gridX: number, gridY: number) => void;
  onShapeDragEnd?: (shapeId: string, gridX: number, gridY: number) => void;
  onDeleteShape?: (shapeId: string) => void;
};

function shapeStyle(
  shape: Pick<SessionBattlemapFogShape, "shape" | "grid_x" | "grid_y" | "grid_w" | "grid_h">,
  config: BattlemapGridConfig,
): CSSProperties {
  const cell = config.cellSizePx;
  if (shape.shape === "circle") {
    const center = gridToPixel(shape.grid_x, shape.grid_y, config);
    const radiusPx = shape.grid_w * cell;
    const diameter = radiusPx * 2;
    return {
      left: center.x + cell / 2 - radiusPx,
      top: center.y + cell / 2 - radiusPx,
      width: diameter,
      height: diameter,
      borderRadius: "9999px",
    };
  }
  const origin = gridToPixel(shape.grid_x, shape.grid_y, config);
  return {
    left: origin.x,
    top: origin.y,
    width: shape.grid_w * cell,
    height: shape.grid_h * cell,
    borderRadius: 2,
  };
}

export function BattlemapFogLayer({
  shapes,
  config,
  isGm = false,
  interactive = false,
  interactionScale = 1,
  selectedShapeId,
  draft,
  onSelectShape,
  onShapeDragStart,
  onShapeDragMove,
  onShapeDragEnd,
  onDeleteShape,
}: Props) {
  const fillClass = isGm ? "bg-black/45" : "bg-black";
  const borderClass = isGm
    ? "border border-dashed border-accent-gold/50"
    : "border-0";
  const canInteract = Boolean(isGm && interactive);
  const cellPx = Math.max(1, config.cellSizePx * Math.max(0.05, interactionScale));

  return (
    <div className={`pointer-events-none absolute inset-0 ${isGm ? "z-[35]" : "z-[50]"}`}>
      {shapes.map((shape) => {
        const selected = selectedShapeId === shape.id;
        return (
          <div
            key={shape.id}
            data-fog-shape={shape.id}
            role={canInteract ? "button" : undefined}
            className={`absolute ${fillClass} ${borderClass} ${
              canInteract
                ? "pointer-events-auto cursor-grab active:cursor-grabbing"
                : !isGm
                  ? "pointer-events-auto"
                  : ""
            } ${selected ? "ring-2 ring-accent-gold" : ""}`}
            style={shapeStyle(shape, config)}
            title={isGm ? "Fog-Fläche (anklicken · Entf löscht)" : undefined}
            onPointerDown={
              canInteract
                ? (e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    onSelectShape?.(shape.id);
                    onShapeDragStart?.(shape.id, shape.grid_x, shape.grid_y);
                    const startClientX = e.clientX;
                    const startClientY = e.clientY;
                    const originX = shape.grid_x;
                    const originY = shape.grid_y;
                    const el = e.currentTarget;
                    const onMove = (ev: PointerEvent) => {
                      const dx = Math.round((ev.clientX - startClientX) / cellPx);
                      const dy = Math.round((ev.clientY - startClientY) / cellPx);
                      onShapeDragMove?.(shape.id, originX + dx, originY + dy);
                    };
                    const onUp = (ev: PointerEvent) => {
                      el.releasePointerCapture(ev.pointerId);
                      el.removeEventListener("pointermove", onMove);
                      el.removeEventListener("pointerup", onUp);
                      el.removeEventListener("pointercancel", onUp);
                      const dx = Math.round((ev.clientX - startClientX) / cellPx);
                      const dy = Math.round((ev.clientY - startClientY) / cellPx);
                      onShapeDragEnd?.(shape.id, originX + dx, originY + dy);
                    };
                    el.addEventListener("pointermove", onMove);
                    el.addEventListener("pointerup", onUp);
                    el.addEventListener("pointercancel", onUp);
                  }
                : undefined
            }
          >
            {canInteract && selected && onDeleteShape ? (
              <button
                type="button"
                aria-label="Fog-Fläche löschen"
                title="Fog-Fläche löschen"
                className="absolute -right-2 -top-2 z-[1] grid h-6 w-6 place-items-center rounded-full border border-red-500/80 bg-red-950 text-[11px] font-bold text-red-200 hover:bg-red-800"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteShape(shape.id);
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
      {draft ? (
        <div
          className="absolute border-2 border-dashed border-accent-gold bg-black/35"
          style={shapeStyle(
            {
              shape: draft.shape,
              grid_x: draft.gridX,
              grid_y: draft.gridY,
              grid_w: draft.gridW,
              grid_h: draft.gridH,
            },
            config,
          )}
        />
      ) : null}
    </div>
  );
}

/** Drag-Zellen → normiertes Rect (inkl. min 1×1). */
export function normalizeFogRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { gridX: number; gridY: number; gridW: number; gridH: number } {
  const minX = Math.min(x0, x1);
  const minY = Math.min(y0, y1);
  const maxX = Math.max(x0, x1);
  const maxY = Math.max(y0, y1);
  return {
    gridX: minX,
    gridY: minY,
    gridW: Math.max(1, maxX - minX + 1),
    gridH: Math.max(1, maxY - minY + 1),
  };
}

/** Startzelle = Zentrum, Distanz in Chebyshev → Radius. */
export function normalizeFogCircle(
  cx: number,
  cy: number,
  x1: number,
  y1: number,
): { gridX: number; gridY: number; gridW: number; gridH: number } {
  const radius = Math.max(Math.abs(x1 - cx), Math.abs(y1 - cy), 0);
  const r = Math.max(1, radius);
  return { gridX: cx, gridY: cy, gridW: r, gridH: r };
}
