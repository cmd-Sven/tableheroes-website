"use client";

import { motion } from "framer-motion";
import { Calendar, Heart, MessageCircle } from "lucide-react";

export function CommunitySection() {
  return (
    <section
      id="community"
      className="scroll-mt-20 bg-background-dark border-b border-hero-border/30"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8">
            Das Herz von TableHeroes: Unsere Community
          </h2>
          <p className="font-libre text-gray-200 leading-relaxed">
            Bei uns geht es um Menschen, nicht um Plattformen. Wir treffen uns regelmäßig in Osnabrück, 
            organisieren Events und tauschen uns auf Discord aus. Komm dazu – egal ob du neu im Hobby bist 
            oder schon ewig würfelst.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-md border border-hero-border/40 bg-background-card p-6 shadow-lg">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-hero-border/40 bg-background-dark">
                <Heart className="h-5 w-5 text-accent-gold" aria-hidden />
              </div>
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
                Stammtisch in Osnabrück
              </h3>
              <p className="font-libre text-gray-200 leading-relaxed">
                Jeden ersten Donnerstag im Monat treffen wir uns in Osnabrück zum gemütlichen Austausch.
              </p>
            </div>

            <div className="rounded-md border border-hero-border/40 bg-background-card p-6 shadow-lg">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-hero-border/40 bg-background-dark">
                <Calendar className="h-5 w-5 text-accent-gold" aria-hidden />
              </div>
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
                Events & One-Shots
              </h3>
              <p className="font-libre text-gray-200 leading-relaxed">
                Von Halloween-Specials bis zu spontanen Runden – bei uns ist immer was los.
              </p>
            </div>

            <div className="rounded-md border border-hero-border/40 bg-background-card p-6 shadow-lg">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-hero-border/40 bg-background-dark">
                <MessageCircle
                  className="h-5 w-5 text-accent-gold"
                  aria-hidden
                />
              </div>
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
                Discord Community
              </h3>
              <p className="font-libre text-gray-200 leading-relaxed">
                Finde Mitspieler, teile Builds und tausch dich über deine Lieblingssysteme aus.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <a
              href="https://discord.gg/tableheroes"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-hero-border/60 bg-background-card px-6 py-3 font-barlow font-bold uppercase text-gray-100 transition-colors hover:bg-background-card/80"
            >
              Zum Discord Server
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
