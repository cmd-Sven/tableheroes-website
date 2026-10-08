"use client";

export type CitySurface = "map" | "dashboard";

type Props = {
  mode: CitySurface;
  onChange: (mode: CitySurface) => void;
};

export function CityViewSwitch({ mode, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Darstellung der Stadt"
      className="pointer-events-auto inline-flex rounded-md border border-hero-border/70 bg-background-dark/95 p-0.5 shadow-lg backdrop-blur-md"
    >
      {(
        [
          ["map", "Stadtansicht"],
          ["dashboard", "Dashboard"],
        ] as const
      ).map(([id, label]) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`rounded px-3 py-1.5 font-barlow text-[11px] font-bold uppercase tracking-wide ${
              active ? "bg-hero-vibrant text-white" : "text-gray-300 hover:text-white"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
