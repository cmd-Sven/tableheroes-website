"use client";

import dynamic from "next/dynamic";
import { HoloOverlay } from "./HoloOverlay";
import { useHoloCityView } from "./hooks/useHoloCityView";

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
};

export function HoloCityMap({ onLeave }: Props) {
  const view = useHoloCityView();

  return (
    <section className="relative h-[min(82vh,900px)] min-h-[560px] overflow-hidden rounded-lg border border-cyan-200/30 bg-[#02080c] shadow-[0_0_40px_rgba(55,200,255,0.15)]">
      <div className="absolute inset-0">
        <HoloCityCanvas
          selection={view.selection}
          hovered={view.hovered}
          onSelect={view.focus}
          onHover={view.hover}
        />
      </div>
      <HoloOverlay
        subject={view.subject}
        hovered={view.hoveredSubject}
        selection={view.selection}
        onClose={() => view.focus(null)}
        onLeave={onLeave}
        onSelect={view.focus}
      />
    </section>
  );
}
