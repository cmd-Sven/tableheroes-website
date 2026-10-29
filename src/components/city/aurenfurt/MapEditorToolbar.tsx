"use client";

import { Building2, Castle, Hexagon, MapPin, Route, X, type LucideIcon } from "lucide-react";
import type { AurenfurtMapEditorTool } from "./aurenfurt-map-editor-tool";

const TOOLS: {
  id: AurenfurtMapEditorTool;
  label: string;
  Icon: LucideIcon;
  color: string;
}[] = [
  { id: "districts", label: "Viertel", Icon: Hexagon, color: "#e0a15a" },
  { id: "streets", label: "Straßen", Icon: Route, color: "#7ec8e3" },
  { id: "buildings", label: "Gebäude", Icon: Building2, color: "#379806" },
  { id: "pois", label: "Orte", Icon: MapPin, color: "#cab926" },
  { id: "walls", label: "Mauern", Icon: Castle, color: "#d9d3c7" },
];

type Props = {
  activeTool: AurenfurtMapEditorTool | null;
  onToggle: (tool: AurenfurtMapEditorTool) => void;
  onClose: () => void;
};

export function MapEditorToolbar({ activeTool, onToggle, onClose }: Props) {
  return (
    <div
      className="pointer-events-auto fixed right-3 top-1/2 z-[400] flex -translate-y-1/2 flex-col gap-1 rounded-md border border-hero-border/70 bg-background-card/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-md"
      role="toolbar"
      aria-label="Karten-Editor"
    >
      <p className="px-1 pb-0.5 text-center font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold">
        Admin
      </p>
      {TOOLS.map(({ id, label, Icon, color }) => {
        const active = activeTool === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={active}
            aria-expanded={active}
            onClick={() => onToggle(id)}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent-gold ${
              active
                ? "border-accent-gold bg-accent-gold/20"
                : "border-hero-dark/70 bg-background-dark/70 hover:border-hero-border hover:bg-hero-dark/40"
            }`}
          >
            <Icon className="h-5 w-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ color }} aria-hidden />
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Admin beenden"
        title="Admin beenden"
        onClick={onClose}
        className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded border border-hero-dark/70 bg-background-dark/70 text-gray-300 transition-colors hover:border-accent-blood hover:bg-accent-blood/20 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent-gold"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
