"use client";

import { useMemo } from "react";
import type { BuildingPositions } from "../aurenfurt-building-positions";
import type { CityBuilding, HoloSelection } from "../aurenfurt-districts";
import type { DistrictPolygons } from "../aurenfurt-district-polygons";
import type { AurenfurtMapPoi } from "../aurenfurt-map-pois";
import { useHoloFocus } from "../hooks/useHoloFocus";
import {
  cityWideTopDownPose,
  districtTopDownPose,
  StreetDrawCameraRig,
  type TopDownPose,
} from "./StreetDrawCameraRig";

type Props = {
  selection: HoloSelection | null;
  polygons?: DistrictPolygons | null;
  buildingPositions?: BuildingPositions | null;
  buildings?: CityBuilding[];
  pois?: AurenfurtMapPoi[];
  /** Straßen-/Mauerzeichnen: Fokus-Flug aus, Draufsicht-Lock an. */
  drawingStreet?: boolean;
  /**
   * Stadtereignis-Ort: Draufsicht. Mit Viertel-Selection Zoom auf das Polygon,
   * sonst ganze Stadt zum Anklicken des Viertels.
   */
  eventPlaceTopDown?: boolean;
};

export function HoloFocusRig({
  selection,
  polygons,
  buildingPositions,
  buildings,
  pois,
  drawingStreet = false,
  eventPlaceTopDown = false,
}: Props) {
  const lockTopDown = drawingStreet || eventPlaceTopDown;
  const topDownPose = useMemo((): TopDownPose | null => {
    if (!lockTopDown) return null;
    if (eventPlaceTopDown && selection?.type === "district") {
      return districtTopDownPose(polygons?.[selection.id]?.points);
    }
    if (drawingStreet || eventPlaceTopDown) return cityWideTopDownPose();
    return null;
  }, [drawingStreet, eventPlaceTopDown, lockTopDown, polygons, selection]);

  useHoloFocus(lockTopDown ? null : selection, polygons, buildingPositions, {
    paused: lockTopDown,
    buildings,
    pois,
  });
  return <StreetDrawCameraRig active={lockTopDown} pose={topDownPose} />;
}
