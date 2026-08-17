"use client";

import { Circle, MousePointer2, Square, Trash2 } from "lucide-react";
import type { BattlemapFogTool } from "@/src/lib/session/battlemap-types";

type Props = {
  tool: BattlemapFogTool;
  selectedShapeId: string | null;
  disabled?: boolean;
  onToolChange: (tool: BattlemapFogTool) => void;
  onDeleteSelected?: () => void;
};

const TOOLS: Array<{
  id: Exclude<BattlemapFogTool, null>;
  label: string;
  Icon: typeof Square;
}> = [
  { id: "select", label: "Auswählen / Verschieben", Icon: MousePointer2 },
  { id: "rect", label: "Rechteck zeichnen", Icon: Square },
  { id: "circle", label: "Kreis zeichnen", Icon: Circle },
];

export function BattlemapFogToolbar({
  tool,
  selectedShapeId,
  disabled = false,
  onToolChange,
  onDeleteSelected,
}: Props) {
  return (
    <div className="pointer-events-auto absolute left-3 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-1 rounded-xl border border-hero-border/70 bg-background-card/95 p-1.5 shadow-xl backdrop-blur-md">
      <p className="px-1 pb-1 text-center font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold">
        Nebel
      </p>
      {TOOLS.map(({ id, label, Icon }) => {
        const active = tool === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => onToolChange(active ? null : id)}
            className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors disabled:opacity-40 ${
              active
                ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                : "border-hero-border/40 text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
      <button
        type="button"
        disabled={disabled || !selectedShapeId || !onDeleteSelected}
        title="Ausgewählte Fläche löschen"
        aria-label="Ausgewählte Fog-Fläche löschen"
        onClick={() => onDeleteSelected?.()}
        className="mt-1 grid h-10 w-10 place-items-center rounded-lg border border-red-800/50 text-red-300 hover:border-red-500 hover:text-red-200 disabled:opacity-30"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <p className="max-w-[2.75rem] px-0.5 pt-1 text-center font-libre text-[8px] leading-tight text-gray-500">
        Ziehen · Grid
      </p>
    </div>
  );
}
