"use client";

import { useState, useEffect } from "react";

type Star = {
  id: number;
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  glowSize1: number;
  glowSize2: number;
};

function deterministicStars(): Star[] {
  return Array.from({ length: 80 }, (_, i) => ({
    id: i,
    top: (i * 7) % 100,
    left: (i * 11) % 100,
    size: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
    duration: 2 + (i % 30) / 10,
    delay: (i % 20) / 10,
    glowSize1: 2 + (i % 10) / 4,
    glowSize2: 4 + (i % 15) / 3,
  }));
}

function randomStars(): Star[] {
  return Array.from({ length: 80 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() < 0.6 ? 2 : Math.random() < 0.8 ? 3 : 4,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 2,
    glowSize1: 2 + Math.random() * 3,
    glowSize2: 4 + Math.random() * 6,
  }));
}

export function TwinklingStars() {
  const [stars, setStars] = useState<Star[]>(deterministicStars);

  useEffect(() => {
    setStars(randomStars());
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        zIndex: 2,
      }}
    >
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            position: "absolute",
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            boxShadow: `
              0 0 ${star.glowSize1}px rgba(255, 255, 255, 0.8),
              0 0 ${star.glowSize2}px rgba(255, 255, 255, 0.4)
            `,
          }}
        />
      ))}
      
      <style jsx>{`
        .star {
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 1) 0%,
            rgba(255, 255, 255, 0.8) 30%,
            rgba(255, 255, 255, 0) 70%
          );
          border-radius: 50%;
          animation: twinkle infinite ease-in-out;
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
