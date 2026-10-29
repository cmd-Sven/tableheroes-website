"use client";

import { Building2, Castle, CloudSun, MapPin, Route, type LucideIcon } from "lucide-react";
import type { MapLayerId } from "./hooks/useMapLayerVisibility";

const LAYERS: {
  id: MapLayerId | "weather";
  label: string;
  Icon: LucideIcon;
  color: string;
}[] = [
  { id: "buildings", label: "Gebäude", Icon: Building2, color: "#379806" },
  { id: "pois", label: "Orte", Icon: MapPin, color: "#cab926" },
  { id: "streets", label: "Straßen", Icon: Route, color: "#7ec8e3" },
  { id: "walls", label: "Mauern", Icon: Castle, color: "#d9d3c7" },
  { id: "weather", label: "Wetter", Icon: CloudSun, color: "#5c8dff" },
];

type Props = {
  buildingsVisible: boolean;
  poisVisible: boolean;
  streetsVisible: boolean;
  wallsVisible: boolean;
  weatherVisible: boolean;
  onToggleLayer: (layer: MapLayerId) => void;
  onToggleWeather: () => void;
};

function visibilityLabel(label: string, visible: boolean) {
  return `${label}, ${visible ? "eingeblendet" : "ausgeblendet"}`;
}

export function MapLayerVisibilityBar({
  buildingsVisible,
  poisVisible,
  streetsVisible,
  wallsVisible,
  weatherVisible,
  onToggleLayer,
  onToggleWeather,
}: Props) {
  const visibleById = {
    buildings: buildingsVisible,
    pois: poisVisible,
    streets: streetsVisible,
    walls: wallsVisible,
    weather: weatherVisible,
  };

  return (
    <div
      className="pointer-events-auto mb-3 flex items-center gap-0.5 rounded-md border border-hero-border/70 bg-background-dark/95 px-1.5 py-1 shadow-[0_4px_18px_rgba(0,0,0,0.65)] backdrop-blur-sm"
      role="toolbar"
      aria-label="Kartenebenen"
    >
      {LAYERS.map(({ id, label, Icon, color }) => {
        const visible = visibleById[id];
        const name = visibilityLabel(label, visible);
        return (
          <button
            key={id}
            type="button"
            aria-label={name}
            title={name}
            aria-pressed={visible}
            onClick={() => (id === "weather" ? onToggleWeather() : onToggleLayer(id))}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded transition-[opacity,background-color] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-accent-gold ${
              visible
                ? "bg-background-card/80 opacity-100"
                : "opacity-55 hover:opacity-80"
            }`}
          >
            <Icon
              className="h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
              strokeWidth={2.25}
              style={{ color }}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
