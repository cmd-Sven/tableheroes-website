"use client";

import { Building2, Castle, Hexagon, MapPin, Route, type LucideIcon } from "lucide-react";
import type { AurenfurtMapEditorTool } from "./aurenfurt-map-editor-tool";
import { CityHudFrame } from "./CityHudFrame";

const TOOLS: {
  id: AurenfurtMapEditorTool;
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: "districts", label: "Viertel", Icon: Hexagon },
  { id: "streets", label: "Straßen", Icon: Route },
  { id: "buildings", label: "Gebäude", Icon: Building2 },
  { id: "pois", label: "Orte", Icon: MapPin },
  { id: "walls", label: "Mauern", Icon: Castle },
];

type Props = {
  activeTool: AurenfurtMapEditorTool | null;
  onToggle: (tool: AurenfurtMapEditorTool) => void;
};

export function MapEditorToolbar({ activeTool, onToggle }: Props) {
  return (
    <div className="pointer-events-auto fixed right-0 top-1/2 z-[400] -translate-y-1/2">
      <CityHudFrame density="card" tone="dark" className="shadow-2xl">
        <div className="flex flex-col gap-1 px-3 py-10" role="toolbar" aria-label="Karten-Editor">
          {TOOLS.map(({ id, label, Icon }) => {
            const active = activeTool === id;
            return (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={active}
                aria-expanded={active}
                onClick={() => onToggle(id)}
                className={`flex min-h-[5.5rem] min-w-[2.75rem] items-center justify-center gap-2 bg-hero-dark px-2.5 py-3 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold transition-colors hover:bg-background-card [writing-mode:vertical-rl] rotate-180 ${
                  active ? "bg-background-card text-hero-vibrant" : ""
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </CityHudFrame>
    </div>
  );
}
