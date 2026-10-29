"use client";

export type {
  CityMapLoad,
  CityMapPlacement,
  PlacementMarker,
} from "./aurenfurt-city-map-db-shared";
export { loadCityMapWalls, saveCityMapWalls } from "./aurenfurt-city-map-walls-db";
export {
  loadCityMapPlacements,
  markerBuildingsFromPlacements,
  placementsToLocationIds,
  placementsToPositions,
  placementsToRotations,
  placementsToScales,
  saveCityMapPosition,
  saveCityMapPositions,
  saveCityMapRotation,
  saveCityMapScale,
} from "./aurenfurt-city-map-placements-db";
export { loadCityMapStreets, saveCityMapStreets } from "./aurenfurt-city-map-streets-db";
export { loadCityMapPolygons, saveCityMapPolygons } from "./aurenfurt-city-map-polygons-db";
export { loadCityMapSectors, saveCityMapSectors } from "./aurenfurt-city-map-sectors-db";
export {
  loadCityMapViewerPrefs,
  saveCityMapStreetsVisible,
  saveCityMapViewerFlag,
  saveCityMapWeather,
  type ViewerPrefs,
} from "./aurenfurt-city-map-viewer-prefs-db";
