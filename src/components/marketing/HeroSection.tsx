"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section
      id="hero"
      className="scroll-mt-20 bg-background-dark border-b border-hero-border/30"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center"
        >
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hero-border/40 bg-background-card/40 px-4 py-2">
              <Sparkles className="h-4 w-4 text-accent-gold" aria-hidden />
              <span className="font-barlow font-bold uppercase tracking-wide text-accent-gold">
                Osnabrück • Online & Präsenz
              </span>
            </div>

            <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
              Dein Pen &amp; Paper Treffpunkt in Osnabrück
            </h1>

            <p className="mt-6 font-libre text-gray-200 leading-relaxed text-lg">
              Wir bringen Spieler und Spielleiter zusammen. Digital organisiert, analog erlebt. 
              Finde deine Gruppe und werde Teil der TableHeroes-Gemeinschaft.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-hero-border bg-hero-vibrant px-6 py-3 font-barlow font-bold uppercase text-background-dark shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-hero-border"
              >
                Community beitreten <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="https://discord.gg/tableheroes"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-hero-border/60 bg-background-card px-6 py-3 font-barlow font-bold uppercase text-gray-100 transition-colors hover:bg-background-card/80"
              >
                Zum Discord
              </a>
            </div>
          </div>

          <div className="rounded-md border border-hero-border/40 bg-background-card p-6 shadow-lg">
            <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
              Was uns ausmacht
            </h3>
            <p className="font-libre text-gray-200 leading-relaxed">
              Bei TableHeroes geht es um Menschen, Geschichten und gemeinsame Abenteuer – 
              nicht um Regeln und Plattformen.
            </p>
            <ul className="mt-6 space-y-3 font-libre text-gray-200">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-accent-gold" />
                <span>Offene Community für Anfänger und Veteranen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-accent-gold" />
                <span>Regelmäßige Runden in Osnabrück &amp; Online</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-accent-gold" />
                <span>Stammtisch, Events und Discord für Austausch</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
