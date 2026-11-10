"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  loadAurenfurtPartyTokens,
  saveAurenfurtPartyTokens,
} from "@/src/lib/actions/aurenfurt-session-actions";
import { HoloCityRail } from "./HoloCityRail";
import { HoloOverlay } from "./HoloOverlay";
import { CityPartyTokenTray } from "./CityPartyTokenTray";
import {
  clearPartyTokenDraft,
  getPartyTokenDraft,
  getPartyTokenState,
  partyTokenVersion,
  replacePartyTokenState,
  subscribePartyTokens,
} from "./aurenfurt-party-tokens";
import type { CitySurface } from "./CityViewSwitch";
import type { ChartMetric, LineKey } from "./CityDashboard";
import type { AnalyticsRange } from "./aurenfurt-analytics";
import { MapEditorPortals } from "./MapEditorPortals";
import { CityMapHud } from "./CityMapHud";
import { CityEventWizard } from "./CityEventWizard";
import CityVerwaltung from "./CityVerwaltung";
import { pruneExpiredKaiserPlays } from "./aurenfurt-verwaltung-store";
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
import { useNightModeControl } from "./hooks/useNightModeControl";
import { useWeatherApiControl } from "./hooks/useWeatherApiControl";
import { useWeatherFxControl } from "./hooks/useWeatherFxControl";
import { resolveCityWeatherFx } from "./aurenfurt-weather-fx";
import { isWeatherPresetId } from "@/src/lib/session-weather";
import type { SessionDayPhase } from "@/src/lib/session-day-phase";
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
import { citySectorHeat, type HeatmapAspect } from "./aurenfurt-city-heatmap";
import { buildDistrictHudKpis } from "./DistrictHudKpis";
import { cityMetricsOn, districtMetricsOn } from "./aurenfurt-history";
import { calculateDistrictFinances, sumFinances } from "./aurenfurt-finances";
import { populationOn } from "./aurenfurt-population";
import { parseDay } from "./aurenfurt-time";
import { weatherConditionPenalty } from "./aurenfurt-streets";
import { loadAurenfurtCityPressure } from "./load-aurenfurt-npc-records";
import { mergeCityBuildings } from "./aurenfurt-map-buildings";
import { AURENFURT_WORLD_ID } from "./aurenfurt-district-lore-ids";
import { findPoi } from "./aurenfurt-map-pois";
import { HoloCityLoadingOverlay } from "./HoloCityLoadingOverlay";
import {
  activeCityCardsByDistrict,
  districtsAffectedByCard,
  listActiveCityCardEffects,
} from "./aurenfurt-active-city-events";
import { listActiveMeasures } from "./aurenfurt-active-measures";

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
  /** Live-Session-ID (Stadt-Handel / Prep-Kontext). */
  sessionId?: string | null;
  isGm?: boolean;
  /**
   * Live-Spieler: nur 3D-Stadtkarte — kein Dashboard-/Verwaltungs-Tab.
   * SL behält volle Steuerung (Dashboard + Kaiser).
   */
  playerMapOnly?: boolean;
  /** Session-Status Scheduled → Vorbereitung: keine Live-Wirkung. */
  isPrepMode?: boolean;
  /** Leave-Button-Text (Live: „Stadtkarte beenden“, Lore: Standard). */
  leaveLabel?: string;
  /** Leave in der Rail anzeigen (Live-Spieler: aus). */
  showLeave?: boolean;
  /** Live: Ladenkatalog öffnet Session-Shop (active_shop_id). */
  onOpenMerchantShop?: (shopId: string, merchantNpcId: string) => void;
  /** Live-Atmosphäre: optisches Wetter (Stats bleiben API/Simulation). */
  opticalWeatherPreset?: string | null;
  opticalWeatherIntensity?: number | null;
  /** Live-Tagesphase → Nachtmodus der Stadtkarte. */
  sessionDayPhase?: SessionDayPhase | null;
  /** Wenn die SL den Nacht-Schalter an der Karte nutzt. */
  onSessionNightChange?: (night: boolean) => void;
  /** Live-Party für Stadtkarten-Tokens. */
  partyCharacters?: Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
    tokenUrl?: string | null;
    canPlace?: boolean;
  }>;
};

export function HoloCityMap({
  onLeave,
  worldId = null,
  campaignId = null,
  sessionId = null,
  isGm = false,
  playerMapOnly = false,
  isPrepMode = false,
  leaveLabel = "Zurück zur Lore",
  showLeave,
  onOpenMerchantShop,
  opticalWeatherPreset = null,
  opticalWeatherIntensity = null,
  sessionDayPhase = null,
  onSessionNightChange,
  partyCharacters = [],
}: Props) {
  const mapOnly = playerMapOnly && !isGm;
  const leaveVisible = showLeave ?? !mapOnly;
  const resolvedWorldId = worldId || AURENFURT_WORLD_ID;
  const partyTokenTick = useSyncExternalStore(
    subscribePartyTokens,
    partyTokenVersion,
    partyTokenVersion,
  );
  const partyTokenState = useMemo(() => {
    void partyTokenTick;
    return getPartyTokenState();
  }, [partyTokenTick]);
  const partyTokenDraft = useMemo(() => {
    void partyTokenTick;
    return getPartyTokenDraft();
  }, [partyTokenTick]);
  const persistPartyTokens = useCallback(() => {
    if (!sessionId) return;
    const snapshot = getPartyTokenState();
    void saveAurenfurtPartyTokens(sessionId, snapshot).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Token-Position nicht speicherbar.");
    });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    void loadAurenfurtPartyTokens(sessionId).then((row) => {
      if (active) replacePartyTokenState(row);
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") clearPartyTokenDraft();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessionId]);
  const bootstrap = useAurenfurtMapBootstrap();
  const { editorBuildings, categoryOverrides, pois, places, npcRecordIds, factionRecordIds } = bootstrap;
  const weatherFx = useWeatherFxControl(resolvedWorldId, isGm);
  const weatherApi = useWeatherApiControl(resolvedWorldId, isGm);
  const nightMode = useNightModeControl(resolvedWorldId, isGm);
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
  const climate = useAurenfurtWeather(calendar.day, { apiEnabled: weatherApi.enabled });
  const opticalPreset = isWeatherPresetId(opticalWeatherPreset) ? opticalWeatherPreset : null;
  const shownWeather = resolveCityWeatherFx({
    preference: weatherFx.preference,
    kind: climate.current.kind,
    dayIntensity: climate.current.intensity,
    opticalPreset: sessionId ? opticalPreset : null,
    opticalIntensity: sessionId ? opticalWeatherIntensity : null,
  });

  const lastSyncedDayPhase = useRef<SessionDayPhase | null>(null);
  useEffect(() => {
    if (!sessionId || !sessionDayPhase) return;
    if (lastSyncedDayPhase.current === sessionDayPhase) return;
    lastSyncedDayPhase.current = sessionDayPhase;
    nightMode.setNight(sessionDayPhase === "night", { force: true, persist: isGm });
  }, [sessionId, sessionDayPhase, nightMode.setNight, isGm]);

  const onToggleNightMode = useCallback(() => {
    if (!nightMode.canToggle) return;
    const next = !nightMode.night;
    nightMode.setNight(next);
    if (sessionId) onSessionNightChange?.(next);
  }, [nightMode, sessionId, onSessionNightChange]);

  const prepBlockToast = useCallback(() => {
    toast.message("Vorbereitung: Kalender und Simulation starten erst, wenn die Session Live ist.");
  }, []);

  const onDayChangeGuarded = useCallback(
    (iso: string) => {
      if (isPrepMode) {
        prepBlockToast();
        return;
      }
      calendar.setDay(iso);
    },
    [calendar, isPrepMode, prepBlockToast],
  );

  const onStepDayGuarded = useCallback(
    (delta: number) => {
      if (isPrepMode) {
        prepBlockToast();
        return;
      }
      calendar.stepDay(delta);
    },
    [calendar, isPrepMode, prepBlockToast],
  );

  const onStepYearGuarded = useCallback(
    (delta: number) => {
      if (isPrepMode) {
        prepBlockToast();
        return;
      }
      calendar.stepYear(delta);
    },
    [calendar, isPrepMode, prepBlockToast],
  );

  const onGoTodayGuarded = useCallback(() => {
    if (isPrepMode) {
      prepBlockToast();
      return;
    }
    calendar.goToday();
  }, [calendar, isPrepMode, prepBlockToast]);

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
        condition: Math.max(
          0,
          Math.min(100, street.condition - weatherConditionPenalty(climate.current)),
        ),
        traffic: street.traffic,
        segments: Math.max(1, street.points.length - 1),
      })),
      pois: pois.map((poi) => ({
        districtId: poi.districtId,
        influences: poi.influences,
        u: poi.u,
        v: poi.v,
        reach: poi.reach,
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
  useEffect(() => {
    pruneExpiredKaiserPlays(calendar.day);
  }, [calendar.day]);
  useEffect(() => {
    if (!isGm && citySurface === "verwaltung") setCitySurface("map");
  }, [isGm, citySurface]);
  useEffect(() => {
    if (mapOnly && citySurface !== "map") setCitySurface("map");
  }, [mapOnly, citySurface]);
  const [dashboardScope, setDashboardScope] = useState<CityDistrictId | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("month");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("economy");
  const [lines, setLines] = useState<LineKey[]>(["economy", "crime", "guard", "tension"]);
  const [eventWizardOpen, setEventWizardOpen] = useState(false);
  const [eventPlaceStep, setEventPlaceStep] = useState(false);
  const [eventDistrictId, setEventDistrictId] = useState<CityDistrictId | null>(null);
  const [eventSectorIds, setEventSectorIds] = useState<string[]>([]);
  const [eventWholeCity, setEventWholeCity] = useState(false);
  const [heatmapAspect, setHeatmapAspect] = useState<HeatmapAspect | null>(null);
  const simVersion = useSyncExternalStore(subscribeCitySim, citySimVersion, citySimVersion);
  const heatCells = useMemo(
    () => (heatmapAspect ? citySectorHeat(parseDay(calendar.day), heatmapAspect) : []),
    [calendar.day, heatmapAspect, simVersion],
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

  const focusDistrictId = view.subject?.districtId ?? null;
  const [previewDistrictId, setPreviewDistrictId] = useState<CityDistrictId | null>(null);
  const [selectedActiveCityCardId, setSelectedActiveCityCardId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedActiveCityCardId(null);
  }, [calendar.day]);

  const activeCityCards = useMemo(
    () => listActiveCityCardEffects(calendar.day),
    [calendar.day, simVersion],
  );
  const activeMeasures = useMemo(
    () => listActiveMeasures(calendar.day),
    [calendar.day, simVersion],
  );
  const activeCardsByDistrict = useMemo(
    () => activeCityCardsByDistrict(calendar.day),
    [calendar.day, simVersion],
  );
  const previewDistrictIds = useMemo(() => {
    if (!previewDistrictId) return [] as CityDistrictId[];
    const cards = activeCardsByDistrict.get(previewDistrictId) ?? [];
    if (cards.length === 0) return [] as CityDistrictId[];
    const ids = new Set<CityDistrictId>();
    for (const card of cards) {
      for (const id of districtsAffectedByCard(card)) ids.add(id);
    }
    return [...ids];
  }, [activeCardsByDistrict, previewDistrictId]);

  const districtTitle = focusDistrictId
    ? (findDistrict(focusDistrictId)?.name ?? "Viertel")
    : "Aurenfurt";
  const districtKpis = useMemo(() => {
    const dayMs = parseDay(calendar.day);
    const dayStep = 86_400_000;
    const maxMs = parseDay(calendar.maxDay);
    const minMs = parseDay(calendar.minDay);
    const current = focusDistrictId
      ? districtMetricsOn(focusDistrictId, dayMs)
      : cityMetricsOn(dayMs);
    const lookingForward = dayMs + dayStep <= maxMs;
    const compareMs = lookingForward ? dayMs + dayStep : Math.max(minMs, dayMs - dayStep);
    const compare = focusDistrictId
      ? districtMetricsOn(focusDistrictId, compareMs)
      : cityMetricsOn(compareMs);
    return buildDistrictHudKpis(current, compare, { fromPast: !lookingForward });
  }, [calendar.day, calendar.maxDay, calendar.minDay, focusDistrictId, simVersion]);

  /** Ein Tages-Snapshot aus dem Populations-Cache — kein Range-/History-Rebuild. */
  const populationTotal = useMemo(() => {
    const snap = populationOn(calendar.day);
    if (focusDistrictId) {
      return snap.districts[focusDistrictId]?.population_total ?? 0;
    }
    return snap.population_total;
  }, [calendar.day, focusDistrictId, simVersion]);

  /** Täglicher Umsatz (Einnahmen) — Stadt gesamt oder gewähltes Viertel. */
  const revenueTotal = useMemo(() => {
    const snap = populationOn(calendar.day);
    const dayMs = parseDay(calendar.day);
    if (focusDistrictId) {
      const layers = snap.districts[focusDistrictId];
      if (!layers) return 0;
      return calculateDistrictFinances(layers, districtMetricsOn(focusDistrictId, dayMs).economy).income;
    }
    return sumFinances(
      Object.values(snap.districts).map((layers) =>
        calculateDistrictFinances(layers, districtMetricsOn(layers.districtId, dayMs).economy),
      ),
    ).income;
  }, [calendar.day, focusDistrictId, simVersion]);

  /** Für Wizard/Speichern immer, solange ein Viertel gewählt ist (nicht nur im Ort-Schritt). */
  const eventWizardSectors =
    eventWizardOpen && eventDistrictId
      ? (sectorsApi.sectorsByDistrict[eventDistrictId] ?? [])
      : [];
  /** Auf der Karte nur während der Ort-Auswahl anklickbar. */
  const eventPickSectors = eventPlaceStep ? eventWizardSectors : [];

  const closeEventWizard = () => {
    setEventWizardOpen(false);
    setEventPlaceStep(false);
    setEventDistrictId(null);
    setEventSectorIds([]);
    setEventWholeCity(false);
  };

  const onCanvasSelect = (selection: HoloSelection | null) => {
    if (eventWizardOpen && eventPlaceStep) {
      // Leere Treffer ignorieren (ganze Stadt nur über den Wizard-Button).
      if (!selection) return;
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
        // Gleiches Viertel erneut: Sektorwahl behalten. Anderes Viertel: Sektoren zurücksetzen.
        if (eventDistrictId !== districtId) setEventSectorIds([]);
        setEventDistrictId(districtId);
        view.hover(null);
      }
      return;
    }
    if (session.mapAdminMode && selection?.type === "building") {
      session.selectBuilding(selection.id);
      return;
    }
    if (session.mapAdminMode && !selection) {
      session.selectBuilding(null);
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

  useEffect(() => {
    const onReload = () => reloadCityPressure();
    window.addEventListener("th:aurenfurt-pressure-reload", onReload);
    return () => window.removeEventListener("th:aurenfurt-pressure-reload", onReload);
  }, []);

  useEffect(() => {
    if (!isGm || !resolvedWorldId) return;
    let cancelled = false;
    void import("@/src/app/dashboard/worlds/city-sim-event-actions").then(({ deactivateExpiredCitySimEvents }) =>
      deactivateExpiredCitySimEvents(resolvedWorldId, calendar.day).then((count) => {
        if (cancelled || !count) return;
        reloadCityPressure();
        window.dispatchEvent(new CustomEvent("th:aurenfurt-pressure-reload"));
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [calendar.day, isGm, resolvedWorldId]);

  const [sceneBooted, setSceneBooted] = useState(false);
  const [loadCoverVisible, setLoadCoverVisible] = useState(true);
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
          showLeave={leaveVisible}
          leaveLabel={leaveLabel}
          activeCardsByDistrict={activeCardsByDistrict}
          onPreviewDistrict={setPreviewDistrictId}
        />
      ) : null}
      <div className="relative min-w-0 flex-1">
        <div
          className={
            citySurface === "dashboard" || citySurface === "verwaltung"
              ? "invisible absolute inset-0"
              : eventPlaceStep
                ? "h-full cursor-crosshair"
                : "h-full"
          }
        >
        <HoloCityLoadingOverlay
          enabled={citySurface === "map"}
          sceneBooted={sceneBooted}
          expectedHeavyCount={expectedHeavyCount}
          onCoverVisibleChange={setLoadCoverVisible}
        />
        <HoloCityCanvas
          onSceneBoot={() => setSceneBooted(true)}
          selection={
            eventWizardOpen && eventPlaceStep
              ? eventDistrictId
                ? { type: "district", id: eventDistrictId }
                : null
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
          nightMode={nightMode.night}
          viewedDay={calendar.day}
          streetsLayerVisible={heatmapAspect ? false : layers.streets}
          buildingsVisible={heatmapAspect ? false : layers.buildings}
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
          crimeHeatmapVisible={Boolean(heatmapAspect)}
          crimeCells={heatCells}
          poiReachCells={reach.poiReachCells}
          poiReachVisible={poiReachVisible}
          holdStill={eventPlaceStep}
          highlightDistricts={eventPlaceStep}
          activeCityCards={loadCoverVisible ? [] : activeCityCards}
          sectorsByDistrict={sectorsApi.sectorsByDistrict}
          previewDistrictIds={previewDistrictIds}
          selectedActiveCityCardId={selectedActiveCityCardId}
          onSelectActiveCityCard={setSelectedActiveCityCardId}
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
          partyTokensEnabled={Boolean(sessionId)}
          partyTokensEditable={Boolean(sessionId) && (isGm || partyCharacters.some((pc) => pc.canPlace !== false))}
          onPartyTokensPersist={persistPartyTokens}
        />
        {citySurface === "map" && sessionId && !loadCoverVisible ? (
          <CityPartyTokenTray
            characters={partyCharacters}
            draft={partyTokenDraft}
            placed={partyTokenState}
            canManage={isGm || partyCharacters.some((pc) => pc.canPlace !== false)}
          />
        ) : null}
        {!loadCoverVisible ? (
        <CityMapHud
          citySurface={citySurface}
          onCitySurface={setCitySurface}
          showVerwaltung={isGm && !mapOnly}
          showDashboard={!mapOnly}
          mapOnly={mapOnly}
          day={calendar.day}
          minDay={calendar.minDay}
          maxDay={calendar.maxDay}
          isToday={calendar.isToday}
          liveWeather={climate.live}
          onDayChange={onDayChangeGuarded}
          onStepDay={onStepDayGuarded}
          onStepYear={onStepYearGuarded}
          onGoToday={onGoTodayGuarded}
          isGm={isGm}
          mapAdminMode={session.mapAdminMode}
          onToggleMapAdminMode={session.toggleMapAdminMode}
          eventWizardOpen={eventWizardOpen}
          onToggleEventWizard={() => {
            if (eventWizardOpen) closeEventWizard();
            else setEventWizardOpen(true);
          }}
          districtTitle={districtTitle}
          districtId={focusDistrictId}
          districtKpis={districtKpis}
          population={populationTotal}
          revenue={revenueTotal}
          statusLine={
            eventWizardOpen && eventPlaceStep
              ? eventDistrictId
                ? "Draufsicht: Sektoren anklicken (Mehrfachwahl). Gold = ausgewählt, Bezeichnung darüber."
                : "Draufsicht: Viertel wählen. Danach Zoom auf die Sektoren. Klick neben die Stadt = ganze Stadt."
              : session.wallDrawActive
                ? "Klicke Punkte für die Mauer. Doppelklick schließt die Linie."
                : session.placingBuildingActive
                  ? "Klicke im Viertel, um das Gebäude zu setzen."
                  : session.placingPoiActive
                    ? session.repositioningPoi
                      ? "Klicke auf die Karte, um den Ort neu zu setzen."
                      : "Klicke auf die Karte, um den besonderen Ort zu setzen."
                    : hint
                      ? hint
                      : focusDistrictId
                        ? null
                        : "Viertel links wählen."
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
          nightMode={nightMode.night}
          onToggleNightMode={nightMode.canToggle ? onToggleNightMode : undefined}
          heatmapAspect={heatmapAspect}
          onHeatmapAspect={setHeatmapAspect}
          activeMeasures={activeMeasures}
        />
        ) : null}
        {isGm && eventWizardOpen ? (
          <CityEventWizard
            day={calendar.day}
            worldId={resolvedWorldId}
            districtId={eventDistrictId}
            wholeCity={eventWholeCity}
            sectorIds={eventSectorIds}
            sectors={eventWizardSectors}
            onPlaceStep={setEventPlaceStep}
            onSelectWholeCity={() => {
              setEventWholeCity(true);
              setEventDistrictId(null);
              setEventSectorIds([]);
            }}
            onSelectWholeDistrict={() => {
              if (!eventDistrictId) return;
              setEventWholeCity(false);
              setEventSectorIds([]);
            }}
            onClearSectors={() => setEventSectorIds([])}
            onLoadPlace={({ wholeCity, districtId, sectorLabel }) => {
              setEventWholeCity(wholeCity);
              setEventDistrictId(districtId);
              if (wholeCity || !districtId || !sectorLabel?.trim()) {
                setEventSectorIds([]);
                return;
              }
              const wanted = new Set(
                sectorLabel
                  .split(",")
                  .map((part) => part.trim().toLowerCase())
                  .filter(Boolean),
              );
              const pool = sectorsApi.sectorsByDistrict[districtId] ?? [];
              const districtName = (findDistrict(districtId)?.name ?? "").toLowerCase();
              setEventSectorIds(
                pool
                  .filter((sector) => {
                    const address = sector.address.toLowerCase();
                    const label = sector.label.toLowerCase();
                    return (
                      wanted.has(address) ||
                      wanted.has(label) ||
                      wanted.has(`${districtName} ${label}`.trim())
                    );
                  })
                  .map((sector) => sector.id),
              );
            }}
            onClose={closeEventWizard}
            onSaved={() => {
              reloadCityPressure();
              window.dispatchEvent(new CustomEvent("th:aurenfurt-pressure-reload"));
            }}
          />
        ) : null}
        </div>
        {citySurface === "dashboard" && !mapOnly ? (
          <CityDashboard
            day={calendar.day}
            minDay={calendar.minDay}
            maxDay={calendar.maxDay}
            isToday={calendar.isToday}
            liveWeather={climate.current}
            scopeId={dashboardScope}
            onScopeId={setDashboardScope}
            onDayChange={onDayChangeGuarded}
            onStepDay={onStepDayGuarded}
            onStepYear={onStepYearGuarded}
            onGoToday={onGoTodayGuarded}
            onShowMap={() => setCitySurface("map")}
            onShowVerwaltung={() => setCitySurface("verwaltung")}
            showVerwaltung={isGm}
            onLeave={onLeave}
            leaveLabel={leaveLabel}
            range={range}
            setRange={setRange}
            chartMetric={chartMetric}
            setChartMetric={setChartMetric}
            lines={lines}
            setLines={setLines}
            worldId={resolvedWorldId}
            campaignId={campaignId}
            npcRecordIds={npcRecordIds}
            factionRecordIds={factionRecordIds}
          />
        ) : null}
        {citySurface === "verwaltung" && isGm && !mapOnly ? (
          <CityVerwaltung
            day={calendar.day}
            onShowMap={() => setCitySurface("map")}
            onShowDashboard={() => setCitySurface("dashboard")}
            onLeave={onLeave}
            leaveLabel={leaveLabel}
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
              isPrepMode={isPrepMode}
              sessionId={sessionId}
              onOpenShop={onOpenMerchantShop}
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
