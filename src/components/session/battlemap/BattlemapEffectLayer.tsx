import type { CSSProperties } from "react";
import type {
  BattlemapGridConfig,
  SessionBattlemapEffectTemplate,
} from "@/src/lib/session/battlemap-types";
import { gridToPixel } from "@/src/lib/session/battlemap-grid";
import { normalizeFogCircle, normalizeFogRect } from "./BattlemapFogLayer";

/** D&D 5e Standard-Kegel: 60° Öffnungswinkel. */
export const DND_CONE_SPREAD_DEG = 60;

type Props = {
  templates: SessionBattlemapEffectTemplate[];
  config: BattlemapGridConfig;
  isGm?: boolean;
  interactive?: boolean;
  selectedTemplateId?: string | null;
  draft?: {
    shape: "rect" | "circle" | "cone";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    directionDeg?: number;
  } | null;
  interactionScale?: number;
  onSelectTemplate?: (templateId: string | null) => void;
  onTemplateDragStart?: (templateId: string, gridX: number, gridY: number) => void;
  onTemplateDragMove?: (templateId: string, gridX: number, gridY: number) => void;
  onTemplateDragEnd?: (templateId: string, gridX: number, gridY: number) => void;
  onDeleteTemplate?: (templateId: string) => void;
};

function conePolygonPoints(
  apexX: number,
  apexY: number,
  lengthPx: number,
  directionDeg: number,
  spreadDeg = DND_CONE_SPREAD_DEG,
): string {
  const halfSpread = (spreadDeg / 2) * (Math.PI / 180);
  const dirRad = directionDeg * (Math.PI / 180);
  const left = dirRad - halfSpread;
  const right = dirRad + halfSpread;
  const x1 = apexX + lengthPx * Math.cos(left);
  const y1 = apexY + lengthPx * Math.sin(left);
  const x2 = apexX + lengthPx * Math.cos(right);
  const y2 = apexY + lengthPx * Math.sin(right);
  return `${apexX},${apexY} ${x1},${y1} ${x2},${y2}`;
}

function coneBounds(
  template: Pick<
    SessionBattlemapEffectTemplate,
    "grid_x" | "grid_y" | "grid_w" | "direction_deg"
  >,
  config: BattlemapGridConfig,
): { left: number; top: number; width: number; height: number; apexX: number; apexY: number; lengthPx: number } {
  const cell = config.cellSizePx;
  const center = gridToPixel(template.grid_x, template.grid_y, config);
  const apexX = center.x + cell / 2;
  const apexY = center.y + cell / 2;
  const lengthPx = template.grid_w * cell;
  const halfSpread = (DND_CONE_SPREAD_DEG / 2) * (Math.PI / 180);
  const dirRad = template.direction_deg * (Math.PI / 180);
  const points = [
    { x: apexX, y: apexY },
    { x: apexX + lengthPx * Math.cos(dirRad - halfSpread), y: apexY + lengthPx * Math.sin(dirRad - halfSpread) },
    { x: apexX + lengthPx * Math.cos(dirRad + halfSpread), y: apexY + lengthPx * Math.sin(dirRad + halfSpread) },
  ];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    left: minX,
    top: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    apexX,
    apexY,
    lengthPx,
  };
}

function rectCircleStyle(
  template: Pick<
    SessionBattlemapEffectTemplate,
    "shape" | "grid_x" | "grid_y" | "grid_w" | "grid_h"
  >,
  config: BattlemapGridConfig,
): CSSProperties {
  const cell = config.cellSizePx;
  if (template.shape === "circle") {
    const center = gridToPixel(template.grid_x, template.grid_y, config);
    const radiusPx = template.grid_w * cell;
    const diameter = radiusPx * 2;
    return {
      left: center.x + cell / 2 - radiusPx,
      top: center.y + cell / 2 - radiusPx,
      width: diameter,
      height: diameter,
      borderRadius: "9999px",
    };
  }
  const origin = gridToPixel(template.grid_x, template.grid_y, config);
  return {
    left: origin.x,
    top: origin.y,
    width: template.grid_w * cell,
    height: template.grid_h * cell,
    borderRadius: 2,
  };
}

function EffectShape({
  template,
  config,
  selected,
  canInteract,
  cellPx,
  onSelectTemplate,
  onTemplateDragStart,
  onTemplateDragMove,
  onTemplateDragEnd,
  onDeleteTemplate,
}: {
  template: SessionBattlemapEffectTemplate;
  config: BattlemapGridConfig;
  selected: boolean;
  canInteract: boolean;
  cellPx: number;
  onSelectTemplate?: (templateId: string | null) => void;
  onTemplateDragStart?: (templateId: string, gridX: number, gridY: number) => void;
  onTemplateDragMove?: (templateId: string, gridX: number, gridY: number) => void;
  onTemplateDragEnd?: (templateId: string, gridX: number, gridY: number) => void;
  onDeleteTemplate?: (templateId: string) => void;
}) {
  const fillClass = "bg-red-500/20";
  const borderClass = "border-2 border-dashed border-red-400/75";

  const dragHandlers = canInteract
    ? {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          onSelectTemplate?.(template.id);
          onTemplateDragStart?.(template.id, template.grid_x, template.grid_y);
          const startClientX = e.clientX;
          const startClientY = e.clientY;
          const originX = template.grid_x;
          const originY = template.grid_y;
          const el = e.currentTarget;
          const onMove = (ev: PointerEvent) => {
            const dx = Math.round((ev.clientX - startClientX) / cellPx);
            const dy = Math.round((ev.clientY - startClientY) / cellPx);
            onTemplateDragMove?.(template.id, originX + dx, originY + dy);
          };
          const onUp = (ev: PointerEvent) => {
            el.releasePointerCapture(ev.pointerId);
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", onUp);
            el.removeEventListener("pointercancel", onUp);
            const dx = Math.round((ev.clientX - startClientX) / cellPx);
            const dy = Math.round((ev.clientY - startClientY) / cellPx);
            onTemplateDragEnd?.(template.id, originX + dx, originY + dy);
          };
          el.addEventListener("pointermove", onMove);
          el.addEventListener("pointerup", onUp);
          el.addEventListener("pointercancel", onUp);
        },
      }
    : {};

  if (template.shape === "cone") {
    const bounds = coneBounds(template, config);
    const points = conePolygonPoints(
      bounds.apexX - bounds.left,
      bounds.apexY - bounds.top,
      bounds.lengthPx,
      template.direction_deg,
    );
    return (
      <div
        data-effect-template={template.id}
        role={canInteract ? "button" : undefined}
        className={`absolute ${canInteract ? "pointer-events-auto cursor-grab active:cursor-grabbing" : "pointer-events-none"} ${
          selected ? "ring-2 ring-accent-gold" : ""
        }`}
        style={{
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
        }}
        title={canInteract ? "Effekt-Schablone (anklicken · Entf löscht)" : undefined}
        {...dragHandlers}
      >
        <svg className="absolute inset-0 overflow-visible" width="100%" height="100%">
          <polygon
            points={points}
            className={fillClass}
            fill="rgba(239, 68, 68, 0.22)"
            stroke="rgba(248, 113, 113, 0.85)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        </svg>
        {canInteract && selected && onDeleteTemplate ? (
          <DeleteButton onDelete={() => onDeleteTemplate(template.id)} />
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-effect-template={template.id}
      role={canInteract ? "button" : undefined}
      className={`absolute ${fillClass} ${borderClass} ${
        canInteract ? "pointer-events-auto cursor-grab active:cursor-grabbing" : "pointer-events-none"
      } ${selected ? "ring-2 ring-accent-gold" : ""}`}
      style={rectCircleStyle(template, config)}
      title={canInteract ? "Effekt-Schablone (anklicken · Entf löscht)" : undefined}
      {...dragHandlers}
    >
      {canInteract && selected && onDeleteTemplate ? (
        <DeleteButton onDelete={() => onDeleteTemplate(template.id)} />
      ) : null}
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      aria-label="Effekt-Schablone löschen"
      title="Effekt-Schablone löschen"
      className="absolute -right-2 -top-2 z-[1] grid h-6 w-6 place-items-center rounded-full border border-red-500/80 bg-red-950 text-[11px] font-bold text-red-200 hover:bg-red-800"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
    >
      ×
    </button>
  );
}

export function BattlemapEffectLayer({
  templates,
  config,
  isGm = false,
  interactive = false,
  interactionScale = 1,
  selectedTemplateId,
  draft,
  onSelectTemplate,
  onTemplateDragStart,
  onTemplateDragMove,
  onTemplateDragEnd,
  onDeleteTemplate,
}: Props) {
  const canInteract = Boolean(isGm && interactive);
  const cellPx = Math.max(1, config.cellSizePx * Math.max(0.05, interactionScale));

  return (
    <div className="pointer-events-none absolute inset-0 z-[40]">
      {templates.map((template) => (
        <EffectShape
          key={template.id}
          template={template}
          config={config}
          selected={selectedTemplateId === template.id}
          canInteract={canInteract}
          cellPx={cellPx}
          onSelectTemplate={onSelectTemplate}
          onTemplateDragStart={onTemplateDragStart}
          onTemplateDragMove={onTemplateDragMove}
          onTemplateDragEnd={onTemplateDragEnd}
          onDeleteTemplate={onDeleteTemplate}
        />
      ))}
      {draft ? (
        <EffectShape
          template={{
            id: "__draft__",
            battlemap_id: "",
            session_id: "",
            campaign_id: "",
            shape: draft.shape,
            grid_x: draft.gridX,
            grid_y: draft.gridY,
            grid_w: draft.gridW,
            grid_h: draft.gridH,
            direction_deg: draft.directionDeg ?? 0,
            z_index: 0,
          }}
          config={config}
          selected={false}
          canInteract={false}
          cellPx={cellPx}
        />
      ) : null}
    </div>
  );
}

/** Kegel: Spitze = Startzelle, Ziel bestimmt Richtung und Länge (Chebyshev). */
export function normalizeEffectCone(
  ax: number,
  ay: number,
  tx: number,
  ty: number,
): { gridX: number; gridY: number; gridW: number; gridH: number; directionDeg: number } {
  const dx = tx - ax;
  const dy = ty - ay;
  const length = Math.max(1, Math.max(Math.abs(dx), Math.abs(dy)));
  const directionDeg = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360);
  return { gridX: ax, gridY: ay, gridW: length, gridH: length, directionDeg };
}

export { normalizeFogRect, normalizeFogCircle };
