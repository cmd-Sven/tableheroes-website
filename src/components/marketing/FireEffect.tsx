"use client";

export function FireEffect() {
  const particles = Array.from({ length: 50 }, (_, i) => i);

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
      `}</style>
    </div>
  );
}
