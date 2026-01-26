"use client";

export function FireEffect() {
  const particles = Array.from({ length: 50 }, (_, i) => i);
  const emberParticles = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none scale-50 origin-bottom"
      style={{
        fontSize: "clamp(12px, 1.5vw, 24px)", // Responsive scaling
        filter: "blur(0.03em)",
        width: "clamp(100px, 8vw, 200px)", // Scales with viewport
        height: "12em",
        mixBlendMode: "screen",
      }}
    >
      {/* Hauptfeuer-Partikel */}
      {particles.map((_, index) => {
        const animationDelay = Math.random() * 1; // 0 to 1s
        const leftPercent = (index / 50) * 100; // Distribute across width

        return (
          <div
            key={index}
            className="particle"
            style={{
              animationDelay: `${animationDelay}s`,
              left: `calc(${leftPercent}% - 2.5em)`,
            }}
          />
        );
      })}
      
      {/* Glut-Partikel (aufsteigend) */}
      {emberParticles.map((_, index) => {
        const animationDelay = Math.random() * 2; // 0 to 2s
        const leftPercent = 30 + (Math.random() * 40); // Zwischen 30% und 70% der Breite
        const horizontalDrift = (Math.random() - 0.5) * 3; // Leichte horizontale Drift

        return (
          <div
            key={`ember-${index}`}
            className="ember-particle"
            style={{
              animationDelay: `${animationDelay}s`,
              left: `calc(${leftPercent}% - 0.5em)`,
              "--drift": `${horizontalDrift}em`,
            } as React.CSSProperties}
          />
        );
      })}
      
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
