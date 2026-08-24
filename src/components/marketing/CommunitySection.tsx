"use client";

import { motion, useScroll, useTransform, useSpring, Variants } from "framer-motion";
import { useRef } from "react";
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
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export function CommunitySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Parallax-Effekt: Bild bewegt sich stärker beim Scrollen
  const backgroundY = useTransform<number, string>(scrollYProgress, [0, 1], ["-15%", "15%"]);

  // Smoothing für butterweiche Bewegung
  const smoothY = useSpring(backgroundY, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <section
      ref={sectionRef}
      id="community"
      className="relative scroll-mt-20 min-h-[600px] overflow-hidden"
    >
      {/* Parallax-Hintergrundbild */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{
          y: smoothY,
          scale: 1.15,
          willChange: "transform",
        }}
      >
        <Image
          src="/images/roleplay-table.webp"
          alt="Rollenspiel-Tisch Hintergrund"
          fill
          className="object-cover"
          quality={85}
          sizes="100vw"
        />
      </motion.div>

      {/* Dunkelgrüne Maske mit Gradient */}
      <div className="absolute inset-0 -z-[5] bg-gradient-to-b from-black/60 via-emerald-950/90 to-black/60 mix-blend-multiply pointer-events-none" />

      {/* Dekorative Eck-Grafiken */}
      {/* Oben Links: Dragon */}
      <div className="absolute top-0 left-0 -z-[5] pointer-events-none hidden md:block">
        <Image
          src="/images/corner-dragon-only.webp"
          alt=""
          width={100}
          height={100}
          className="max-w-[100px] h-auto"
          style={{ height: "auto" }}
        />
      </div>

      {/* Unten Links: Skull (horizontal gespiegelt) */}
      <div className="absolute bottom-0 left-0 -z-[5] pointer-events-none hidden md:block">
        <Image
          src="/images/skull-corner-only.webp"
          alt=""
          width={70}
          height={70}
          className="w-[70px] h-auto scale-x-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      {/* Oben Rechts: Skull (vertikal gespiegelt) */}
      <div className="absolute top-0 right-0 -z-[5] pointer-events-none hidden md:block">
        <Image
          src="/images/skull-corner-only.webp"
          alt=""
          width={70}
          height={70}
          className="w-[70px] h-auto scale-y-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      {/* Unten Rechts: Claw (horizontal gespiegelt) */}
      <div className="absolute bottom-0 right-0 -z-[5] pointer-events-none hidden md:block">
        <Image
          src="/images/corner-claw-only.webp"
          alt=""
          width={100}
          height={100}
          className="max-w-[100px] h-auto scale-x-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div>
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="marketing-section-h2"
            >
              Das Herz von TableHeroes: Unsere Community
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-libre text-emerald-50 leading-relaxed text-center max-w-3xl mx-auto"
          >
            Bei uns geht es um Menschen, nicht um Plattformen. Wir treffen uns
            regelmäßig in Osnabrück, organisieren Events und tauschen uns auf
            Discord aus. Komm dazu – egal ob du neu im Hobby bist oder schon
            ewig würfelst.
          </motion.p>

          <motion.div
            className="mt-8 grid gap-6 md:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
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
                  src="/images/icons/party-icon.webp"
                  alt="Icon für Spielrunden und Events"
                  width={120}
                  height={120}
                  className="absolute -top-5 -left-5 max-w-[120px] max-h-[120px] w-auto h-auto z-10"
                  style={{ height: "auto" }}
                />
                <div className="flex items-start gap-4 mb-4" style={{ marginLeft: "100px", marginTop: "10px" }}>
                  <h3 className="font-cinzel font-bold text-xl text-white">
                    Regelmäßige Spielrunden und Events.
                  </h3>
                </div>
                <p className="font-libre text-white leading-relaxed">
                  Jede Woche mehrere Runden Pen & Paper. Für Neulinge, alte Hasen
                  und Enthusiasten. Hier kommt jeder auf seine Kosten. Als
                  Highlight haben wir auch besondere Runden zu Halloween oder
                  anderen feierlichen Anlässen.
                </p>
              </div>
            </motion.div>

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
                  src="/images/icons/bogen-icon.webp"
                  alt="Icon für Kampagnen und Abenteuer"
                  width={120}
                  height={120}
                  className="absolute -top-5 -left-5 max-w-[120px] max-h-[120px] w-auto h-auto z-10"
                  style={{ height: "auto" }}
                />
                <div className="flex items-start gap-4 mb-4" style={{ marginLeft: "100px", marginTop: "10px" }}>
                  <h3 className="font-cinzel font-bold text-xl text-white">
                    Tutorials & One-Shots
                  </h3>
                </div>
                <p className="font-libre text-white leading-relaxed">
                  Erstmal rein schnuppern? Mit passenden Tutorial Runden bieten
                  wir viel Infostoff über Discord oder regelmäßigen
                  Online-Terminen wo du all Deine Fragen loswerden kannst. Du hast
                  nicht viel Zeit? Dann probiere doch ein One Shot Abenteuer aus!
                </p>
              </div>
            </motion.div>

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
                  src="/images/icons/chat-icon.webp"
                  alt="Icon für Community und Austausch"
                  width={120}
                  height={120}
                  className="absolute -top-5 -left-5 max-w-[120px] max-h-[120px] w-auto h-auto z-10"
                  style={{ height: "auto" }}
                />
                <div className="flex items-start gap-4 mb-4" style={{ marginLeft: "100px", marginTop: "10px" }}>
                  <h3 className="font-cinzel font-bold text-xl text-white">
                    Discord Community
                  </h3>
                </div>
                <p className="font-libre text-white leading-relaxed">
                  Finde Mitspieler, teile Builds und tausch dich über deine
                  Lieblingssysteme aus. Auf unseren Discord findet ihr Infos und Links zu wichtigen Themen rund um Euer Spiel oder nehmt an unseren Diskussionen oder Text-Adventures teil!
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
            backgroundImage: "url('/images/border_top-bottom_gold.webp')",
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "bottom center",
          }}
        />
      </div>
    </section>
  );
}
