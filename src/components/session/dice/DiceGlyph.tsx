"use client";

const SIDES = [4, 6, 8, 10, 12, 20] as const;
export type DiceGlyphSides = (typeof SIDES)[number];

function nearestGlyphSides(sides: number): DiceGlyphSides {
  if (SIDES.includes(sides as DiceGlyphSides)) return sides as DiceGlyphSides;
  return 20;
}

const PATHS: Record<DiceGlyphSides, string> = {
  4: "M12 3 L21 19 H3 Z",
  6: "M5 5 H19 V19 H5 Z",
  8: "M12 2 L22 12 L12 22 L2 12 Z",
  10: "M12 2 L20 10 L12 22 L4 10 Z",
  12: "M12 2 L21 8.5 L17.5 20 H6.5 L3 8.5 Z",
  20: "M12 2 L21 7.5 V16.5 L12 22 L3 16.5 V7.5 Z",
};

type Props = {
  sides: number;
  className?: string;
  title?: string;
};

export function DiceGlyph({ sides, className = "h-4 w-4", title }: Props) {
  const kind = nearestGlyphSides(sides);
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[kind]} />
    </svg>
  );
}
