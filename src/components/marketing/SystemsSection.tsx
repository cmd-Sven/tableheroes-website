"use client";

import { motion } from "framer-motion";
import { Dices, Skull, Sparkles, Swords } from "lucide-react";

const systems = [
  { name: "Dungeons & Dragons 5e", icon: Swords },
  { name: "Call of Cthulhu", icon: Skull },
  { name: "Pathfinder 2e", icon: Dices },
  { name: "Vampire: Die Maskerade", icon: Sparkles },
  { name: "Shadowrun", icon: Dices },
  { name: "Fate", icon: Sparkles },
];

export function SystemsSection() {
  return (
    <section
      id="systems"
      className="relative scroll-mt-20 bg-background-dark"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8">
            Was wir spielen
          </h2>
          <p className="font-libre text-gray-200 leading-relaxed">
            Von D&D bis Cthulhu – bei uns wird alles gespielt. Egal ob epische Fantasy, 
            kosmischer Horror oder Cyberpunk: Hauptsache, wir haben Spaß am Tisch.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {systems.map(({ name, icon: Icon }) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-md border border-hero-border/40 bg-background-card p-5 shadow-lg"
              >
                <div className="grid h-10 w-10 place-items-center rounded-md border border-hero-border/40 bg-background-dark">
                  <Icon className="h-5 w-5 text-accent-gold" aria-hidden />
                </div>
                <div>
                  <div className="font-barlow font-bold uppercase text-hero-vibrant">
                    {name}
                  </div>
                  <div className="font-libre text-gray-200 leading-relaxed text-sm">
                    Aktive Runden bei TableHeroes
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      {/* Goldene, sich wiederholende Border zwischen Sektionen */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 z-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "url('/images/border_top-bottom_gold.png')",
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "bottom center",
          }}
        />
      </div>
    </section>
  );
}


