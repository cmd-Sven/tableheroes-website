"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import Image from "next/image";
import { EmberRainOverlayMemo as EmberRainOverlay } from "@/src/components/marketing/EmberRainOverlay";
import { CloudFogOverlayMemo as CloudFogOverlay } from "@/src/components/marketing/CloudFogOverlay";
import { DragonCanvas } from "@/src/components/marketing/DragonCanvas";

// Parallax Layer Configuration
// yRange in Pixel: sehr dezente vertikale Verschiebung (entgegengesetzt zur Scrollrichtung)
// Hinweis: Vordergrund bewegt sich am stärksten, Hintergrund fast statisch – aber insgesamt nur leicht
interface ParallaxLayer {
  src: string;
  alt: string;
  yRange: [number, number];
  zIndex: number;
  blurClass?: string;
}

const PARALLAX_LAYERS: ParallaxLayer[] = [
  {
    src: "/images/paralax/layer-e-himmel.png",
    alt: "Himmel Hintergrund",
    yRange: [0, -4], // kaum Bewegung
    zIndex: 1,
    blurClass: "blur-[1px]",
  },
  {
    src: "/images/paralax/layer-d-vulkan.png",
    alt: "Vulkan Ebene",
    yRange: [0, -10],
    zIndex: 2,
    blurClass: "blur-[1.5px]",
  },
  {
    src: "/images/paralax/layer-c-huegel-schloss.png",
    alt: "Hügel und Schloss",
    yRange: [0, -18],
    zIndex: 3,
    blurClass: "",
  },
  {
    src: "/images/paralax/layer-b-felsen-baum.png",
    alt: "Felsen und Bäume",
    yRange: [0, -26],
    zIndex: 4,
    blurClass: "",
  },
  {
    src: "/images/paralax/layer-a-felsen.png",
    alt: "Felsen Vordergrund",
    // Vordergrund soll sich spürbar bewegen, aber im Bild bleiben
    yRange: [0, -34],
    zIndex: 5,
    blurClass: "",
  },
];

function ParallaxBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div ref={containerRef} className="relative h-full w-full">
        {/* Parallax Layers */}
        {PARALLAX_LAYERS.map((layer, index) => {
          // Rohe vertikale Bewegung (entgegengesetzt zur Scrollrichtung)
          // Bewegung nur im ersten Teil des Scrolls (0–0.8), danach bleibt der Wert konstant,
          // sodass der Effekt am Ende des Hero-Bereichs „ausläuft".
          const yRaw = useTransform<number, number>(
            scrollYProgress,
            [0, 0.8, 1],
            [layer.yRange[0], layer.yRange[1], layer.yRange[1]]
          );

          // Sanftes Spring-Smoothing, damit der Effekt „butterweich" wirkt
          const y = useSpring(yRaw, {
            stiffness: 60,
            damping: 20,
            mass: 0.2,
          });

          return (
            <motion.div
              key={layer.src}
              style={{
                y,
                // konstantes leichtes Upscaling, damit keine Lücken am Rand entstehen
                scale: 1.05,
                zIndex: layer.zIndex,
                willChange: "transform, opacity",
              }}
              className={`absolute inset-0 origin-top ${layer.blurClass ?? ""}`}
            >
              <Image
                src={layer.src}
                alt={layer.alt}
                fill
                priority // alle Layer priorisieren, um Flackern zu minimieren
                className="object-cover"
                sizes="100vw"
                quality={index === 0 ? 90 : 85} // Erste Ebene höhere Qualität
              />

              {/* Vulkan-Lava-Glühen: direkt an den Vulkan-Layer gekoppelt */}
              {layer.src.includes("layer-d-vulkan") && (
                <div className="pointer-events-none absolute inset-0 z-20">
                  {/* Aura */}
                  <div
                    className="absolute"
                    style={{
                      top: "calc(30% - 80px)", // 30px weiter nach unten als zuvor
                      left: "calc(50% - 25px)", // 40px weiter nach links
                      transform: "translate3d(-50%, 0, 0)",
                      width: "260px",
                      height: "160px",
                      mixBlendMode: "screen",
                      pointerEvents: "none",
                      willChange: "transform, opacity",
                    }}
                  >
                    <div className="lava-aura w-full h-full" />
                  </div>
                  {/* Kern */}
                  <div
                    className="absolute"
                    style={{
                      top: "calc(30% - 80px)",
                      left: "calc(50% - 25px)",
                      transform: "translate3d(-50%, 4px, 0)",
                      width: "140px",
                      height: "70px",
                      mixBlendMode: "screen",
                      pointerEvents: "none",
                      willChange: "transform, opacity",
                    }}
                  >
                    <div className="lava-core w-full h-full" />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Dark Gradient Overlay für bessere Lesbarkeit */}
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/80 via-background-dark/60 to-background-dark/90 z-10" />
      </div>

      {/* Lava-Glühen Styles */}
      <style jsx>{`
        .lava-core {
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(220, 38, 38, 0.7) 0%,
            rgba(185, 28, 28, 0.65) 22%,
            rgba(153, 27, 27, 0.55) 40%,
            rgba(127, 29, 29, 0.4) 60%,
            rgba(88, 28, 28, 0) 100%
          );
          opacity: 0.5;
          filter: blur(8px);
          box-shadow: 0 0 28px rgba(255, 69, 0, 0.55),
            0 0 56px rgba(255, 165, 0, 0.4);
          animation: lava-core-flicker 1.8s infinite,
            lava-color-shift 13s ease-in-out infinite;
          will-change: transform, opacity, filter;
        }

        .lava-aura {
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(153, 27, 27, 0.5) 0%,
            rgba(127, 29, 29, 0.35) 30%,
            rgba(88, 28, 28, 0.2) 65%,
            rgba(0, 0, 0, 0) 100%
          );
          opacity: 0.45;
          filter: blur(25px);
          animation: lava-aura-pulse 9s ease-in-out infinite;
          will-change: transform, opacity;
        }

        @keyframes lava-core-flicker {
          0% {
            opacity: 0.5;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(8px) brightness(1);
          }
          25% {
            opacity: 0.65;
            transform: translate3d(0, -1px, 0) scale(1.04);
            filter: blur(7px) brightness(1.1);
          }
          50% {
            opacity: 0.4;
            transform: translate3d(0, 1px, 0) scale(0.98);
            filter: blur(9px) brightness(0.95);
          }
          75% {
            opacity: 0.6;
            transform: translate3d(0, -0.5px, 0) scale(1.02);
            filter: blur(8px) brightness(1.05);
          }
          100% {
            opacity: 0.5;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(8px) brightness(1);
          }
        }

        @keyframes lava-color-shift {
          0% {
            box-shadow: 0 0 20px rgba(139, 0, 0, 0.55),
              0 0 40px rgba(185, 28, 28, 0.4);
          }
          27% {
            box-shadow: 0 0 26px rgba(185, 28, 28, 0.6),
              0 0 52px rgba(255, 69, 0, 0.45);
          }
          54% {
            box-shadow: 0 0 32px rgba(255, 69, 0, 0.6),
              0 0 64px rgba(255, 165, 0, 0.45);
          }
          81% {
            box-shadow: 0 0 38px rgba(255, 140, 0, 0.65),
              0 0 74px rgba(255, 191, 0, 0.5);
          }
          100% {
            box-shadow: 0 0 24px rgba(185, 28, 28, 0.6),
              0 0 48px rgba(255, 69, 0, 0.45);
          }
        }

        @keyframes lava-aura-pulse {
          0% {
            opacity: 0.4;
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate3d(0, 0, 0) scale(1.05);
          }
          100% {
            opacity: 0.4;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

type HeroContentType = "updates" | "membership" | "discord" | "login";

interface HeroSectionProps {
  heroContent?: HeroContentType;
}

export function HeroSection({ heroContent = "updates" }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative h-[calc(60vh+100px)] md:h-[calc(80vh+100px)] flex items-center justify-center overflow-visible scroll-mt-20 isolate"
      style={{ contain: "strict" }}
    >
      {/* Countdown oben mittig */}
      <LaunchCountdown />

      {/* Parallax Background */}
      <ParallaxBackground />

      {/* Sanfte Nebelschwaden über dem Boden, vor den hintersten Parallax-Ebenen */}
      <CloudFogOverlay />

      {/* Atmosphärischer Glut-/Staub-Effekt, zwischen Hintergrund und Content */}
      <EmberRainOverlay />

      {/* Periodischer fliegender Drache */}
      <DragonCanvas />

      {/* Content Container */}
      <div className="relative z-[60] mx-auto max-w-6xl px-6 py-20 md:py-28 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center"
          style={{ willChange: "transform, opacity" }}
        >
          <div>
            {/* Logo + Untertitel Block */}
            <div className="mb-6 flex flex-col items-center text-center">
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex items-center justify-center"
                style={{
                  willChange: "transform, opacity",
                  filter: "drop-shadow(0 0 15px rgba(255, 165, 0, 0.2))",
                }}
              >
                <Image
                  src="/images/tableHeroes-logo.png"
                  alt="TableHeroes Logo"
                  width={520}
                  height={160}
                  priority
                  className="w-64 md:w-[500px] lg:w-[520px]"
                  style={{ height: "auto" }}
                />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                className="mt-3 font-barlow font-extrabold text-3xl tracking-wide text-hero-vibrant"
                style={{ willChange: "transform, opacity" }}
              >
                Pen &amp; Paper Community Osnabrück, zu Tisch oder Online.
              </motion.h1>

              {/* Claim-Text direkt unter dem Untertitel, mittig und in Fließtext-Größe */}
              <p className="mt-4 font-libre text-gray-100 leading-relaxed text-sm md:text-base max-w-xl">
                Wir bringen Spieler und Spielleiter zusammen. Digital organisiert, analog erlebt. Finde deine
                Gruppe und werde Teil der TableHeroes-Gemeinschaft.
              </p>
            </div>
          </div>

          {/* Container für Pergament-Box und Feder */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <HeroContentBox key={heroContent} content={heroContent} />
            </AnimatePresence>
            
            {/* Schwebende Feder */}
            <motion.div
              className="absolute top-10 -right-8 z-20 hidden lg:block"
              style={{
                transform: "translateX(75%)",
              }}
              animate={{
                y: [0, -15, 0],
              }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            >
              <Image
                src="/images/feder-frei.png"
                alt=""
                width={64}
                height={64}
                className="w-12 h-auto object-contain"
                style={{ height: "auto" }}
                priority={false}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>


      {/* Würfel-Container - leicht unterhalb des unteren Rands positioniert */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-[100]"
        style={{ bottom: "-30px" }}
      >
        <motion.div
          className="hidden md:block pointer-events-auto mb-0"
          initial={{
            x: "-100vw",
            y: -400,
            rotate: -720,
            opacity: 0.8,
          }}
          animate={{
            x: 0,
            y: [-400, 0, -200, 0, -100, 0, -40, 0, -10, 0], // 5 Bounces mit abnehmender Höhe
            rotate: 720,
            opacity: 1,
          }}
          transition={{
            x: {
              duration: 2.5,
              ease: "easeOut",
            },
            y: {
              duration: 2.5,
              times: [0, 0.15, 0.3, 0.45, 0.6, 0.72, 0.84, 0.92, 0.97, 1],
              ease: [0.4, 0, 0.2, 1], // easeInOut für weiche Umkehrpunkte oben, harte Aufschläge unten
            },
            rotate: {
              duration: 2.5,
              ease: "linear",
            },
            opacity: {
              duration: 0.8,
            },
            delay: 0.5,
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0],
              filter: [
                "drop-shadow(0 8px 12px rgba(0,0,0,0.4))",
                "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
                "drop-shadow(0 6px 10px rgba(0,0,0,0.35))",
                "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
                "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
                "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
                "drop-shadow(0 3px 6px rgba(0,0,0,0.45))",
                "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
                "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
              ],
            }}
            transition={{
              scale: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              },
              rotate: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              },
              filter: {
                duration: 2.5,
                times: [0, 0.15, 0.3, 0.45, 0.6, 0.72, 0.84, 0.92, 0.97, 1],
              },
            }}
            whileHover={{
              rotate: 15,
              scale: 1.1,
              transition: { duration: 0.2 },
            }}
            className="relative w-24 h-24"
          >
            <Image
              src="/images/logos/dice1.png"
              alt="Würfel"
              fill
              className="object-contain"
              priority={false}
              sizes="96px"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function useLaunchCountdown(): Countdown {
  const [timeLeft, setTimeLeft] = useState<Countdown>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date("2026-02-09T18:00:00+01:00").getTime();

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return timeLeft;
}

function LaunchCountdown() {
  const { days, hours, minutes, seconds } = useLaunchCountdown();

  const format = (value: number) => value.toString().padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
    >
      <div className="px-6 py-2 rounded-full bg-[#215210] shadow-[0_0_15px_rgba(57,255,20,0.4)]">
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg text-white tabular-nums">
          <div className="flex items-center gap-1">
            <span>{format(days)}</span>
            <span className="text-xs text-gray-300">d</span>
          </div>
          <span className="text-accent-gold">:</span>
          <div className="flex items-center gap-1">
            <span>{format(hours)}</span>
            <span className="text-xs text-gray-300">h</span>
          </div>
          <span className="text-accent-gold">:</span>
          <div className="flex items-center gap-1">
            <span>{format(minutes)}</span>
            <span className="text-xs text-gray-300">m</span>
          </div>
          <span className="text-accent-gold">:</span>
          <div className="flex items-center gap-1">
            <span>{format(seconds)}</span>
            <span className="text-xs text-gray-300">s</span>
          </div>
        </div>
      </div>
      <span className="font-barlow font-bold uppercase tracking-wide text-accent-gold text-sm">
        Launch-Day
      </span>
    </motion.div>
  );
}

interface HeroContentBoxProps {
  content: HeroContentType;
}

function HeroContentBox({ content }: HeroContentBoxProps) {
  const getContent = () => {
    switch (content) {
      case "membership":
        return {
          title: "Mitglied werden",
          text: "Um Table-Heroes Mitglied zu werden musst Du dich vorab registrieren und erhälst Zugriff auf das Spieler-Dashboard. Dort hast Du die Möglichkeit aktuelle Kampagnen einzusehen, dich auf diese zu bewerben oder Dein Dashboard einzurichten. Aktuell ist noch keine Registrierung möglich bis zum Release.",
        };
      case "updates":
      default:
        return {
          title: "Das Abenteuer beginnt bald",
          text: "Registrierungen sind erst ab dem Launch-Tag möglich. Komm vorab auf unseren Discord!",
          additionalText: "Du willst nicht warten? Komm auf unseren Discord und tausche dich jetzt schon mit der Community aus!",
        };
    }
  };

  const contentData = getContent();

  return (
    <motion.div
      key={content}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="rounded-2xl shadow-2xl flex flex-col justify-center gap-4 w-full max-w-3xl min-h-[400px] py-16 px-12"
      style={{
        willChange: "transform, opacity",
        backgroundImage: "url('/images/scroll-paper.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      <div>
        <h3 className="font-barlow font-semibold uppercase tracking-wide text-slate-900 text-sm drop-shadow-sm">
          {contentData.title}
        </h3>
        <p className="mt-2 font-libre text-slate-800 text-sm leading-relaxed drop-shadow-sm">
          {contentData.text}
        </p>
      </div>

      {contentData.additionalText && (
        <div className="mt-3">
          <p className="font-libre text-slate-700 text-sm leading-relaxed drop-shadow-sm">
            {contentData.additionalText}
          </p>
        </div>
      )}
    </motion.div>
  );
}
