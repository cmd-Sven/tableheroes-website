"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Filter, ScrollText, Settings, Shield } from "lucide-react";
import { CityViewSwitch, type CitySurface } from "./CityViewSwitch";
import { HoloDayStrip } from "./HoloDayStrip";
import { HoloWeatherControl } from "./HoloWeatherControl";
import { MapLayerVisibilityBar } from "./MapLayerVisibilityBar";
import type { MapLayerId } from "./hooks/useMapLayerVisibility";
import type { DayWeather } from "./aurenfurt-weather";
import type { WeatherFxId, WeatherFxMode } from "./aurenfurt-weather-fx";
import { HEATMAP_ASPECTS, type HeatmapAspect } from "./aurenfurt-city-heatmap";
import type { CityDistrictId } from "./aurenfurt-districts";
import { DistrictHudKpis, type DistrictHudKpi } from "./DistrictHudKpis";
import { ActiveMeasuresPanel } from "./ActiveMeasuresPanel";
import type { ActiveMeasure } from "./aurenfurt-active-measures";

type Props = {
  citySurface: CitySurface;
  onCitySurface: (mode: CitySurface) => void;
  /** SL/Admin: Tab Verwaltung anzeigen */
  showVerwaltung?: boolean;
  /** Dashboard-Tab (Live-Spieler: aus) */
  showDashboard?: boolean;
  /** Nur 3D-Karte — View-Switch ausblenden */
  mapOnly?: boolean;
  day: string;
  minDay: string;
  maxDay: string;
  isToday: boolean;
  liveWeather: DayWeather | null;
  onDayChange: (iso: string) => void;
  onStepDay: (delta: number) => void;
  onStepYear: (delta: number) => void;
  onGoToday: () => void;
  isGm: boolean;
  mapAdminMode: boolean;
  onToggleMapAdminMode: () => void;
  eventWizardOpen: boolean;
  onToggleEventWizard: () => void;
  /** Großer Titel rechts neben dem Kalender (Viertel oder Stadt). */
  districtTitle: string;
  districtId: CityDistrictId | null;
  districtKpis: DistrictHudKpi[];
  /** Aktuelle Bevölkerung (Stadt gesamt oder ausgewähltes Viertel). */
  population: number;
  /** Täglicher Umsatz/Einnahmen in GP (Stadt oder Viertel). */
  revenue: number;
  statusLine: string | null;
  layoutError: string | null;
  buildingsVisible: boolean;
  poisVisible: boolean;
  streetsVisible: boolean;
  wallsVisible: boolean;
  weatherVisible: boolean;
  onToggleLayer: (layer: MapLayerId) => void;
  onToggleWeather: () => void;
  weatherEnabled: boolean;
  weatherMode: WeatherFxMode;
  autoEffect: WeatherFxId;
  onWeatherMode: (mode: WeatherFxMode) => void;
  /** SL-Nachtmodus (weicher Übergang). */
  nightMode?: boolean;
  onToggleNightMode?: () => void;
  heatmapAspect: HeatmapAspect | null;
  onHeatmapAspect: (aspect: HeatmapAspect | null) => void;
  activeMeasures: ActiveMeasure[];
};

export function CityMapHud({
  citySurface,
  onCitySurface,
  showVerwaltung = false,
  showDashboard = true,
  mapOnly = false,
  day,
  minDay,
  maxDay,
  isToday,
  liveWeather,
  onDayChange,
  onStepDay,
  onStepYear,
  onGoToday,
  isGm,
  mapAdminMode,
  onToggleMapAdminMode,
  eventWizardOpen,
  onToggleEventWizard,
  districtTitle,
  districtId,
  districtKpis,
  population,
  revenue,
  statusLine,
  layoutError,
  buildingsVisible,
  poisVisible,
  streetsVisible,
  wallsVisible,
  weatherVisible,
  onToggleLayer,
  onToggleWeather,
  weatherEnabled,
  weatherMode,
  autoEffect,
  onWeatherMode,
  nightMode = false,
  onToggleNightMode,
  heatmapAspect,
  onHeatmapAspect,
  activeMeasures,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [measuresOpen, setMeasuresOpen] = useState(false);
  const [layersHost, setLayersHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setLayersHost(document.body);
  }, []);

  useEffect(() => {
    setMeasuresOpen(false);
  }, [day]);

  useEffect(() => {
    if (!menuOpen) {
      setFilterOpen(false);
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const menuItem =
    "flex w-full items-center gap-2 px-3 py-2 text-left font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold hover:bg-background-card";

  return (
    <>
      <header
        data-city-map-hud="top"
        className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex h-[120px] items-end gap-2 overflow-visible bg-background-dark px-3 pb-2 pt-3"
      >
        {!mapOnly ? (
          <div className="shrink-0 self-end" style={{ marginRight: 28 }}>
            <CityViewSwitch
              mode={citySurface}
              onChange={onCitySurface}
              showVerwaltung={showVerwaltung}
              showDashboard={showDashboard}
            />
          </div>
        ) : null}
        <HoloDayStrip
          day={day}
          minDay={minDay}
          maxDay={maxDay}
          isToday={isToday}
          liveWeather={liveWeather}
          onDayChange={onDayChange}
          onStepDay={onStepDay}
          onStepYear={onStepYear}
          onGoToday={onGoToday}
        />
        <DistrictHudKpis
          title={districtTitle}
          districtId={districtId}
          day={day}
          kpis={districtKpis}
          hint={statusLine}
          layoutError={layoutError}
        />
        <div data-city-map-hud="stats" className="flex shrink-0 items-stretch gap-1 self-end">
          <div
            data-city-map-hud="population"
            className="flex flex-col items-end justify-end border border-hero-dark/70 px-1.5 py-0.5"
            style={{
              backgroundImage: "url('/images/dark-marmor.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-label={`Bevölkerung ${population.toLocaleString("de-DE")}`}
          >
            <span className="font-barlow text-[7px] font-bold uppercase tracking-wide text-gray-300">
              Bevölkerung
            </span>
            <span className="font-barlow text-sm font-extrabold leading-none tabular-nums tracking-wide text-hero-vibrant">
              {population.toLocaleString("de-DE")}
            </span>
          </div>
          <div
            data-city-map-hud="revenue"
            className="flex flex-col items-end justify-end border border-hero-dark/70 px-1.5 py-0.5"
            style={{
              backgroundImage: "url('/images/dark-marmor.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-label={`Umsatz ${Math.round(revenue).toLocaleString("de-DE")} GP`}
          >
            <span className="font-barlow text-[7px] font-bold uppercase tracking-wide text-gray-300">
              Umsatz
            </span>
            <span className="font-barlow text-sm font-extrabold leading-none tabular-nums tracking-wide text-accent-gold">
              {Math.round(revenue).toLocaleString("de-DE")}
              <span className="ml-0.5 text-[8px] font-bold text-accent-gold/80">GP</span>
            </span>
          </div>
        </div>
        <div className="relative z-40 ml-auto flex shrink-0 items-end gap-1 self-end">
          <ActiveMeasuresPanel
            open={measuresOpen}
            onToggle={() => setMeasuresOpen((open) => !open)}
            measures={activeMeasures}
          />
          <div ref={menuRef} className="relative">
          <button
            type="button"
            data-city-burger=""
            aria-label="Einstellungen"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center border border-hero-dark bg-hero-dark p-1.5 text-accent-gold hover:bg-background-card"
          >
            <Settings className="h-4 w-4" aria-hidden />
          </button>
          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                id={menuId}
                role="menu"
                aria-label="Kartenmenü"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full z-40 mt-1 w-60 border border-hero-dark bg-background-dark py-1 shadow-lg"
              >
                <div className="border-b border-hero-dark">
                  <button
                    type="button"
                    role="menuitem"
                    aria-expanded={filterOpen}
                    onClick={() => setFilterOpen((open) => !open)}
                    className={menuItem}
                  >
                    <Filter className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex-1">Filter</span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${filterOpen ? "rotate-90" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {filterOpen
                    ? HEATMAP_ASPECTS.map((aspect) => {
                        const active = heatmapAspect === aspect.key;
                        return (
                          <button
                            key={aspect.key}
                            type="button"
                            role="menuitemradio"
                            aria-checked={active}
                            data-heatmap-aspect={aspect.key}
                            data-heatmap-on={active ? "on" : "off"}
                            onClick={() => onHeatmapAspect(active ? null : aspect.key)}
                            className={`${menuItem} pl-9 ${active ? "text-hero-vibrant" : ""}`}
                          >
                            <span
                              aria-hidden
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                active ? "bg-orange-300" : "bg-gray-500"
                              }`}
                            />
                            {aspect.label}
                            <span className="ml-auto font-libre text-[10px] normal-case tracking-normal text-gray-400">
                              {active ? "an" : "aus"}
                            </span>
                          </button>
                        );
                      })
                    : null}
                </div>

                {isGm ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      aria-pressed={eventWizardOpen}
                      onClick={() => {
                        onToggleEventWizard();
                        setMenuOpen(false);
                      }}
                      className={`${menuItem} ${eventWizardOpen ? "text-hero-vibrant" : ""}`}
                    >
                      <ScrollText className="h-4 w-4 shrink-0" aria-hidden />
                      Stadtereignis
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      aria-pressed={mapAdminMode}
                      onClick={() => {
                        onToggleMapAdminMode();
                        setMenuOpen(false);
                      }}
                      className={`${menuItem} ${mapAdminMode ? "text-hero-vibrant" : ""}`}
                    >
                      <Shield className="h-4 w-4 shrink-0" aria-hidden />
                      {mapAdminMode ? "Admin beenden" : "Admin"}
                    </button>
                  </>
                ) : null}

                <div className="border-t border-hero-dark">
                  <HoloWeatherControl
                    enabled={weatherEnabled}
                    mode={weatherMode}
                    autoEffect={autoEffect}
                    onModeChange={onWeatherMode}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          </div>
        </div>
      </header>
      {layersHost && citySurface === "map"
        ? createPortal(
            <div
              data-city-map-hud="layers"
              className="pointer-events-none fixed inset-x-0 z-[95] flex justify-center"
              style={{
                /*
                 * Knapp über dem Hand-Toggle (nicht volle Hand-Höhe), über der Hand (z-90).
                 * CitySimDeckHand setzt --th-hand-dock-layers-h.
                 */
                bottom: "var(--th-hand-dock-layers-h, var(--th-hand-dock-h, 4.75rem))",
              }}
            >
              <MapLayerVisibilityBar
                buildingsVisible={buildingsVisible}
                poisVisible={poisVisible}
                streetsVisible={streetsVisible}
                wallsVisible={wallsVisible}
                weatherVisible={weatherVisible}
                onToggleLayer={onToggleLayer}
                onToggleWeather={onToggleWeather}
                nightMode={nightMode}
                onToggleNightMode={onToggleNightMode}
              />
            </div>,
            layersHost,
          )
        : null}
    </>
  );
}
