/**
 * MapDrawLayer — Freihändige Tinte auf der Schlachtkarte.
 * SVG-Striche wie Kreide auf der Folie — der SL zeichnet, die Gruppe folgt dem Fingerzeig.
 */
"use client";

import type { MapDrawPoint, SessionMapDrawStroke } from "@/src/lib/session/map-draw-types";

type Props = {
  strokes: SessionMapDrawStroke[];
  /** Live stroke while GM is drawing */
  draftPoints?: MapDrawPoint[] | null;
  draftColor?: string;
  draftWidth?: number;
  mapWidth: number;
  mapHeight: number;
  className?: string;
};

function pointsToPath(points: MapDrawPoint[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

export function MapDrawLayer({
  strokes,
  draftPoints,
  draftColor = "#cab926",
  draftWidth = 4,
  mapWidth,
  mapHeight,
  className = "",
}: Props) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 z-[42] ${className}`}
      width={mapWidth}
      height={mapHeight}
      viewBox={`0 0 ${mapWidth} ${mapHeight}`}
      aria-hidden
    >
      {strokes.map((s) => (
        <path
          key={s.id}
          d={pointsToPath(s.points)}
          fill="none"
          stroke={s.color}
          strokeWidth={s.stroke_width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.92}
        />
      ))}
      {draftPoints && draftPoints.length > 1 ? (
        <path
          d={pointsToPath(draftPoints)}
          fill="none"
          stroke={draftColor}
          strokeWidth={draftWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      ) : null}
    </svg>
  );
}
