"use client";

import { motion } from "framer-motion";
import { Coins, Gift, Trophy } from "lucide-react";

export function FeatureGamification() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className="rounded-md border border-hero-border/40 bg-background-card p-6 shadow-lg"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-hero-border/40 bg-background-dark">
          <Trophy className="h-5 w-5 text-accent-gold" aria-hidden />
        </div>
        <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-0">
          Echter Loot &amp; Belohnungen
        </h3>
      </div>

      <p className="font-libre text-gray-200 leading-relaxed">
        Sammle Punkte, schalte Belohnungen frei und bringe das Gefühl von
        Fortschritt in den Alltag. Von digitalen Auszeichnungen bis zu
        physischen Goodies im Shop – verdient, nicht gekauft.
      </p>

      <ul className="mt-5 space-y-3 font-libre text-gray-200">
        <li className="flex items-start gap-2">
          <Coins className="mt-1 h-4 w-4 text-hero-vibrant" aria-hidden />
          <span>Punkte &amp; Meilensteine für die Kampagne</span>
        </li>
        <li className="flex items-start gap-2">
          <Gift className="mt-1 h-4 w-4 text-hero-vibrant" aria-hidden />
          <span>Belohnungen &amp; Goodies als Motivations-Highlights</span>
        </li>
      </ul>
    </motion.div>
  );
}




