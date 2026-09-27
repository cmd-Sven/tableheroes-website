"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { HoloCityRail } from "./HoloCityRail";
import { HoloDayCalendar } from "./HoloDayCalendar";
import { HoloOverlay } from "./HoloOverlay";
import { findDistrict } from "./aurenfurt-districts";
import { findPlaceLore, type AurenfurtPlaceLore } from "./aurenfurt-lore";
import { useAurenfurtDay } from "./hooks/useAurenfurtDay";
import { useAurenfurtWeather } from "./hooks/useAurenfurtWeather";
import { useDistrictFactions } from "./hooks/useDistrictFactions";
import { useDistrictMetrics } from "./hooks/useDistrictMetrics";
import { useDistrictNpcs } from "./hooks/useDistrictNpcs";
import { useHoloCityView } from "./hooks/useHoloCityView";
import { useKeyLocations } from "./hooks/useKeyLocations";
import { loadAurenfurtPlaceLore } from "./load-aurenfurt-place-lore";

const HoloCityCanvas = dynamic(() => import("./scene/HoloCityCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-barlow text-xs font-bold uppercase tracking-wide text-cyan-100/80">
      Diorama wird gehoben…
    </div>
  ),
});

type Props = {
  onLeave: () => void;
  /** Für NPC-Detail-Links, sobald Map-NPCs eine DB-recordId haben */
  worldId?: string | null;
  campaignId?: string | null;
};

export function HoloCityMap({ onLeave, worldId = null, campaignId = null }: Props) {
  const view = useHoloCityView();
  const calendar = useAurenfurtDay();
  const metrics = useDistrictMetrics(view.subject?.districtId ?? null, calendar.day);
  const districtFactions = useDistrictFactions(view.subject?.districtId ?? null, calendar.day);
  const keyLocations = useKeyLocations(
    view.subject?.districtId ?? null,
    view.subject?.type === "building" ? view.subject.id : null,
  );
  const districtNpcs = useDistrictNpcs(
    view.subject?.districtId ?? null,
    view.subject?.type === "building" ? view.subject.id : null,
  );
  const climate = useAurenfurtWeather(calendar.day);
  const [places, setPlaces] = useState<AurenfurtPlaceLore[]>([]);

  useEffect(() => {
    let active = true;
    loadAurenfurtPlaceLore()
      .then((rows) => {
        if (active) setPlaces(rows);
      })
      .catch(() => {
        if (active) setPlaces([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const hint = view.hoveredSubject && view.hoveredSubject.id !== view.subject?.id ? view.hoveredSubject.name : null;

  return (
    <div className="fixed inset-0 z-[80] flex bg-[#02080c]">
      <HoloCityRail
        selection={view.selection}
        subject={view.subject}
        sim={metrics.sim}
        scopeLabel={view.subject ? (findDistrict(view.subject.districtId)?.name ?? "Viertel") : "Stadt gesamt"}
        onSelect={view.focus}
        onLeave={onLeave}
      />
      <HoloOverlay
        subject={view.subject}
        lore={view.subject ? findPlaceLore(places, view.subject.name) : null}
        sim={metrics.sim}
        series={metrics.series}
        weather={climate.current}
        weatherSeries={climate.series}
        influences={metrics.influences}
        factions={districtFactions.factions}
        locations={keyLocations.locations}
        selectedLocation={keyLocations.selected}
        leaders={districtNpcs.leaders}
        operator={districtNpcs.operator}
        npcLinkContext={{ worldId, campaignId }}
        viewDay={calendar.day}
        onClose={() => view.focus(null)}
        onSelect={view.focus}
      />
      <div className="relative min-w-0 flex-1">
        <HoloCityCanvas
          selection={view.selection}
          hovered={view.hovered}
          onSelect={view.focus}
          onHover={view.hover}
        />
        <div className="pointer-events-none absolute left-4 top-4 z-10 space-y-2">
          <div>
            <p className="font-cinzel text-sm font-bold text-accent-gold">Aurenfurt</p>
            <p className="font-libre text-sm text-gray-300">
              {hint ?? view.subject?.name ?? "Viertel links wählen."}
            </p>
          </div>
          <HoloDayCalendar
            day={calendar.day}
            minDay={calendar.minDay}
            maxDay={calendar.maxDay}
            isToday={calendar.isToday}
            onDayChange={calendar.setDay}
            onStepDay={calendar.stepDay}
            onStepYear={calendar.stepYear}
            onGoToday={calendar.goToday}
          />
        </div>
      </div>
    </div>
  );
}
