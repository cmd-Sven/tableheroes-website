"use client";

import { motion } from "framer-motion";
import {
  natHighlightLabelDe,
  type DieNatHighlight,
} from "@/src/lib/session/dice-nat-highlight";

type Props = {
  kind: DieNatHighlight;
};

/**
 * Vollbild-Mood beim Reveal (opacity/transform only).
 * Crit: goldener Glow · Fumble: dunkler Rot-Flash + leichtes Shake.
 */
export function DiceRollMoodFx({ kind }: Props) {
  const isCrit = kind === "crit";

  return (
    <>
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: isCrit ? [0, 0.5, 0.22, 0] : [0, 0.72, 0.38, 0] }}
        transition={{ duration: 1.25, ease: "easeOut", times: [0, 0.12, 0.45, 1] }}
        style={{
          background: isCrit
            ? "radial-gradient(ellipse 85% 70% at 50% 42%, rgba(202,185,38,0.42) 0%, rgba(55,152,6,0.12) 45%, transparent 72%)"
            : "radial-gradient(ellipse 90% 75% at 50% 45%, rgba(88,24,13,0.55) 0%, rgba(10,31,16,0.88) 55%, rgba(10,31,16,0.95) 100%)",
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[11vh]"
        initial={{ opacity: 0, y: 16, scale: 0.9 }}
        animate={
          isCrit
            ? {
                opacity: [0, 1, 1, 0],
                y: [16, 0, -4, -10],
                scale: [0.9, 1.08, 1.02, 0.96],
              }
            : {
                opacity: [0, 1, 1, 0],
                y: [16, 0, -2, -8],
                x: [0, -7, 7, -5, 5, -2, 0],
                scale: [0.94, 1, 0.98, 0.94],
              }
        }
        transition={{ duration: 1.35, ease: "easeOut", times: [0, 0.18, 0.55, 1] }}
      >
        <p
          className={`rounded-md border px-4 py-2 text-center shadow-2xl ${
            isCrit
              ? "border-accent-gold/80 bg-background-dark/80 font-cinzel text-xl font-bold text-accent-gold"
              : "border-accent-blood/70 bg-background-dark/90 font-barlow text-lg font-bold uppercase text-accent-blood"
          }`}
          style={
            isCrit
              ? {
                  boxShadow:
                    "0 0 32px rgba(202,185,38,0.45), 0 8px 28px rgba(0,0,0,0.55)",
                }
              : {
                  boxShadow:
                    "0 0 28px rgba(88,24,13,0.55), 0 8px 24px rgba(0,0,0,0.6)",
                }
          }
        >
          {isCrit ? "⚡ " : "💀 "}
          {natHighlightLabelDe(kind)}
        </p>
      </motion.div>
    </>
  );
}
