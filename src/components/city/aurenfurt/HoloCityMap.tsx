"use client";

import { HoloCityOverlay } from "./HoloCityOverlay";
import { HoloCityStage } from "./HoloCityStage";
import { useHoloCityView } from "./hooks/useHoloCityView";
import { useHoloTilt } from "./hooks/useHoloTilt";

type Props = {
  onLeave: () => void;
};

export function HoloCityMap({ onLeave }: Props) {
  const view = useHoloCityView();
  const tilt = useHoloTilt();

  return (
    <section className="relative overflow-hidden rounded-lg border border-cyan-200/30 bg-[#02080c] p-4 shadow-[0_0_40px_rgba(55,200,255,0.15)]">
      <HoloCityOverlay district={view.focused} onClose={view.clear} onLeave={onLeave} />
      <HoloCityStage
        camera={view.camera}
        tilt={tilt.tilt}
        focusedId={view.focusedId}
        onSelect={view.focus}
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.reset}
      />
    </section>
  );
}
