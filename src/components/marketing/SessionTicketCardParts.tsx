"use client";

import { motion } from "framer-motion";

export function SlotProgressBar({
  current,
  max,
  label,
  registrationClosedOnLanding,
  showOpenSlotsOnLanding,
}: {
  current: number;
  max: number;
  label: string;
  registrationClosedOnLanding?: boolean;
  showOpenSlotsOnLanding?: boolean;
}) {
  if (registrationClosedOnLanding) {
    return (
      <div className="rounded border border-amber-700/40 bg-amber-950/25 px-3 py-2">
        <p className="font-barlow text-[11px] font-bold uppercase leading-snug tracking-wide text-amber-200/95">
          {label}
        </p>
      </div>
    );
  }

  if (showOpenSlotsOnLanding === false) {
    return (
      <div className="rounded border border-hero-border/30 bg-black/25 px-3 py-2">
        <p className="font-barlow text-[10px] font-bold uppercase leading-snug tracking-wide text-gray-500">
          Plätze werden nicht öffentlich angezeigt
        </p>
      </div>
    );
  }

  const isFull = max > 0 && current >= max;
  const isAlmostFull = max > 0 && current === max - 1;
  const percent = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  let barColor = "bg-accent-gold";
  let textColor = "text-gray-400";
  if (isFull) {
    barColor = "bg-red-500";
    textColor = "text-red-400";
  } else if (isAlmostFull) {
    barColor = "bg-amber-500";
    textColor = "text-accent-gold";
  }

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`font-barlow text-xs font-bold uppercase ${textColor}`}>{label}</span>
      </div>
      {max > 0 ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/[0.04] bg-white/[0.06]">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            whileInView={{ width: `${percent}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            style={{
              boxShadow: isFull
                ? "0 0 6px rgba(239,68,68,0.5)"
                : "0 0 6px rgba(202,185,38,0.4)",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
