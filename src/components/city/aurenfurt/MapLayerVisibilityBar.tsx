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
      className="pointer-events-auto flex items-center"
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
            className={`grid h-11 w-11 shrink-0 place-items-center bg-transparent p-0 transition-opacity focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-accent-gold ${
              visible ? "opacity-100" : "opacity-30"
            }`}
          >
            <Icon className="h-5 w-5" style={{ color }} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
