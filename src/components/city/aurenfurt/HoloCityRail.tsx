"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { AlertTriangle, Landmark, Undo2 } from "lucide-react";
import type { ActiveCityCardEffect } from "./aurenfurt-active-city-events";
import {
  AURENFURT_DISTRICTS,
  type CityDistrictId,
  type HoloSelection,
  type SimSubject,
} from "./aurenfurt-districts";
import { DISTRICT_CREST } from "./aurenfurt-district-crests";
import type { SimProfile } from "./aurenfurt-sim";
import { CityHudChrome } from "./CityHudFrame";

/** Dieselben Pfade wie die Landingpage (`FaqSection` u. a.). */
const MARBLE_BG = "/images/dark-marmor.webp";
const PLAQUE_SRC = "/images/city/map-text-button.png";

/** 120px bisherige Obergrenze, 35 Prozent kleiner. Gilt auch für den aktiven Zustand. */
const CREST_SIZE = 78;
/**
 * Marmorstreifen 90px, nur rechte Bordüre. Streifen und Bordüre bleiben liegen.
 * Die Wappen-Spalte (78px) sitzt 40px weiter rechts und ragt über den Streifen hinaus.
 */
const RAIL_WIDTH = 90;
const CREST_OVERHANG = CREST_SIZE - RAIL_WIDTH;
const CREST_SHIFT = 40;
/** Halbe Fläche der bisherigen 78×263-Plakette, Seitenverhältnis der Grafik bleibt. */
const PLAQUE_HEIGHT = 55;
const PLAQUE_WIDTH = Math.round((PLAQUE_HEIGHT * 990) / 294);
const PLAQUE_OVERLAP = 14;
/** Bisher h-11 (44px) und Icon h-5 (20px), jeweils 35 Prozent kleiner. */
const ICON_BUTTON = 29;
const ICON_SIZE = 13;
const HOVER_SCALE = "group-hover:scale-[1.08] group-focus-visible:scale-[1.08]";

type Props = {
  selection: HoloSelection | null;
  subject: SimSubject | null;
  sim: SimProfile;
  scopeLabel: string;
  onSelect: (selection: HoloSelection) => void;
  onLeave: () => void;
  /** Leave-Button in der Rail (Live-Spieler: aus). */
  showLeave?: boolean;
  leaveLabel?: string;
  /** Aktive Stadt-Ereigniskarten je Viertel (Ausrufezeichen + Tooltip). */
  activeCardsByDistrict?: Map<CityDistrictId, ActiveCityCardEffect[]>;
  /** Hover auf Viertel-Icon → Einflussbereich auf der 3D-Karte. */
  onPreviewDistrict?: (districtId: CityDistrictId | null) => void;
};

function plaqueLabel(name: string): string {
  return name.toLocaleUpperCase("de-DE");
}

/** Lange Viertelnamen bleiben in der Innenfläche, kürzere bleiben größer und zentriert. */
function plaqueFontSize(label: string): number {
  const length = [...label].length;
  if (length >= 16) return 9;
  if (length >= 14) return 10;
  if (length >= 11) return 11;
  if (length >= 9) return 12;
  return 14;
}

export function HoloCityRail({
  selection,
  subject,
  onSelect,
  onLeave,
  showLeave = true,
  leaveLabel = "Zurück zur Lore",
  activeCardsByDistrict,
  onPreviewDistrict,
}: Props) {
  return (
    <nav
      className="pointer-events-auto relative z-[81] flex h-full shrink-0 flex-col overflow-visible shadow-2xl"
      style={{
        marginLeft: Math.max(0, CREST_OVERHANG),
        width: RAIL_WIDTH,
        backgroundImage: `url('${MARBLE_BG}')`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
      aria-label="Aurenfurt steuern"
    >
      <CityHudChrome density="rail" />
      {/* Unter der HUD (Stadtansicht), damit das erste Wappen nicht überlappt. */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-visible pt-[160px]">
        <div className="flex min-h-0 flex-1 flex-col overflow-visible">
          {AURENFURT_DISTRICTS.map((district) => {
            const crest = DISTRICT_CREST[district.id];
            const active =
              (selection?.type === "district" && selection.id === district.id) ||
              (selection?.type === "building" && subject?.districtId === district.id) ||
              (selection?.type === "poi" && subject?.districtId === district.id);
            const activeCards = activeCardsByDistrict?.get(district.id) ?? [];
            return (
              <DistrictButton
                key={district.id}
                label={district.name}
                active={active}
                compact={!crest}
                activeCards={activeCards}
                onClick={() => onSelect({ type: "district", id: district.id })}
                onHoverChange={(hot) => onPreviewDistrict?.(hot ? district.id : null)}
              >
                {crest ? (
                  <span
                    className={`relative z-30 block shrink-0 origin-center transition-transform duration-200 ease-out ${HOVER_SCALE}`}
                    style={{ width: CREST_SIZE, height: CREST_SIZE, marginLeft: -CREST_OVERHANG + CREST_SHIFT }}
                  >
                    <Image
                      src={crest}
                      alt=""
                      width={652}
                      height={655}
                      sizes={`${CREST_SIZE}px`}
                      draggable={false}
                      className="h-full w-full object-contain"
                      style={{ width: CREST_SIZE, height: CREST_SIZE }}
                    />
                    {activeCards.length > 0 ? <ActiveCardBadge count={activeCards.length} /> : null}
                  </span>
                ) : (
                  <span
                    className={`relative z-30 grid shrink-0 origin-center place-items-center transition-transform duration-200 ease-out ${HOVER_SCALE}`}
                    style={{
                      width: ICON_SIZE,
                      height: ICON_SIZE,
                      marginLeft: CREST_SIZE / 2 - CREST_OVERHANG - ICON_SIZE / 2 + CREST_SHIFT,
                    }}
                  >
                    <Landmark
                      className="h-full w-full"
                      style={active ? { color: "#379806" } : { color: district.tint }}
                    />
                    {activeCards.length > 0 ? <ActiveCardBadge count={activeCards.length} compact /> : null}
                  </span>
                )}
              </DistrictButton>
            );
          })}
        </div>

        {showLeave ? (
          <RailButton label={leaveLabel} active={false} onClick={onLeave}>
            <Undo2 className="h-5 w-5" />
          </RailButton>
        ) : null}
      </div>
    </nav>
  );
}

function ActiveCardBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute z-40 flex items-center justify-center rounded-full border border-accent-gold bg-background-dark text-accent-gold shadow-md ${
        compact ? "-right-2 -top-2 h-3.5 w-3.5" : "right-0 top-0 h-5 w-5"
      }`}
      aria-hidden
    >
      <AlertTriangle className={compact ? "h-2 w-2" : "h-3 w-3"} strokeWidth={2.5} />
      <span className="sr-only">{count} aktive Stadtereignisse</span>
    </span>
  );
}

function DistrictButton({
  label,
  active,
  compact,
  activeCards = [],
  onClick,
  onHoverChange,
  children,
}: {
  label: string;
  active: boolean;
  compact: boolean;
  activeCards?: ActiveCityCardEffect[];
  onClick: () => void;
  onHoverChange?: (hot: boolean) => void;
  children: ReactNode;
}) {
  const [hot, setHot] = useState(false);
  const revealed = active || hot;
  const plaque = plaqueLabel(label);
  const plaqueLeft =
    (compact
      ? CREST_SIZE / 2 - CREST_OVERHANG + ICON_SIZE / 2 - 8
      : CREST_SIZE - CREST_OVERHANG - PLAQUE_OVERLAP) + CREST_SHIFT;

  function setHover(next: boolean) {
    setHot(next);
    onHoverChange?.(next);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={
        activeCards.length > 0
          ? `${label}. Aktive Ereignisse: ${activeCards.map((card) => card.title).join(", ")}`
          : label
      }
      aria-pressed={active}
      className={`group relative z-10 flex w-full shrink-0 items-center overflow-visible ${
        compact ? "justify-start" : "py-0.5"
      }`}
      style={compact ? { height: ICON_BUTTON } : undefined}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 z-30"
        style={{
          left: plaqueLeft,
          width: PLAQUE_WIDTH,
          height: PLAQUE_HEIGHT,
          transformOrigin: "left center",
          transform: revealed ? "translateY(-50%) scaleX(1)" : "translateY(-50%) scaleX(0)",
          opacity: revealed ? 1 : 0,
          transitionProperty: "opacity, transform",
          transitionDuration: "320ms",
          transitionTimingFunction: "ease-out",
          transitionDelay: revealed && !active ? "500ms" : "0ms",
        }}
      >
        <Image
          src={PLAQUE_SRC}
          alt=""
          width={990}
          height={294}
          sizes={`${PLAQUE_WIDTH}px`}
          draggable={false}
          className="h-full w-full max-w-none object-fill"
          style={{ width: PLAQUE_WIDTH, height: PLAQUE_HEIGHT }}
        />
        <span className="absolute inset-0 flex items-center justify-center px-3">
          <span
            className="whitespace-nowrap text-center font-cinzel font-bold uppercase leading-none text-white"
            style={{ fontFamily: "var(--font-cinzel), serif", fontSize: plaqueFontSize(plaque) }}
          >
            {plaque}
          </span>
        </span>
        {activeCards.length > 0 && hot ? (
          <span
            className="absolute left-1/2 top-full z-10 mt-1 w-max max-w-[14rem] -translate-x-1/2 rounded border border-accent-gold/70 bg-background-card px-2.5 py-1.5 shadow-xl"
          >
            <span className="block font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold">
              Aktive Stadtereignisse
            </span>
            <ul className="mt-1 space-y-0.5">
              {activeCards.map((card) => (
                <li key={card.id} className="font-libre text-[11px] leading-snug text-gray-100">
                  {card.title}
                </li>
              ))}
            </ul>
          </span>
        ) : null}
      </span>
    </button>
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`group relative z-10 grid h-11 w-full shrink-0 place-items-center ${
        active
          ? "bg-hero-vibrant/20 text-hero-vibrant"
          : "bg-transparent text-gray-300 hover:bg-emerald-950 hover:text-hero-vibrant"
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-full z-20 ml-2 whitespace-nowrap rounded border border-hero-border/60 bg-background-card px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
      {children}
    </button>
  );
}
