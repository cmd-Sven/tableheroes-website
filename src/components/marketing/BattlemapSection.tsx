"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";

type BattlemapShot = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

const SHOTS: readonly BattlemapShot[] = [
  {
    src: "/images/marketing/battlemap-uebersicht.jpg",
    alt: "Battlemap mit 3D-Würfeln, Tokens und Spielermonitor",
    caption: "Die Battlemap mit 3D-Würfeln, Tokens und Spielermonitor.",
    width: 1024,
    height: 491,
  },
  {
    src: "/images/marketing/live-session-buehne.jpg",
    alt: "Bühne der Live-Session mit NPCs und Helden",
    caption: "NPCs und Helden in der Live-Session.",
    width: 1024,
    height: 590,
  },
  {
    src: "/images/marketing/charakterkarten.jpg",
    alt: "Heldenkarten mit Lebenspunkten",
    caption: "Heldenkarten mit Lebenspunkten.",
    width: 1024,
    height: 234,
  },
  {
    src: "/images/marketing/battlemap-token.jpg",
    alt: "Token auf der Karte mit Bewegung und Zeichenwerkzeug",
    caption: "Token bewegen und auf der Karte zeichnen.",
    width: 448,
    height: 393,
  },
  {
    src: "/images/marketing/reisekarte.jpg",
    alt: "Reisekarte mit der Gruppe",
    caption: "Reisekarte mit der Gruppe.",
    width: 1024,
    height: 541,
  },
  {
    src: "/images/marketing/wuerfelfenster.jpg",
    alt: "Würfelfenster der Sitzung",
    caption: "Das Würfelfenster.",
    width: 475,
    height: 542,
  },
  {
    src: "/images/marketing/ausruestung.jpg",
    alt: "Charakterbogen mit Traglast, Schnellzugriff und Ausrüstung am Körper",
    caption: "Ausrüstung, Traglast und Schnellzugriff sitzen am Charakter.",
    width: 1024,
    height: 467,
  },
  {
    src: "/images/marketing/rucksack.jpg",
    alt: "Privater Rucksack mit Gepäck-Tabs und Item-Raster",
    caption: "Der private Rucksack wird als eigenes Gepäck geöffnet.",
    width: 552,
    height: 809,
  },
  {
    src: "/images/marketing/avatar-rucksack-guertel.jpg",
    alt: "Avatar mit Rucksack und Gürtel in der Live-Session",
    caption: "Live-Session-Avatar mit Rucksack, Gürtel, Erschöpfung, Chronist und Webcam.",
    width: 354,
    height: 333,
  },
];

const FRAME_STYLE = {
  borderColor: "#8a7020",
  boxShadow:
    "0 0 0 1px #6e5a18, 0 0 14px rgba(138, 112, 32, 0.55), inset 0 0 0 1px rgba(166, 132, 42, 0.7), inset 0 0 12px rgba(110, 90, 24, 0.35)",
} as const;

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5 },
} as const;

export function BattlemapSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const captionId = useId();
  const activeShot = activeIndex === null ? null : SHOTS[activeIndex];

  useEffect(() => {
    if (activeIndex === null) return;

    const index = activeIndex;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveIndex(null);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>("button");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
      triggerRefs.current[index]?.focus({ preventScroll: true });
    };
  }, [activeIndex]);

  return (
    <section
      id="battlemap"
      className="relative scroll-mt-20 bg-background-dark"
      style={{
        backgroundImage: "url('/images/dark-marmor.webp')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <motion.h2 {...fadeIn} className="marketing-section-h2">
            Battlemap & Live Session
          </motion.h2>
        </div>
        <motion.p
          {...fadeIn}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-libre text-gray-200 leading-relaxed mb-10 text-center max-w-3xl mx-auto"
        >
          Table-Heroes führt Battlemap und Live-Session für Online-Sitzungen und am Tisch zusammen.
        </motion.p>

        <motion.div
          className="columns-1 gap-6 md:columns-2 lg:columns-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {SHOTS.map((shot, index) => (
            <figure key={shot.src} className="mb-6 break-inside-avoid">
              <button
                ref={(node) => {
                  triggerRefs.current[index] = node;
                }}
                type="button"
                className="group block w-full cursor-zoom-in overflow-hidden rounded-[10px] border-[3px] border-solid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4a24a]"
                style={{ ...FRAME_STYLE, borderRadius: "10px" }}
                aria-label={`Bild vergrößern: ${shot.alt}`}
                onClick={() => setActiveIndex(index)}
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={shot.width}
                  height={shot.height}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="h-auto w-full origin-center group-hover:[transform:scale(1.04)] motion-reduce:transition-none motion-reduce:group-hover:[transform:none]"
                  style={{
                    transitionProperty: "transform",
                    transitionDuration: "300ms",
                    transitionTimingFunction: "ease-out",
                  }}
                />
              </button>
              <figcaption className="mt-2 font-libre text-sm leading-relaxed text-gray-200">
                {shot.caption}
              </figcaption>
            </figure>
          ))}
        </motion.div>
      </div>
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

      {activeShot
        ? createPortal(
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Vergrößerte Ansicht"
              aria-describedby={captionId}
              className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/88 p-4 sm:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveIndex(null)}
            >
              <button
                ref={closeRef}
                type="button"
                aria-label="Schließen"
                className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 border-[3px] border-solid bg-[#0a1f10]/92 px-4 py-2 font-barlow text-sm font-bold uppercase tracking-wide text-[#e4d5a0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4d5a0]"
                style={FRAME_STYLE}
                onClick={() => setActiveIndex(null)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
                Schließen
              </button>
              <motion.figure
                className="flex max-w-full flex-col items-center"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-[3px] border-solid" style={{ ...FRAME_STYLE, boxSizing: "content-box" }}>
                  <Image
                    src={activeShot.src}
                    alt={activeShot.alt}
                    width={activeShot.width}
                    height={activeShot.height}
                    sizes="92vw"
                    className="block object-contain"
                    style={{
                      width: `min(92vw, 1100px, calc((100vh - 9rem) * ${activeShot.width} / ${activeShot.height}))`,
                      height: "auto",
                      maxWidth: "92vw",
                      maxHeight: "calc(100vh - 9rem)",
                    }}
                  />
                </div>
                <figcaption
                  id={captionId}
                  className="mt-3 max-w-[min(92vw,1100px)] text-center font-libre text-sm leading-relaxed text-gray-200"
                >
                  {activeShot.caption}
                </figcaption>
              </motion.figure>
            </motion.div>,
            document.body,
          )
        : null}
    </section>
  );
}
