"use client";

import { motion } from "framer-motion";
import { ScrollText, Sparkles, Users } from "lucide-react";

export function FeatureWorldBuilding() {
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
          <ScrollText className="h-5 w-5 text-accent-gold" aria-hidden />
        </div>
        <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-0">
          Erschaffe Welten
        </h3>
      </div>

      <p className="font-libre text-gray-200 leading-relaxed">
        Baue Lore, Orte, Fraktionen und Geheimnisse so auf, dass du sie am Tisch
        in Sekunden findest. Mit NPC-Verknüpfungen und KI-Unterstützung für
        schnelle Inspiration, wenn die Gruppe „links“ abbiegt.
      </p>

      <ul className="mt-5 space-y-3 font-libre text-gray-200">
        <li className="flex items-start gap-2">
          <Sparkles className="mt-1 h-4 w-4 text-hero-vibrant" aria-hidden />
          <span>
            KI-Impulse für Namen, Motive und Plots – stiltreu &amp; kurz
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Users className="mt-1 h-4 w-4 text-hero-vibrant" aria-hidden />
          <span>NPCs mit Beziehungen, Zielen und sauberen Notizen</span>
        </li>
      </ul>
    </motion.div>
  );
}




