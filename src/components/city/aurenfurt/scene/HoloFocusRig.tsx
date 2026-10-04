"use client";

import type { BuildingPositions } from "../aurenfurt-building-positions";
import type { CityBuilding, HoloSelection } from "../aurenfurt-districts";
import type { DistrictPolygons } from "../aurenfurt-district-polygons";
import type { AurenfurtMapPoi } from "../aurenfurt-map-pois";
import { useHoloFocus } from "../hooks/useHoloFocus";
import { StreetDrawCameraRig } from "./StreetDrawCameraRig";

type Props = {
  selection: HoloSelection | null;
  polygons?: DistrictPolygons | null;
  buildingPositions?: BuildingPositions | null;
  buildings?: CityBuilding[];
  pois?: AurenfurtMapPoi[];
  /** Straßenzeichnen / Gebäude/POI platzieren: Fokus-Flug aus, Draufsicht-Lock an. */
  drawingStreet?: boolean;
};

export function HoloFocusRig({
  selection,
  polygons,
  buildingPositions,
  buildings,
  pois,
  drawingStreet = false,
}: Props) {
  useHoloFocus(drawingStreet ? null : selection, polygons, buildingPositions, {
    paused: drawingStreet,
    buildings,
    pois,
  });
  return <StreetDrawCameraRig active={drawingStreet} />;
}
