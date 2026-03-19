"use client";

import { useState, useEffect } from "react";

type Particle = { animationDelay: number; leftPercent: number };
type Ember = { animationDelay: number; leftPercent: number; drift: number };

function deterministicParticles(): Particle[] {
  return Array.from({ length: 50 }, (_, i) => ({
    animationDelay: i / 50,
    leftPercent: (i / 50) * 100,
  }));
}

function deterministicEmbers(): Ember[] {
  return Array.from({ length: 25 }, (_, i) => ({
    animationDelay: (i / 25) * 2,
    leftPercent: 30 + (i / 25) * 40,
    drift: ((i % 5) / 5 - 0.5) * 3,
  }));
}

function randomParticles(): Particle[] {
  return Array.from({ length: 50 }, () => ({
    animationDelay: Math.random() * 1,
    leftPercent: Math.random() * 100,
  }));
}

function randomEmbers(): Ember[] {
  return Array.from({ length: 25 }, () => ({
    animationDelay: Math.random() * 2,
    leftPercent: 30 + Math.random() * 40,
    drift: (Math.random() - 0.5) * 3,
  }));
}

export function FireEffect() {
  const [particles, setParticles] = useState<Particle[]>(deterministicParticles);
  const [embers, setEmbers] = useState<Ember[]>(deterministicEmbers);

  useEffect(() => {
    setParticles(randomParticles());
    setEmbers(randomEmbers());
  }, []);

  return (
    <div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none scale-50 origin-bottom"
      style={{
        fontSize: "clamp(12px, 1.5vw, 24px)",
        filter: "blur(0.03em)",
        width: "clamp(100px, 8vw, 200px)",
        height: "12em",
        mixBlendMode: "screen",
      }}
    >
      {particles.map((p, index) => (
        <div
          key={index}
          className="particle"
          style={{
            animationDelay: `${p.animationDelay}s`,
            left: `calc(${p.leftPercent}% - 2.5em)`,
          }}
        />
      ))}
      {embers.map((e, index) => (
        <div
          key={`ember-${index}`}
          className="ember-particle"
          style={{
            animationDelay: `${e.animationDelay}s`,
            left: `calc(${e.leftPercent}% - 0.5em)`,
            "--drift": `${e.drift}em`,
          } as React.CSSProperties}
        />
      ))}
      
      <style jsx>{`
        .particle {
          animation: rise 1s ease-in infinite;
          background-image: radial-gradient(
            rgb(255, 80, 0) 20%,
            rgba(255, 80, 0, 0) 70%
          );
          border-radius: 50%;
          mix-blend-mode: screen;
          opacity: 0;
          position: absolute;
          bottom: 0;
          width: 5em;
          height: 5em;
        }

        .ember-particle {
          animation: rise-ember 3s ease-out infinite;
          background-image: radial-gradient(
            rgb(255, 180, 50) 15%,
            rgb(255, 120, 30) 40%,
            rgba(255, 80, 0, 0) 80%
          );
          border-radius: 50%;
          mix-blend-mode: screen;
          opacity: 0;
          position: absolute;
          bottom: 0;
          width: 1.5em;
          height: 1.5em;
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(0) scale(1);
          }
          25% {
            opacity: 1;
          }
          to {
            opacity: 0;
            transform: translateY(-10em) scale(0);
          }
        }

        @keyframes rise-ember {
          from {
            opacity: 0;
            transform: translateY(0) translateX(0) scale(1);
          }
          15% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
          to {
            opacity: 0;
            transform: translateY(-18em) translateX(var(--drift, 0)) scale(0.3);
          }
        }
      `}</style>
    </div>
  );
}
