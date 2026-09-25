"use client";

import { motion } from "framer-motion";
import { Hexagon } from "lucide-react";

type Props = {
  onEnter: () => void;
};

export function HoloCityEnterButton({ onEnter }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onEnter}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-lg border border-cyan-200/70 bg-cyan-400/10 px-5 py-3 font-barlow text-sm font-extrabold uppercase tracking-[0.18em] text-cyan-50 shadow-[0_0_24px_rgba(80,220,255,0.35)]"
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(180,245,255,0.35)_48%,transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
      <Hexagon className="h-5 w-5 text-cyan-200" />
      Stadt betreten
    </motion.button>
  );
}
