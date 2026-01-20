"use client";

import { motion, Variants } from "framer-motion";
import { Trophy, Coins, Gift } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export function GamificationSection() {
  return (
    <section
      id="gamification"
      className="relative scroll-mt-20 bg-background-dark py-16"
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 text-center md:text-left">
            Deine Reise als Held
          </h2>
          <p className="font-libre text-gray-200 leading-relaxed text-center md:text-left max-w-3xl mb-8">
            Bei TableHeroes zählt jede Aktion. Werde Teil der Legende und lass
            dich für dein Spiel belohnen.
          </p>

          <motion.div
            className="mt-8 grid gap-6 md:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Säule 1: Punkte sammeln */}
            <motion.div
              className="relative rounded-md border border-amber-700/50 bg-stone-50 p-6 shadow-lg cursor-pointer"
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -10,
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
                borderColor: "rgba(217, 119, 6, 0.8)",
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-amber-700/30 bg-amber-50">
                <Coins className="h-5 w-5 text-amber-800" aria-hidden />
              </div>
              <h3 className="font-cinzel font-bold text-xl text-stone-900 mb-2">
                Punkte für Präsenz
              </h3>
              <p className="font-libre text-stone-700 leading-relaxed">
                Für jede Teilnahme an Spieleabenden – ob online oder vor Ort –
                sammelst du wertvolle Punkte. Je mehr du spielst, desto mehr
                Belohnungen warten auf dich.
              </p>
            </motion.div>

            {/* Säule 2: Achievements */}
            <motion.div
              className="relative rounded-md border border-amber-700/50 bg-stone-50 p-6 shadow-lg cursor-pointer"
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -10,
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
                borderColor: "rgba(217, 119, 6, 0.8)",
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-amber-700/30 bg-amber-50">
                <Trophy className="h-5 w-5 text-amber-800" aria-hidden />
              </div>
              <h3 className="font-cinzel font-bold text-xl text-stone-900 mb-2">
                Ruhm & Ehre
              </h3>
              <p className="font-libre text-stone-700 leading-relaxed">
                Erreiche besondere Achievements für außergewöhnliche Aktionen
                oder langjährige Treue. Zeige deine Erfolge und werde zur
                Legende.
              </p>
            </motion.div>

            {/* Säule 3: Goodies */}
            <motion.div
              className="relative rounded-md border border-amber-700/50 bg-stone-50 p-6 shadow-lg cursor-pointer"
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -10,
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
                borderColor: "rgba(217, 119, 6, 0.8)",
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-amber-700/30 bg-amber-50">
                <Gift className="h-5 w-5 text-amber-800" aria-hidden />
              </div>
              <h3 className="font-cinzel font-bold text-xl text-stone-900 mb-2">
                Der Schwarzmarkt
              </h3>
              <p className="font-libre text-stone-700 leading-relaxed">
                Tausche deine gesammelten Punkte gegen physische Goodies wie
                Würfel und Sticker oder digitale Pakete mit Maps und
                Abenteuer-PDFs.
              </p>
            </motion.div>
          </motion.div>
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
