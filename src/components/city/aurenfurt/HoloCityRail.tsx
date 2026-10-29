"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { GraduationCap, Undo2 } from "lucide-react";
import {
  AURENFURT_DISTRICTS,
  type CityDistrictId,
  type HoloSelection,
  type SimSubject,
} from "./aurenfurt-districts";
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

const DISTRICT_CREST: Partial<Record<CityDistrictId, string>> = {
  adelsviertel: "/images/city/adelsviertel.png",
  tempelbezirk: "/images/city/tempelbezirk.png",
  handwerkerviertel: "/images/city/handwerkerviertel.png",
  palast: "/images/city/palast.png",
  suedtor: "/images/city/suedtor.png",
  unterstadt: "/images/city/unterstadt.png",
};

type Props = {
  selection: HoloSelection | null;
  subject: SimSubject | null;
  sim: SimProfile;
  scopeLabel: string;
  onSelect: (selection: HoloSelection) => void;
  onLeave: () => void;
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

export function HoloCityRail({ selection, subject, onSelect, onLeave }: Props) {
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
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-visible pt-[148px]">
        <div className="flex min-h-0 flex-1 flex-col overflow-visible">
          {AURENFURT_DISTRICTS.map((district) => {
            const crest = DISTRICT_CREST[district.id];
            const active =
              (selection?.type === "district" && selection.id === district.id) ||
              (selection?.type === "building" && subject?.districtId === district.id) ||
              (selection?.type === "poi" && subject?.districtId === district.id);
            return (
              <DistrictButton
                key={district.id}
                label={district.name}
                active={active}
                compact={!crest}
                onClick={() => onSelect({ type: "district", id: district.id })}
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
                    <GraduationCap
                      className="h-full w-full"
                      style={active ? { color: "#379806" } : { color: district.tint }}
                    />
                  </span>
                )}
              </DistrictButton>
            );
          })}
        </div>

        <RailButton label="Zurück zur Lore" active={false} onClick={onLeave}>
          <Undo2 className="h-5 w-5" />
        </RailButton>
      </div>
    </nav>
  );
}

function DistrictButton({
  label,
  active,
  compact,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  compact: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const [hot, setHot] = useState(false);
  const revealed = active || hot;
  const plaque = plaqueLabel(label);
  const plaqueLeft =
    (compact
      ? CREST_SIZE / 2 - CREST_OVERHANG + ICON_SIZE / 2 - 8
      : CREST_SIZE - CREST_OVERHANG - PLAQUE_OVERLAP) + CREST_SHIFT;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`group relative z-10 flex w-full shrink-0 items-center overflow-visible ${
        compact ? "justify-start" : "py-0.5"
      }`}
      style={compact ? { height: ICON_BUTTON } : undefined}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 z-20"
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
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className="whitespace-nowrap text-center font-cinzel font-bold uppercase leading-none text-white"
            style={{ fontFamily: "var(--font-cinzel), serif", fontSize: plaqueFontSize(plaque) }}
          >
            {plaque}
          </span>
        </span>
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
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`group relative z-10 grid h-11 w-full shrink-0 place-items-center ${
        active
          ? "bg-hero-vibrant/20 text-hero-vibrant"
          : "bg-transparent text-gray-300 hover:bg-emerald-950 hover:text-hero-vibrant"
      }`}
    >
      <span className="pointer-events-none absolute left-full z-20 ml-2 whitespace-nowrap rounded border border-hero-border/60 bg-background-card px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
      {children}
    </button>
  );
}
