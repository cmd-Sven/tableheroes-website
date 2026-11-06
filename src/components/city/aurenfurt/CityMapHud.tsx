"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Filter, Menu, ScrollText, Shield } from "lucide-react";
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

type Props = {
  citySurface: CitySurface;
  onCitySurface: (mode: CitySurface) => void;
  /** SL/Admin: Tab Verwaltung anzeigen */
  showVerwaltung?: boolean;
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
  heatmapAspect: HeatmapAspect | null;
  onHeatmapAspect: (aspect: HeatmapAspect | null) => void;
};

export function CityMapHud({
  citySurface,
  onCitySurface,
  showVerwaltung = false,
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
  heatmapAspect,
  onHeatmapAspect,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

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
        className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex h-[168px] items-end gap-2.5 overflow-visible bg-background-dark px-2 pb-3"
      >
        <div className="shrink-0" style={{ marginRight: 50 }}>
          <CityViewSwitch
            mode={citySurface}
            onChange={onCitySurface}
            showVerwaltung={showVerwaltung}
          />
        </div>
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
        <div ref={menuRef} className="relative z-40 flex h-full shrink-0 items-center">
          <button
            type="button"
            data-city-burger=""
            aria-label="Menü"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center border border-hero-dark bg-hero-dark p-2 text-accent-gold hover:bg-background-card"
          >
            <Menu className="h-5 w-5" aria-hidden />
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
      </header>
      <div
        data-city-map-hud="layers"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center"
      >
        <MapLayerVisibilityBar
          buildingsVisible={buildingsVisible}
          poisVisible={poisVisible}
          streetsVisible={streetsVisible}
          wallsVisible={wallsVisible}
          weatherVisible={weatherVisible}
          onToggleLayer={onToggleLayer}
          onToggleWeather={onToggleWeather}
        />
      </div>
    </>
  );
}
