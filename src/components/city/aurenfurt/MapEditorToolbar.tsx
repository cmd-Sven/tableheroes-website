"use client";

import { Building2, Castle, Hexagon, MapPin, Route, type LucideIcon } from "lucide-react";
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
};

export function MapEditorToolbar({ activeTool, onToggle }: Props) {
  return (
    <div
      className="pointer-events-auto fixed right-0 top-1/2 z-[400] m-0 flex -translate-y-1/2 flex-col p-0"
      role="toolbar"
      aria-label="Karten-Editor"
    >
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
            className={`grid h-11 w-11 shrink-0 place-items-center bg-transparent p-0 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-accent-gold ${
              active
                ? "opacity-100 outline outline-1 outline-offset-[-1px] outline-accent-gold"
                : "opacity-80"
            }`}
          >
            <Icon className="h-5 w-5" style={{ color }} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
