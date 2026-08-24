/**
 * LiveSessionWeatherEffects — Animated sun, rain, snow, and lightning overlays on the stage.
 */
"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { RAIN_DROPS } from "./live-session-weather";

type Props = {
  weatherCondition: "storm" | "rain" | "snow" | "sun" | "none";
  lightningPulseKey: number;
};

export function LiveSessionWeatherEffects({ weatherCondition, lightningPulseKey }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {weatherCondition === "sun" ? (
        <div className="absolute right-0 top-0 h-64 w-72">
          {[0, 1, 2, 3].map((idx) => (
            <motion.div
              key={idx}
               className="absolute rounded-full bg-amber-100/20 blur-2xl mix-blend-screen"
              style={{
                width: 90 + idx * 28,
                height: 90 + idx * 28,
                right: `${idx * 12}%`,
                top: `${idx * 10}%`,
              }}
              animate={{
                rotate: [0, 12, 0],
                scale: [1, 1.08, 1],
                x: [0, -8 + idx * 2, 0],
                y: [0, 6 - idx * 2, 0],
              }}
              transition={{
                duration: 18 + idx * 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      ) : null}
      {weatherCondition === "rain" || weatherCondition === "storm" ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {RAIN_DROPS.map((drop) => (
            <motion.span
              key={drop.id}
              aria-hidden="true"
              className="absolute top-[-12%] block w-0.5 rounded-full bg-sky-100/70 shadow-[0_0_5px_rgba(186,230,253,0.65)]"
              style={
                {
                  left: drop.left,
                  height: drop.height,
                  opacity: drop.opacity,
                } as CSSProperties
              }
              animate={{
                x: [0, drop.drift],
                y: ["0vh", "118vh"],
              }}
              transition={{
                duration: drop.duration,
                delay: drop.delay,
                ease: "linear",
                repeat: Infinity,
              }}
            />
          ))}
        </div>
      ) : null}
      {weatherCondition === "snow" ? <div className="th-weather-snow" /> : null}
      {weatherCondition === "storm" ? (
        <motion.div
          key={lightningPulseKey}
          aria-hidden="true"
          className="absolute inset-0 bg-white mix-blend-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.42, 0] }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        />
      ) : null}
    </div>
  );
}
