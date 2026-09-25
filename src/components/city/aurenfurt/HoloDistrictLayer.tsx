"use client";

import { AURENFURT_DISTRICTS, PALACE_DISTRICT, type CityDistrictId } from "./aurenfurt-districts";
import { CITY_CENTER, PALACE_RADIUS, RING_RADII, WALL_RADIUS, polarToCartesian } from "./aurenfurt-layout";

type Props = {
  focusedId: CityDistrictId | null;
  zoomed: boolean;
  onSelect: (id: CityDistrictId) => void;
};

export function HoloDistrictLayer({ focusedId, zoomed, onSelect }: Props) {
  return (
    <svg viewBox="0 0 1000 1000" className="absolute inset-0 h-full w-full" role="img" aria-label="Holografische Karte von Aurenfurt">
      <defs>
        <radialGradient id="aurenfurt-dome" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff4c2" />
          <stop offset="45%" stopColor="#e2b423" />
          <stop offset="100%" stopColor="#6a4a10" />
        </radialGradient>
        <filter id="aurenfurt-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {RING_RADII.map((radius) => (
        <circle
          key={radius}
          cx={CITY_CENTER.x}
          cy={CITY_CENTER.y}
          r={radius}
          fill="none"
          stroke="rgba(120, 220, 255, 0.28)"
          strokeWidth={radius === WALL_RADIUS ? 8 : 1.5}
        />
      ))}

      {[0, 45, 90, 135].map((angle) => {
        const end = polarToCartesian(angle, WALL_RADIUS - 8);
        return (
          <line
            key={angle}
            x1={CITY_CENTER.x}
            y1={CITY_CENTER.y}
            x2={end.x}
            y2={end.y}
            stroke="rgba(180, 240, 255, 0.22)"
            strokeWidth="2"
          />
        );
      })}

      {AURENFURT_DISTRICTS.map((district) => {
        const active = focusedId === district.id;
        const dimmed = focusedId != null && !active;
        return (
          <g key={district.id}>
            <path
              d={district.path}
              fill={district.tint}
              stroke={district.stroke}
              strokeWidth={active ? 4 : 1.5}
              opacity={dimmed ? 0.35 : 1}
              filter={active ? "url(#aurenfurt-glow)" : undefined}
              className="cursor-pointer transition-opacity"
              onClick={() => onSelect(district.id)}
            >
              <title>{district.name}</title>
            </path>
            <text
              x={district.label.x}
              y={district.label.y}
              textAnchor="middle"
              className="pointer-events-none fill-white font-barlow text-[22px] font-bold uppercase"
              style={{ letterSpacing: "0.08em" }}
            >
              {district.name}
            </text>
            {zoomed && active
              ? district.locations.map((place) => (
                  <g key={place.id} className="pointer-events-none">
                    <circle cx={place.x} cy={place.y} r="7" fill={district.stroke} />
                    <text
                      x={place.x}
                      y={place.y - 14}
                      textAnchor="middle"
                      className="fill-accent-gold font-cinzel text-[16px]"
                    >
                      {place.name}
                    </text>
                  </g>
                ))
              : null}
          </g>
        );
      })}

      <g className="cursor-pointer" onClick={() => onSelect("palast")}>
        <circle
          cx={CITY_CENTER.x}
          cy={CITY_CENTER.y}
          r={PALACE_RADIUS}
          fill="url(#aurenfurt-dome)"
          stroke={PALACE_DISTRICT.stroke}
          strokeWidth={focusedId === "palast" ? 5 : 2}
          opacity={focusedId != null && focusedId !== "palast" ? 0.45 : 1}
        />
        <text
          x={CITY_CENTER.x}
          y={CITY_CENTER.y + 6}
          textAnchor="middle"
          className="pointer-events-none fill-background-dark font-barlow text-[20px] font-extrabold uppercase"
        >
          Palast
        </text>
        {zoomed && focusedId === "palast" ? (
          <text
            x={CITY_CENTER.x}
            y={CITY_CENTER.y - 28}
            textAnchor="middle"
            className="pointer-events-none fill-background-dark font-cinzel text-[14px]"
          >
            Goldene Kuppel
          </text>
        ) : null}
      </g>
    </svg>
  );
}
