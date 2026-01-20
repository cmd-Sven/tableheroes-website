"use client";

import { useEffect, useRef, memo } from "react";

type EmberParticle = {
  x: number;
  y: number;
  baseX: number;
  size: number;
  speed: number;
  offset: number;
  freq: number;
  amp: number;
  vx: number;
  vy: number;
  life: number; // 0.0–1.0
  flickerSpeed: number;
  source: "sky" | "volcano";
};

const PARTICLE_COUNT = 40; // Drastisch reduziert für CPU-Entlastung
const WIND_RADIUS = 200; // erweiterter Einflussradius
const GRAVITY = 50; // Schwerkraft in px/s² für Parabel-Flugbahn
const MOUSE_CHECK_INTERVAL = 3; // Maus-Interaktion nur jeden 3. Frame berechnen

export function EmberRainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<EmberParticle[]>([]);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const isHeroVisibleRef = useRef<boolean>(true);
  const lastScrollTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect();
      const width = rect?.width ?? window.innerWidth;
      const height = rect?.height ?? window.innerHeight * 0.6;

      // Näherungsweise Position des Vulkankraters (mittig im oberen Drittel)
      const craterX = width * 0.5;
      const craterY = height * 0.3;

      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // Initiale Partikel (oder Re-Init beim Resize, wenn noch keine da sind)
      if (particlesRef.current.length === 0) {
        const volcanoCount = Math.floor(PARTICLE_COUNT * 0.55); // etwas mehr Vulkan-Partikel
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
          const fromVolcano = i < volcanoCount;

          const size = 1 + Math.random() * 3;
          const speed = 25 + Math.random() * 40; // Basis-Fallgeschwindigkeit
          const offset = Math.random() * Math.PI * 2;
          const freq = 0.5 + Math.random() * 0.8;
          const amp = 10 + Math.random() * 20;
          const life = fromVolcano
            ? 0.8 + Math.random() * 0.2
            : 0.4 + Math.random() * 0.6;
          const flickerSpeed = 2 + Math.random() * 3;

          if (fromVolcano) {
            // Vulkan-Partikel: starten am Krater, mit Aufwärts-Drift
            const xOffset = (Math.random() - 0.5) * 40; // etwas Streuung in X
            const yOffset = (Math.random() - 0.5) * 20;
            // Starke initiale Aufwärtsgeschwindigkeit + leichter Fächer in X
            const initialVy = -(40 + Math.random() * 40); // -40 bis -80 px/s
            const initialVx = (Math.random() - 0.5) * 60; // -30 bis +30 px/s

            return {
              x: craterX + xOffset,
              y: craterY + yOffset,
              baseX: craterX + xOffset,
              size,
              speed,
              offset,
              freq,
              amp,
              vx: initialVx,
              vy: initialVy,
              life,
              flickerSpeed,
              source: "volcano" as const,
            };
          }

          // Himmels-Partikel: überall im Hero verteilt
          const xNorm = Math.random();
          const yNorm = Math.random();

          return {
            x: xNorm * width,
            y: yNorm * height,
            baseX: xNorm * width,
            size,
            speed,
            offset,
            freq,
            amp,
            vx: 0,
            vy: 20 + Math.random() * 40, // klassischer Fall nach unten
            life,
            flickerSpeed,
            source: "sky" as const,
          };
        });
      }
    };

    resize();

    // ResizeObserver für präzise Größenanpassung des Canvas an den Hero-Container
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(canvas.parentElement ?? canvas);
    } else {
      window.addEventListener("resize", resize);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      lastMouseRef.current = mouseRef.current ?? current;
      mouseRef.current = current;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Scroll-Listener: markiert kurzzeitig "scrolling", um Physik zu drosseln
    const handleScroll = () => {
      lastScrollTimeRef.current = performance.now();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // IntersectionObserver: Canvas nur animieren, wenn Hero im Viewport sichtbar ist
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const isVisible = !!entry?.isIntersecting;
          isHeroVisibleRef.current = isVisible;

          if (isVisible) {
            if (frameRef.current === null) {
              lastTime = performance.now();
              frameRef.current = requestAnimationFrame(loop);
            }
          } else if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
          }
        },
        {
          threshold: 0.1,
        }
      );
      intersectionObserver.observe(canvas);
    }

    let lastTime = performance.now();
    let frameCount = 0; // Frame-Zähler für Maus-Intervall

    const loop = (now: number) => {
      // Falls der Hero-Bereich nicht sichtbar ist, keine weitere Arbeit leisten
      if (!isHeroVisibleRef.current) {
        frameRef.current = null;
        return;
      }

      const width = canvas.width / DPR;
      const height = canvas.height / DPR;
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      frameCount++;

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const lastMouse = lastMouseRef.current;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      // Mausgeschwindigkeit für "Kick" berechnen - NUR jeden N-ten Frame
      let mouseVelX = 0;
      let mouseVelY = 0;
      const shouldCheckMouse = frameCount % MOUSE_CHECK_INTERVAL === 0;
      if (shouldCheckMouse && mouse && lastMouse && dt > 0) {
        mouseVelX = (mouse.x - lastMouse.x) / dt;
        mouseVelY = (mouse.y - lastMouse.y) / dt;
      }

      // Wenn vor sehr kurzer Zeit gescrollt wurde, Physik-Arbeit halbieren
      const nowMs = performance.now();
      const isScrollingRecently = nowMs - lastScrollTimeRef.current < 120;

      for (let i = 0; i < particles.length; i++) {
        // Beim aktiven Scrollen nur jeden zweiten Partikel updaten
        if (isScrollingRecently && i % 2 === 1) {
          continue;
        }

        const p = particles[i];

        // Lebenszyklus & Flicker
        const lifeDecay = 0.05 * dt; // langsames Verlöschen
        p.life = Math.max(0, p.life - lifeDecay);

        // Gravitation & vertikale Geschwindigkeit (Parabel-Flugbahn)
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;

        // Sinus-Turbulenz für horizontale Bewegung
        const t = now / 1000;
        const sway = Math.sin(t * p.freq + p.offset) * p.amp;

        // Maus-Wind: Partikel im Radius werden weggedrückt + Kick durch Mausgeschwindigkeit
        // NUR jeden N-ten Frame berechnen, um CPU zu entlasten
        if (shouldCheckMouse && mouse) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist2 = dx * dx + dy * dy;
          const radius2 = WIND_RADIUS * WIND_RADIUS;
          if (dist2 < radius2 && dist2 > 1e-3) {
            // Näherung: force basierend auf dist2 statt dist (vermeidet sqrt)
            const distApprox = Math.sqrt(dist2); // Nur einmal sqrt für force-Berechnung
            const force = (WIND_RADIUS - distApprox) / WIND_RADIUS;
            const strength = 220; // Basiswind
            const nx = dx / distApprox;
            const ny = dy / distApprox;

            // Basis-Abstoßung
            p.vx += nx * strength * force * dt;
            p.vy += ny * strength * force * dt;

            // Zusätzlicher Kick, abhängig von der Mausgeschwindigkeit
            const windKickStrength = 0.02; // fein dosiert
            p.vx += mouseVelX * windKickStrength * force * dt;
            p.vy += mouseVelY * windKickStrength * force * dt;
          }
        }

        // Trägheit & Dämpfung
        p.vx *= 0.92;
        p.vy *= 0.92;

        p.x = p.baseX + sway + p.vx * dt;

        // Wrap / Reset unten ODER wenn "tot"
        const isDead = p.life <= 0.05;
        if (p.y - p.size > height * 1.1 || isDead) {
          // Wiedergeburt je nach Quelle
          const fromVolcano = p.source === "volcano";

          p.vx = 0;
          p.vy = 0;
          p.size = 1 + Math.random() * 3;
          p.speed = 25 + Math.random() * 40;
          p.offset = Math.random() * Math.PI * 2;
          p.freq = 0.5 + Math.random() * 0.8;
          p.amp = 10 + Math.random() * 20;
          p.life = fromVolcano
            ? 0.8 + Math.random() * 0.2
            : 0.7 + Math.random() * 0.3;
          p.flickerSpeed = 2 + Math.random() * 3;

          if (fromVolcano) {
            // Neuer Vulkan-Schub direkt aus dem Krater
            const xOffset = (Math.random() - 0.5) * 40;
            const yOffset = (Math.random() - 0.5) * 20;
            const craterX = width * 0.5;
            const craterY = height * 0.3;
            p.x = craterX + xOffset;
            p.y = craterY + yOffset;
            p.baseX = craterX + xOffset;
            p.vy = -(40 + Math.random() * 40); // erneuter Aufwärts-Schub
            p.vx = (Math.random() - 0.5) * 60; // leichter Fächer
          } else {
            // Himmels-Partikel: klassischer Fall von oben
            p.y = -height * 0.1;
            p.baseX = Math.random() * width;
            p.x = p.baseX;
            p.vx = 0;
            p.vy = 20 + Math.random() * 40;
          }
        }

        // Zeichnen (optimiert: KEINE Schatten, Integer-Koordinaten für Anti-Aliasing-Vermeidung)
        const isGlowing = p.life > 0.2;
        if (isGlowing) {
          // Glutphase - OHNE Schatten (CPU-Entlastung)
          const ascending = p.vy < 0; // Aufstieg = heißeste Phase
          const heatFactor = ascending ? 1 : 0.75;
          const baseAlpha = (0.4 + p.life * 0.6) * heatFactor; // 0.4–1.0 skaliert
          const flicker =
            0.6 +
            0.4 *
              Math.sin(t * p.flickerSpeed + p.offset); /* Pulsieren zwischen 0.2 und 1.0 */
          const alpha = Math.max(0, Math.min(1, baseAlpha * flicker));
          ctx.save();
          ctx.globalAlpha = alpha;
          // Heißer beim Aufstieg (gelb/orange), kühler beim Fall (orange/rot)
          // Hellerer Farbkern für Glow-Effekt ohne Schatten
          ctx.fillStyle = ascending
            ? "rgba(255, 220, 100, 1)" // Hellerer Gelbton für Glow
            : "rgba(255, 180, 100, 1)"; // Hellerer Orangeton
          ctx.beginPath();
          // Integer-Koordinaten für Anti-Aliasing-Vermeidung (CPU-Entlastung)
          ctx.arc((p.x | 0), (p.y | 0), p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Aschephase
          ctx.save();
          ctx.globalAlpha = 0.3 * (p.life / 0.2); // wird langsam durchsichtig
          ctx.fillStyle = "#4a4a4a";
          ctx.beginPath();
          // Integer-Koordinaten für Anti-Aliasing-Vermeidung
          ctx.arc((p.x | 0), (p.y | 0), (p.size / 2) * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", resize);
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      if (intersectionObserver) {
        intersectionObserver.disconnect();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
      style={{ willChange: "transform, opacity" }}
    />
  );
}

export const EmberRainOverlayMemo = memo(EmberRainOverlay);


