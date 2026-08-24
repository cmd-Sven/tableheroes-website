"use client";

import { memo } from "react";
import Image from "next/image";

const CLOUD_SOURCES = [
  "/images/clouds/cloud1.webp",
  "/images/clouds/cloud2.webp",
  "/images/clouds/cloud3.webp",
  "/images/clouds/cloud4.webp",
  "/images/clouds/cloud5.webp",
  "/images/clouds/cloud6.webp",
  "/images/clouds/cloud7.webp",
];

// Vordefinierte, aber „zufällig“ wirkende Konfigurationen für 8 Wolken
const CLOUD_CONFIGS = Array.from({ length: 8 }).map((_, i) => {
  // Breite zwischen 220px und 460px
  const width = 220 + (i * 35) % 240;
  // Höhe relativ zur Breite (etwa 40% der Breite)
  const height = Math.round(width * 0.4);
  // Top-Position im oberen Drittel (0–40%)
  const top = 5 + (i * 7) % 35;
  // Dauer zwischen 40s und 120s
  const duration = 40 + (i * 13) % 80;
  // Negative Delay, damit die Wolken zeitlich versetzt starten
  const delay = -(i * 11) % duration;
  // Opazität: Mitte etwas dünner
  const isMiddle = i === 3 || i === 4;
  const opacity = isMiddle ? 0.15 : 0.25 + ((i % 3) * 0.05);

  return {
    width,
    height,
    top,
    duration,
    delay,
    opacity,
  };
});

export function CloudFogOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-full overflow-visible"
      aria-hidden="true"
    >
      {CLOUD_CONFIGS.map((cfg, index) => {
        const src = CLOUD_SOURCES[index % CLOUD_SOURCES.length];
        return (
          <div
            key={`${src}-${index}`}
            className="cloud-fog"
            style={{
              top: `${cfg.top}%`,
              width: `${cfg.width}px`,
              height: `${cfg.height}px`,
              opacity: cfg.opacity,
              animationDuration: `${cfg.duration}s`,
              animationDelay: `${cfg.delay}s`,
            }}
          >
            <Image
              src={src}
              alt="Nebelschwaden im Hintergrund"
              width={cfg.width}
              height={cfg.height}
              priority={false}
              className="pointer-events-none"
              style={{ height: "auto" }}
            />
          </div>
        );
      })}

      <style jsx>{`
        .cloud-fog {
          position: absolute;
          left: -500px; /* Start weit außerhalb links */
          transform: translate3d(0, 0, 0);
          animation-name: cloud-drift;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          mix-blend-mode: screen;
          /* filter: blur() ENTFERNT - extrem CPU-lastig, nutze stattdessen weichgezeichnete PNGs */
          will-change: transform;
        }

        @keyframes cloud-drift {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(140vw, 0, 0); /* zieht komplett über den Screen hinaus */
          }
        }
      `}</style>
    </div>
  );
}

export const CloudFogOverlayMemo = memo(CloudFogOverlay);


