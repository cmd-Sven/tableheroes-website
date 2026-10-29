"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { HoloCityRail } from "./HoloCityRail";
import { HoloOverlay } from "./HoloOverlay";
import type { CitySurface } from "./CityViewSwitch";
import type { ChartMetric, LineKey } from "./CityDashboard";
import type { AnalyticsRange } from "./aurenfurt-analytics";
import { MapEditorPortals } from "./MapEditorPortals";
import { CityMapHud } from "./CityMapHud";
import { CityEventWizard } from "./CityEventWizard";
import {
  CITY_BUILDINGS,
  findBuilding,
  findDistrict,
  type CityDistrictId,
  type HoloSelection,
} from "./aurenfurt-districts";
import { findPlaceLore } from "./aurenfurt-lore";
import { useAurenfurtDay } from "./hooks/useAurenfurtDay";
import { useAurenfurtStreets } from "./hooks/useAurenfurtStreets";
import { useAurenfurtWalls } from "./hooks/useAurenfurtWalls";
import { useAurenfurtWeather } from "./hooks/useAurenfurtWeather";
import { useWeatherFxControl } from "./hooks/useWeatherFxControl";
import { resolveWeatherFx } from "./aurenfurt-weather-fx";
import { useDistrictFactions } from "./hooks/useDistrictFactions";
import { useDistrictMetrics } from "./hooks/useDistrictMetrics";
import { bindCityPressure, citySimVersion, setCitySimLive, simBuildingFromCity, subscribeCitySim } from "./aurenfurt-city-sim";
import { resolveBuildingUv } from "./aurenfurt-building-positions";
import { useDistrictNpcs } from "./hooks/useDistrictNpcs";
import { useBuildingPositions } from "./hooks/useBuildingPositions";
import { useLandmarkScales } from "./hooks/useLandmarkScales";
import { useLandmarkRotations } from "./hooks/useLandmarkRotations";
import { useDistrictPolygons } from "./hooks/useDistrictPolygons";
import { useDistrictSectors } from "./hooks/useDistrictSectors";
import { useHoloCityView } from "./hooks/useHoloCityView";
import { useKeyLocations } from "./hooks/useKeyLocations";
import { useMapLayerVisibility } from "./hooks/useMapLayerVisibility";
import { useAurenfurtMapBootstrap } from "./hooks/useAurenfurtMapBootstrap";
import { useMapSelectionReach } from "./hooks/useMapSelectionReach";
import { useMapEditorSession } from "./hooks/useMapEditorSession";
import { useMapEditorMutations } from "./hooks/useMapEditorMutations";
import type { DistrictSector } from "./aurenfurt-sectors";
import { citySectorCrime } from "./aurenfurt-crime-heatmap";
import { parseDay } from "./aurenfurt-time";
import { loadAurenfurtCityPressure } from "./load-aurenfurt-npc-records";
import { mergeCityBuildings } from "./aurenfurt-map-buildings";
import { AURENFURT_WORLD_ID } from "./aurenfurt-district-lore-ids";
import { findPoi } from "./aurenfurt-map-pois";
import { HoloCityLoadingOverlay } from "./HoloCityLoadingOverlay";

const HoloCityCanvas = dynamic(() => import("./scene/HoloCityCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#02080c]" aria-hidden />,
});

const CityDashboard = dynamic(() => import("./CityDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
      Stadtbericht wird gerechnet…
    </div>
  ),
});

type Props = {
  onLeave: () => void;
  worldId?: string | null;
  campaignId?: string | null;
  isGm?: boolean;
};

export function HoloCityMap({ onLeave, worldId = null, campaignId = null, isGm = false }: Props) {
  const resolvedWorldId = worldId || AURENFURT_WORLD_ID;
  const bootstrap = useAurenfurtMapBootstrap();
  const { editorBuildings, categoryOverrides, pois, places, npcRecordIds, factionRecordIds } = bootstrap;
  const weatherFx = useWeatherFxControl(resolvedWorldId, isGm);
  const polygons = useDistrictPolygons(resolvedWorldId, isGm);
  const sectorsApi = useDistrictSectors(resolvedWorldId, isGm);
  const buildingPositions = useBuildingPositions(resolvedWorldId, isGm);
  const landmarkScales = useLandmarkScales(resolvedWorldId, isGm);
  const landmarkRotations = useLandmarkRotations(resolvedWorldId, isGm);
  const streetsApi = useAurenfurtStreets(polygons.polygons, resolvedWorldId, isGm);
  const wallsApi = useAurenfurtWalls(resolvedWorldId, isGm);
  const buildings = useMemo(() => {
    const extras = buildingPositions.markerBuildings.filter(
      (marker) => !editorBuildings.some((building) => building.id === marker.id),
    );
    return mergeCityBuildings([...editorBuildings, ...extras], categoryOverrides);
  }, [buildingPositions.markerBuildings, categoryOverrides, editorBuildings]);

  const view = useHoloCityView(buildings, pois);
  const calendar = useAurenfurtDay();
  const metrics = useDistrictMetrics(view.subject?.districtId ?? null, calendar.day);
  const districtFactions = useDistrictFactions(view.subject?.districtId ?? null, calendar.day);
  const keyLocations = useKeyLocations(
    view.subject?.districtId ?? null,
    view.subject?.type === "building" ? view.subject.id : null,
    buildings,
  );
  const districtNpcs = useDistrictNpcs(
    view.subject?.districtId ?? null,
    view.subject?.type === "building" ? view.subject.id : null,
    npcRecordIds,
    calendar.day,
  );
  const climate = useAurenfurtWeather(calendar.day);
  const shownWeather = resolveWeatherFx(
    weatherFx.preference,
    climate.current.kind,
    climate.current.intensity,
  );

  useEffect(() => {
    setCitySimLive({
      buildings: buildings.map((building) => {
        const uv = resolveBuildingUv(building, buildingPositions.positions);
        return { ...simBuildingFromCity(building), u: uv.u, v: uv.v };
      }),
      streets: streetsApi.streets.map((street) => ({
        districtIds: street.districtIds,
        category: street.category,
        crime: street.crime,
        security: street.security,
        condition: street.condition,
        traffic: street.traffic,
        segments: Math.max(1, street.points.length - 1),
      })),
      pois: pois.map((poi) => ({
        districtId: poi.districtId,
        influences: poi.influences,
      })),
      liveWeatherKind: climate.current.source === "live" ? climate.current.kind : null,
      sectors: sectorsApi.sectorsByDistrict,
      polygons: polygons.polygons,
    });
  }, [
    buildings,
    streetsApi.streets,
    pois,
    climate.current,
    buildingPositions.positions,
    sectorsApi.sectorsByDistrict,
    polygons.polygons,
  ]);
  const {
    layers,
    toggleLayer,
    saveError: layerVisibilityError,
  } = useMapLayerVisibility(resolvedWorldId, isGm);
  const [citySurface, setCitySurface] = useState<CitySurface>("map");
  const [dashboardScope, setDashboardScope] = useState<CityDistrictId | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("month");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("economy");
  const [lines, setLines] = useState<LineKey[]>(["economy", "crime", "guard", "tension"]);
  const [eventWizardOpen, setEventWizardOpen] = useState(false);
  const [eventPlaceStep, setEventPlaceStep] = useState(false);
  const [eventDistrictId, setEventDistrictId] = useState<CityDistrictId | null>(null);
  const [eventSectorIds, setEventSectorIds] = useState<string[]>([]);
  const [eventWholeCity, setEventWholeCity] = useState(false);
  const [crimeHeatmap, setCrimeHeatmap] = useState(false);
  const simVersion = useSyncExternalStore(subscribeCitySim, citySimVersion, citySimVersion);
  const crimeCells = useMemo(
    () => (crimeHeatmap ? citySectorCrime(parseDay(calendar.day)) : []),
    [calendar.day, crimeHeatmap, simVersion],
  );

  const session = useMapEditorSession({
    isGm,
    buildings,
    focusSelection: view.focus,
    addStreet: streetsApi.addStreet,
  });
  const mutations = useMapEditorMutations({
    worldId: resolvedWorldId,
    session,
    polygons: polygons.polygons,
    buildings,
    categoryOverrides,
    pois,
    buildingPositions,
    setEditorBuildings: bootstrap.setEditorBuildings,
    setCategoryOverrides: bootstrap.setCategoryOverrides,
    setPois: bootstrap.setPois,
    setPlaces: bootstrap.setPlaces,
  });
  const reach = useMapSelectionReach({
    worldId: resolvedWorldId,
    subject: view.subject,
    buildings,
    pois,
    buildingPositions: buildingPositions.positions,
    buildingLocationIds: buildingPositions.locationIds,
    sectorsByDistrict: sectorsApi.sectorsByDistrict,
    polygons: polygons.polygons,
  });
  const { poiReachVisible, setPoiReachVisible, selectedPoi, selectedBuilding } = reach;

  const layoutError =
    wallsApi.saveError ||
    polygons.saveError ||
    sectorsApi.saveError ||
    buildingPositions.saveError ||
    landmarkScales.saveError ||
    landmarkRotations.saveError ||
    streetsApi.saveError ||
    weatherFx.saveError ||
    layerVisibilityError ||
    null;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const hint =
    view.hoveredSubject && view.hoveredSubject.id !== view.subject?.id
      ? view.hoveredSubject.name
      : null;

  const eventPickSectors =
    eventWizardOpen && eventPlaceStep && eventDistrictId
      ? (sectorsApi.sectorsByDistrict[eventDistrictId] ?? [])
      : [];

  const closeEventWizard = () => {
    setEventWizardOpen(false);
    setEventPlaceStep(false);
    setEventDistrictId(null);
    setEventSectorIds([]);
    setEventWholeCity(false);
  };

  const onCanvasSelect = (selection: HoloSelection | null) => {
    if (eventWizardOpen && eventPlaceStep) {
      if (!selection) {
        setEventWholeCity(true);
        setEventDistrictId(null);
        setEventSectorIds([]);
        return;
      }
      const districtId =
        selection.type === "district"
          ? selection.id
          : selection.type === "building"
            ? (buildings.find((entry) => entry.id === selection.id)?.districtId ??
              findBuilding(selection.id, buildings)?.districtId ??
              null)
            : selection.type === "poi"
              ? (findPoi(pois, selection.id)?.districtId ?? null)
              : null;
      if (districtId) {
        setEventWholeCity(false);
        setEventDistrictId(districtId);
        setEventSectorIds([]);
      }
      return;
    }
    view.focus(selection);
  };

  const onPickEventSector = (sector: DistrictSector) => {
    setEventWholeCity(false);
    setEventDistrictId(sector.districtId);
    setEventSectorIds((current) =>
      current.includes(sector.id) ? current.filter((id) => id !== sector.id) : [...current, sector.id],
    );
  };

  const reloadCityPressure = () => {
    void loadAurenfurtCityPressure()
      .then((pressure) => bindCityPressure(pressure.actors, pressure.events))
      .catch(() => bindCityPressure([], []));
  };

  const [sceneBooted, setSceneBooted] = useState(false);
  const mapBuildings = buildings.length > 0 ? buildings : CITY_BUILDINGS;
  /** Ein HeavyGlb-Slot pro Landmark-Typ (Instancing oder Einzelmesh). */
  const expectedHeavyCount = useMemo(() => {
    const models = new Set<string>();
    for (const building of mapBuildings) {
      if (building.landmark) models.add(building.landmark);
    }
    return models.size;
  }, [mapBuildings]);

  return (
    <div className="fixed inset-0 z-[80] flex bg-[#02080c]">
      {citySurface === "map" ? (
        <HoloCityRail
          selection={view.selection}
          subject={view.subject}
          sim={metrics.sim}
          scopeLabel={view.subject ? (findDistrict(view.subject.districtId)?.name ?? "Viertel") : "Stadt gesamt"}
          onSelect={(selection) => {
            view.focus(selection);
          }}
          onLeave={onLeave}
        />
      ) : null}
      <div className="relative min-w-0 flex-1">
        <div className={citySurface === "dashboard" ? "invisible absolute inset-0" : eventPlaceStep ? "h-full cursor-crosshair" : "h-full"}>
        <HoloCityLoadingOverlay
          enabled={citySurface === "map"}
          sceneBooted={sceneBooted}
          expectedHeavyCount={expectedHeavyCount}
        />
        <HoloCityCanvas
          onSceneBoot={() => setSceneBooted(true)}
          selection={
            eventWizardOpen && eventPlaceStep && eventDistrictId
              ? { type: "district", id: eventDistrictId }
              : view.selection
          }
          hovered={view.hovered}
          editorTool={isGm && session.mapAdminMode ? session.activeTool : null}
          editingDistrictId={
            isGm && (session.districtsTool || session.buildingsTool) ? session.editingDistrictId : null
          }
          editingStreetId={isGm && session.streetsTool ? session.editingStreetId : null}
          drawingStreet={isGm && session.streetDrawActive}
          drawingWall={isGm && session.wallDrawActive}
          previewingWall={isGm && session.wallsTool && (session.drawingWall || session.wallDraftReady)}
          draftWallPoints={session.draftWallPoints}
          draftWallCurve={session.wallDraft.curve}
          previewWall={isGm && session.wallsTool ? session.previewWall : null}
          walls={wallsApi.walls}
          editingWallId={isGm && session.wallsTool ? session.editingWallId : null}
          placingBuilding={isGm && session.placingBuildingActive}
          placingPoi={isGm && session.placingPoiActive}
          draftStreetPoints={session.draftStreetPoints}
          streets={streetsApi.streets}
          dayWeather={climate.current}
          weatherFx={shownWeather.effect}
          weatherFxIntensity={shownWeather.intensity}
          viewedDay={calendar.day}
          streetsLayerVisible={crimeHeatmap ? false : layers.streets}
          buildingsVisible={crimeHeatmap ? false : layers.buildings}
          poisVisible={layers.pois}
          wallsVisible={layers.walls}
          polygons={polygons.polygons}
          editingSectors={
            isGm && session.districtsTool && session.editingDistrictId
              ? (sectorsApi.sectorsByDistrict[session.editingDistrictId]?.length ?? 0) > 0
                ? (sectorsApi.sectorsByDistrict[session.editingDistrictId] ?? [])
                : session.sectorPreviewSectors
              : []
          }
          editingSectorsPreview={Boolean(
            isGm &&
              session.districtsTool &&
              session.editingDistrictId &&
              (sectorsApi.sectorsByDistrict[session.editingDistrictId]?.length ?? 0) === 0 &&
              session.sectorPreviewSectors.length > 0,
          )}
          eventPickSectors={eventPickSectors}
          eventSectorIds={eventSectorIds}
          onPickEventSector={onPickEventSector}
          crimeHeatmapVisible={crimeHeatmap}
          crimeCells={crimeCells}
          poiReachCells={reach.poiReachCells}
          poiReachVisible={poiReachVisible}
          holdStill={eventPlaceStep}
          highlightDistricts={eventPlaceStep}
          buildings={mapBuildings}
          pois={pois}
          worldId={resolvedWorldId}
          campaignId={campaignId}
          buildingPositions={buildingPositions.positions}
          landmarkScales={landmarkScales.scales}
          landmarkRotations={landmarkRotations.rotations}
          onSelect={onCanvasSelect}
          onHover={view.hover}
          onMoveVertex={polygons.moveVertex}
          onMoveBuilding={buildingPositions.moveBuilding}
          onMoveStreetPoint={streetsApi.moveStreetPoint}
          onCommitPolygons={polygons.commit}
          onCommitBuildings={buildingPositions.commit}
          onCommitStreets={streetsApi.commit}
          onAddDrawPoint={session.addDrawPoint}
          onFinishDrawStreet={session.finishDrawStreet}
          onAddWallPoint={(point) => session.setDraftWallPoints((current) => [...current, point])}
          onFinishDrawWall={() => {
            if (session.draftWallPoints.length < 2) return;
            session.setDrawingWall(false);
            session.setWallDraftReady(true);
          }}
          onMoveWallPoint={wallsApi.movePoint}
          onSelectWall={session.setEditingWallId}
          onPlaceBuildingPoint={mutations.placeBuildingPoint}
          onPlacePoiPoint={mutations.placePoiPoint}
          onMovePoi={isGm && session.poisTool ? mutations.movePoiPoint : undefined}
          onCommitPoi={isGm && session.poisTool ? mutations.commitPoiPoint : undefined}
          onSelectStreet={session.selectStreet}
        />
        <CityMapHud
          citySurface={citySurface}
          onCitySurface={setCitySurface}
          day={calendar.day}
          minDay={calendar.minDay}
          maxDay={calendar.maxDay}
          isToday={calendar.isToday}
          liveWeather={climate.live}
          onDayChange={calendar.setDay}
          onStepDay={calendar.stepDay}
          onStepYear={calendar.stepYear}
          onGoToday={calendar.goToday}
          isGm={isGm}
          mapAdminMode={session.mapAdminMode}
          onToggleMapAdminMode={session.toggleMapAdminMode}
          eventWizardOpen={eventWizardOpen}
          onToggleEventWizard={() => (eventWizardOpen ? closeEventWizard() : setEventWizardOpen(true))}
          statusLine={
            eventWizardOpen && eventPlaceStep
              ? "Klicke ein Viertel. Danach erscheinen die Sektoren. Ein Klick neben die Stadt trifft die ganze Stadt."
              : session.wallDrawActive
                ? "Klicke Punkte für die Mauer. Doppelklick schließt die Linie."
                : session.placingBuildingActive
                  ? "Klicke im Viertel, um das Gebäude zu setzen."
                  : session.placingPoiActive
                    ? session.repositioningPoi
                      ? "Klicke auf die Karte, um den Ort neu zu setzen."
                      : "Klicke auf die Karte, um den besonderen Ort zu setzen."
                    : (hint ?? view.subject?.name ?? "Viertel links wählen.")
          }
          layoutError={layoutError}
          buildingsVisible={layers.buildings}
          poisVisible={layers.pois}
          streetsVisible={layers.streets}
          wallsVisible={layers.walls}
          weatherVisible={weatherFx.preference.enabled}
          onToggleLayer={toggleLayer}
          onToggleWeather={() => weatherFx.setEnabled(!weatherFx.preference.enabled)}
          weatherEnabled={weatherFx.preference.enabled}
          weatherMode={weatherFx.preference.mode}
          autoEffect={shownWeather.autoEffect}
          onWeatherMode={weatherFx.setMode}
          crimeHeatmap={crimeHeatmap}
          onToggleCrimeHeatmap={() => setCrimeHeatmap((current) => !current)}
        />
        {isGm && eventWizardOpen ? (
          <CityEventWizard
            day={calendar.day}
            worldId={resolvedWorldId}
            districtId={eventDistrictId}
            wholeCity={eventWholeCity}
            sectorIds={eventSectorIds}
            sectors={eventPickSectors}
            onPlaceStep={setEventPlaceStep}
            onClose={closeEventWizard}
            onSaved={reloadCityPressure}
          />
        ) : null}
        </div>
        {citySurface === "dashboard" ? (
          <CityDashboard
            day={calendar.day}
            minDay={calendar.minDay}
            maxDay={calendar.maxDay}
            isToday={calendar.isToday}
            liveWeather={climate.current}
            scopeId={dashboardScope}
            onScopeId={setDashboardScope}
            onDayChange={calendar.setDay}
            onStepDay={calendar.stepDay}
            onStepYear={calendar.stepYear}
            onGoToday={calendar.goToday}
            onShowMap={() => setCitySurface("map")}
            onLeave={onLeave}
            range={range}
            setRange={setRange}
            chartMetric={chartMetric}
            setChartMetric={setChartMetric}
            lines={lines}
            setLines={setLines}
          />
        ) : null}
        {citySurface === "map" && !session.mapAdminMode && view.subject?.type !== "district" ? (
          <div className="pointer-events-none absolute inset-0 z-[90]">
            <HoloOverlay
              subject={view.subject}
              lore={view.subject ? findPlaceLore(places, view.subject.name) : null}
              sim={metrics.sim}
              series={metrics.series}
              weather={climate.current}
              weatherSeries={climate.series}
              influences={metrics.influences}
              factions={districtFactions.factions}
              factionRecordIds={factionRecordIds}
              locations={keyLocations.locations}
              selectedLocation={keyLocations.selected}
              leaders={districtNpcs.leaders}
              operator={districtNpcs.operator}
              npcLinkContext={{ worldId: resolvedWorldId, campaignId }}
              viewDay={calendar.day}
              isGm={isGm}
              selectedPoi={selectedPoi}
              districtPois={reach.districtPoiInfluences}
              influenceReachOn={poiReachVisible}
              onToggleInfluenceReach={() => setPoiReachVisible((current) => !current)}
              leadNpc={reach.poiLeadNpc}
              selectedBuilding={selectedBuilding}
              buildingLocationId={reach.selectedBuildingLocationId}
              buildingReachHint={reach.buildingReachHint}
              landmark={selectedBuilding?.landmark ?? null}
              onClose={() => view.focus(null)}
              onSelect={view.focus}
            />
          </div>
        ) : null}
      </div>

      <MapEditorPortals
        isGm={isGm}
        session={session}
        mutations={mutations}
        buildings={buildings}
        pois={pois}
        polygons={polygons}
        sectorsApi={sectorsApi}
        buildingPositions={buildingPositions}
        landmarkScales={landmarkScales}
        landmarkRotations={landmarkRotations}
        streetsApi={streetsApi}
        wallsApi={wallsApi}
        dayWeather={climate.current}
        viewedDay={calendar.day}
        layoutError={layoutError}
      />
    </div>
  );
}
