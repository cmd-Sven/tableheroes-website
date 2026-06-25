"use client";

import { useRef, useState, useEffect } from "react";
import { useMotionValue, useSpring, motion } from "framer-motion";
import Image from "next/image";

type Props = {
  children: React.ReactNode;
  className?: string;
  backgroundImageUrl?: string;
};

export function GothicSpotlightDescription({ children, className = "", backgroundImageUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [spotlightStyle, setSpotlightStyle] = useState({ 
    maskImage: "radial-gradient(500px circle at 0px 0px, transparent 0%, transparent 40%, black 70%)",
    WebkitMaskImage: "radial-gradient(500px circle at 0px 0px, transparent 0%, transparent 40%, black 70%)",
  });
  const [goldenLightStyle, setGoldenLightStyle] = useState({ background: "transparent" });
  
  // Smooth spring animation for mouse tracking
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Update spotlight mask style and golden light when motion values change
  // Mask is transparent in center (reveals image) and black at edges (shows dark overlay)
  useEffect(() => {
    const updateStyles = () => {
      const x = smoothX.get();
      const y = smoothY.get();
      setSpotlightStyle({
        maskImage: `radial-gradient(500px circle at ${x}px ${y}px, transparent 0%, transparent 40%, black 70%)`,
        WebkitMaskImage: `radial-gradient(500px circle at ${x}px ${y}px, transparent 0%, transparent 40%, black 70%)`,
      });
      setGoldenLightStyle({
        background: `radial-gradient(500px circle at ${x}px ${y}px, rgba(255, 215, 0, 0.15), rgba(255, 200, 87, 0.08), transparent 70%)`,
      });
    };

    const unsubscribeX = smoothX.on("change", updateStyles);
    const unsubscribeY = smoothY.on("change", updateStyles);

    // Initial update
    updateStyles();

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [smoothX, smoothY]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg border border-hero-border overflow-hidden ${className}`}
      style={{
        background: "#0a0a0a",
        boxShadow: "inset 0 0 100px rgba(0, 0, 0, 0.8), inset 0 0 200px rgba(0, 0, 0, 0.4)",
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Background Image - Base layer (darker) */}
      {backgroundImageUrl && (
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src={backgroundImageUrl}
            alt="Background pattern"
            fill
            className="object-cover"
            style={{
              filter: "brightness(0.25) contrast(0.6)",
              opacity: 0.4,
            }}
            priority={false}
          />
        </div>
      )}

      {/* Dark mask overlay - Spotlight removes this mask (darker) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "rgba(0, 0, 0, 0.95)",
          ...spotlightStyle,
        }}
      />

      {/* Golden warm light overlay in spotlight area */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          ...goldenLightStyle,
          mixBlendMode: "overlay",
          ...spotlightStyle,
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full min-w-0 p-6">
        {children}
      </div>
    </div>
  );
}
