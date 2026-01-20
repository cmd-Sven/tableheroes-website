"use client";

import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { Calendar, Heart, MessageCircle } from "lucide-react";

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
          src="/images/corner-dragon-only.png"
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
          src="/images/skull-corner-only.png"
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
          src="/images/skull-corner-only.png"
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
          src="/images/corner-claw-only.png"
          alt=""
          width={100}
          height={100}
          className="max-w-[100px] h-auto scale-x-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-barlow font-semibold text-2xl text-white border-b border-hero-border pb-2 mb-4 mt-8">
            Das Herz von TableHeroes: Unsere Community
          </h2>
          <p className="font-libre text-emerald-50 leading-relaxed">
            Bei uns geht es um Menschen, nicht um Plattformen. Wir treffen uns
            regelmäßig in Osnabrück, organisieren Events und tauschen uns auf
            Discord aus. Komm dazu – egal ob du neu im Hobby bist oder schon
            ewig würfelst.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <motion.div
              className="relative rounded-md border border-amber-700/50 bg-stone-50 p-6 shadow-lg cursor-pointer"
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
                <Heart className="h-5 w-5 text-amber-800" aria-hidden />
              </div>
              <h3 className="font-cinzel font-bold text-xl text-stone-900 mb-2">
                Regelmäßige Spielrunden und Events.
              </h3>
              <p className="font-libre text-stone-700 leading-relaxed">
                Jede Woche mehrere Runden Pen & Paper. Für Neulinge, alte Hasen
                und Enthusiasten. Hier kommt jeder auf seine Kosten. Als
                Highlight haben wir auch besondere Runden zu Halloween oder
                anderen feierlichen Anlässen.
              </p>
            </motion.div>

            <motion.div
              className="relative rounded-md border border-amber-700/50 bg-stone-50 p-6 shadow-lg cursor-pointer"
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
                <Calendar className="h-5 w-5 text-amber-800" aria-hidden />
              </div>
              <h3 className="font-cinzel font-bold text-xl text-stone-900 mb-2">
                Tutorials & One-Shots
              </h3>
              <p className="font-libre text-stone-700 leading-relaxed">
                Erstmal rein schnuppern? Mit passenden Tutorial Runden bieten
                wir viel Infostoff über Discord oder regelmäßigen
                Online-Terminen wo du all Deine Fragen loswerden kannst. Du hast
                nicht viel Zeit? Dann probiere doch ein One Shot Abenteuer aus!
              </p>
            </motion.div>

            <motion.div
              className="relative rounded-md border border-amber-700/50 bg-stone-50 p-6 shadow-lg cursor-pointer"
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
                <MessageCircle className="h-5 w-5 text-amber-800" aria-hidden />
              </div>
              <h3 className="font-cinzel font-bold text-xl text-stone-900 mb-2">
                Discord Community
              </h3>
              <p className="font-libre text-stone-700 leading-relaxed">
                Finde Mitspieler, teile Builds und tausch dich über deine
                Lieblingssysteme aus. Auf unseren Discord findet ihr Infos und Links zu wichtigen Themen rund um Euer Spiel oder nehmt an unseren Diskussionen oder Text-Adventures teil!
              </p>
            </motion.div>
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
