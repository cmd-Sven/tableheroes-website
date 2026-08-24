/**
 * StageLootCoinBurst — Animated coin burst when a stage chest opens.
 */
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

export function StageLootCoinBurst({ burstKey }: { burstKey: number }) {
  const coins = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        id: `${burstKey}-${i}`,
        delay: i * 0.035,
        x: Math.sin(i * 2.9) * 72 + ((i % 4) - 1.5) * 22,
        endY: 88 + (i % 6) * 16,
        rot: (i % 8) * 45 - 90,
      })),
    [burstKey],
  );

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-[35] h-0 w-0 -translate-x-1/2 -translate-y-1/2 overflow-visible">
      {coins.map((c) => (
        <motion.span
          key={c.id}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.35, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: c.x,
            y: c.endY,
            scale: [0.35, 1.05, 1],
            rotate: c.rot,
          }}
          transition={{
            delay: c.delay,
            duration: 0.9,
            times: [0, 0.12, 0.62, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/90 bg-linear-to-br from-amber-100 via-yellow-400 to-amber-800 shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
        />
      ))}
    </div>
  );
}
