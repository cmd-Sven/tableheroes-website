"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import Image from "next/image";
import { EmberRainOverlayMemo as EmberRainOverlay } from "@/src/components/marketing/EmberRainOverlay";
import { CloudFogOverlayMemo as CloudFogOverlay } from "@/src/components/marketing/CloudFogOverlay";

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

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative h-[60vh] md:h-[80vh] flex items-center justify-center overflow-hidden scroll-mt-20 isolate"
      style={{ contain: "strict" }}
    >
      {/* Parallax Background */}
      <ParallaxBackground />

      {/* Sanfte Nebelschwaden über dem Boden, vor den hintersten Parallax-Ebenen */}
      <CloudFogOverlay />

      {/* Atmosphärischer Glut-/Staub-Effekt, zwischen Hintergrund und Content */}
      <EmberRainOverlay />

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
                style={{ willChange: "transform, opacity" }}
              >
                <Image
                  src="/images/tableHeroes-logo.png"
                  alt="TableHeroes Logo"
                  width={260}
                  height={80}
                  priority
                  style={{ height: "auto" }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                className="mt-3 font-barlow font-semibold uppercase tracking-[0.25em] text-white/80 text-xs md:text-sm"
                style={{ willChange: "transform, opacity" }}
              >
                Pen &amp; Paper Community Osnabrück, zu Tisch oder Online.
              </motion.div>
            </div>

            <h1 className="font-barlow font-extrabold text-4xl md:text-5xl lg:text-6xl uppercase tracking-wide">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-hero-vibrant via-accent-gold to-hero-vibrant">
                Dein Pen &amp; Paper
              </span>
            </h1>

            <p className="mt-6 font-libre text-gray-100 leading-relaxed text-lg md:text-xl drop-shadow-lg">
              Wir bringen Spieler und Spielleiter zusammen. Digital organisiert, analog erlebt. 
              Finde deine Gruppe und werde Teil der TableHeroes-Gemeinschaft.
            </p>
          </div>

          <LaunchInfoCard />
        </motion.div>
      </div>

      {/* Goldene, sich wiederholende Border zwischen Sektionen */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 z-[40]">
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

      {/* Externer Discord-Button als Holz-Grafik, zentriert am unteren Rand */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[70] -translate-x-1/2">
        <a
          href="https://discord.gg/JzfXw9b7v7"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center justify-center"
          aria-label="Zum Discord Server - Öffnet in neuem Tab"
        >
          <div className="relative">
            <Image
              src="/images/button-green-wood.png"
              alt="Zum Discord"
              width={260}
              height={80}
              priority={false}
              style={{ height: "auto" }}
            />
            <Image
              src="/images/button-green-wood_hover.png"
              alt=""
              width={260}
              height={80}
              priority={false}
              className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ height: "auto" }}
            />
            <span
              className="absolute inset-0 flex items-center justify-center font-barlow font-bold uppercase tracking-wide text-white text-sm md:text-base"
              style={{ padding: "10px" }}
            >
              Zum Discord
            </span>
          </div>
        </a>
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

function LaunchInfoCard() {
  const { days, hours, minutes, seconds } = useLaunchCountdown();

  const format = (value: number) => value.toString().padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6 shadow-lg flex flex-col gap-4"
      style={{ willChange: "transform, opacity" }}
    >
      <div>
        <h3 className="font-barlow font-semibold uppercase tracking-wide text-accent-gold text-sm">
          Das Abenteuer beginnt bald
        </h3>
        <p className="mt-2 font-libre text-gray-100 text-sm leading-relaxed">
          Registrierungen sind erst ab dem Launch-Tag möglich.
          Komm vorab auf unseren Discord!
        </p>
      </div>

      <div className="mt-2">
        <p className="font-barlow text-xs uppercase tracking-[0.3em] text-gray-300 mb-1">
          Countdown bis zum Launch
        </p>
        <div className="flex items-center gap-3 font-mono font-semibold text-xl md:text-2xl text-accent-gold">
          <div className="flex flex-col items-center">
            <span>{format(days)}</span>
            <span className="mt-1 text-[10px] font-barlow uppercase tracking-[0.2em] text-gray-300">
              Tage
            </span>
          </div>
          <span className="text-accent-gold/80">:</span>
          <div className="flex flex-col items-center">
            <span>{format(hours)}</span>
            <span className="mt-1 text-[10px] font-barlow uppercase tracking-[0.2em] text-gray-300">
              Stunden
            </span>
          </div>
          <span className="text-accent-gold/80">:</span>
          <div className="flex flex-col items-center">
            <span>{format(minutes)}</span>
            <span className="mt-1 text-[10px] font-barlow uppercase tracking-[0.2em] text-gray-300">
              Minuten
            </span>
          </div>
          <span className="text-accent-gold/80">:</span>
          <div className="flex flex-col items-center">
            <span>{format(seconds)}</span>
            <span className="mt-1 text-[10px] font-barlow uppercase tracking-[0.2em] text-gray-300">
              Sekunden
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <p className="font-libre text-gray-200 text-sm leading-relaxed">
          Du willst nicht warten? Komm auf unseren Discord und tausche dich
          jetzt schon mit der Community aus!
        </p>
        <a
          href="https://discord.gg/JzfXw9b7v7"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center rounded-md border border-accent-gold/60 bg-background-card/70 px-4 py-2 font-barlow font-bold uppercase text-accent-gold text-xs tracking-wide transition-colors hover:bg-background-card/90"
        >
          Zum Discord
        </a>
      </div>
    </motion.div>
  );
}
