"use client";

import { motion } from "framer-motion";
import { HoloDistrictLayer } from "./HoloDistrictLayer";
import type { CityDistrictId } from "./aurenfurt-districts";

type Camera = { scale: number; x: number; y: number };
type Tilt = { rotateX: number; rotateY: number };

type Props = {
  camera: Camera;
  tilt: Tilt;
  focusedId: CityDistrictId | null;
  onSelect: (id: CityDistrictId) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
};

export function HoloCityStage({
  camera,
  tilt,
  focusedId,
  onSelect,
  onPointerMove,
  onPointerLeave,
}: Props) {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-4xl [perspective:1400px]"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          scale: camera.scale,
          x: camera.x,
          y: camera.y,
        }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        <div className="absolute inset-[6%] rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute inset-0 rounded-full border border-cyan-200/30 bg-[#041018]/80 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,transparent_0%,rgba(80,220,255,0.08)_50%,transparent_100%)] bg-[length:100%_8px] opacity-70" />
          <HoloDistrictLayer focusedId={focusedId} zoomed={camera.scale > 1.2} onSelect={onSelect} />
        </div>
      </motion.div>
    </div>
  );
}
