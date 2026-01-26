"use client";

export function TwinklingStars() {
  // Anzahl der Sterne - mehr für einen schönen Effekt
  const stars = Array.from({ length: 80 }, (_, i) => {
    // Zufällige Position
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    
    // Zufällige Größe (klein, mittel, groß)
    const size = Math.random() < 0.6 ? 2 : Math.random() < 0.8 ? 3 : 4;
    
    // Zufällige Animationsdauer für Variation
    const duration = 2 + Math.random() * 3; // 2-5 Sekunden
    
    // Zufällige Verzögerung
    const delay = Math.random() * 2;
    
    // Zufällige Glanz-Intensität
    const glowSize1 = 2 + Math.random() * 3;
    const glowSize2 = 4 + Math.random() * 6;

    return {
      id: i,
      top,
      left,
      size,
      duration,
      delay,
      glowSize1,
      glowSize2,
    };
  });

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
