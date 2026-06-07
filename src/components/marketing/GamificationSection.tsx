"use client";

import { motion, Variants } from "framer-motion";
import Image from "next/image";

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
      className="relative scroll-mt-20 bg-background-dark py-16 overflow-hidden"
      style={{
        backgroundImage: "url('/images/glory-group-tavern.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundAttachment: "scroll",
      }}
    >
      {/* Dunkle Maske über dem Hintergrundbild mit radialem Verlauf (Vignette) */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)",
        }}
      />
      
      <div className="relative mx-auto max-w-6xl px-6 z-10">
        <div>
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="marketing-section-h2"
            >
              Deine Reise als Held
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-libre text-gray-200 leading-relaxed text-center max-w-3xl mx-auto mb-8"
          >
            Bei TableHeroes zählt jede Aktion. Werde Teil der Legende und lass
            dich für dein Spiel belohnen.
          </motion.p>

          <motion.div
            className="mt-8 grid gap-6 md:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Säule 1: Punkte sammeln */}
            <motion.div
              className="community-card relative cursor-pointer"
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -10,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <div className="p-10 relative">
                <Image
                  src="/images/icons/points-icon.webp"
                  alt="Icon für Punkte und Belohnungen"
                  width={120}
                  height={120}
                  className="absolute -top-5 -left-5 max-w-[120px] max-h-[120px] w-auto h-auto z-10"
                  style={{ height: "auto" }}
                />
                <div className="flex items-start gap-4 mb-4" style={{ marginLeft: "100px", marginTop: "10px" }}>
                  <h3 className="font-cinzel font-bold text-xl text-white">
                    Punkte für Präsenz
                  </h3>
                </div>
                <p className="font-libre text-white leading-relaxed">
                  Für jede Teilnahme an Spieleabenden – ob online oder vor Ort –
                  sammelst du wertvolle Punkte. Je mehr du spielst, desto mehr
                  Belohnungen warten auf dich.
                </p>
              </div>
            </motion.div>

            {/* Säule 2: Achievements */}
            <motion.div
              className="community-card relative cursor-pointer"
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -10,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <div className="p-10 relative">
                <Image
                  src="/images/icons/ehre-icon.webp"
                  alt="Icon für Ruhm und Ehre"
                  width={120}
                  height={120}
                  className="absolute -top-5 -left-5 max-w-[120px] max-h-[120px] w-auto h-auto z-10"
                  style={{ height: "auto" }}
                />
                <div className="flex items-start gap-4 mb-4" style={{ marginLeft: "100px", marginTop: "10px" }}>
                  <h3 className="font-cinzel font-bold text-xl text-white">
                    Ruhm & Ehre
                  </h3>
                </div>
                <p className="font-libre text-white leading-relaxed">
                  Erreiche besondere Achievements für außergewöhnliche Aktionen
                  oder langjährige Treue. Zeige deine Erfolge und werde zur
                  Legende.
                </p>
              </div>
            </motion.div>

            {/* Säule 3: Goodies */}
            <motion.div
              className="community-card relative cursor-pointer"
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -10,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <div className="p-10 relative">
                <Image
                  src="/images/icons/blackmarket-icon.webp"
                  alt="Icon für Marktplatz und Belohnungen"
                  width={120}
                  height={120}
                  className="absolute -top-5 -left-5 max-w-[120px] max-h-[120px] w-auto h-auto z-10"
                  style={{ height: "auto" }}
                />
                <div className="flex items-start gap-4 mb-4" style={{ marginLeft: "100px", marginTop: "10px" }}>
                  <h3 className="font-cinzel font-bold text-xl text-white">
                    Der Schwarzmarkt
                  </h3>
                </div>
                <p className="font-libre text-white leading-relaxed">
                  Tausche deine gesammelten Punkte gegen physische Goodies wie
                  Würfel und Sticker oder digitale Pakete mit Maps und
                  Abenteuer-PDFs.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Goldene, sich wiederholende Border zwischen Sektionen */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4" style={{ zIndex: 4 }}>
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
