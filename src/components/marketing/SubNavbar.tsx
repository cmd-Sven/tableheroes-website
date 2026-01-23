"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

type HeroContentType = "updates" | "membership" | "discord" | "login";

interface SubNavbarProps {
  activeContent: HeroContentType;
  onContentChange: (content: HeroContentType) => void;
}

export function SubNavbar({ activeContent, onContentChange }: SubNavbarProps) {
  const navItems = [
    { id: "updates" as HeroContentType, label: "Updates / News" },
    { id: "membership" as HeroContentType, label: "Mitglied werden" },
    { id: "discord" as HeroContentType, label: "Zum Discord", href: "https://discord.gg/JzfXw9b7v7", external: true },
    { id: "login" as HeroContentType, label: "Login / Registrieren", href: "/login" },
  ];

  return (
    <nav
      className="relative w-full overflow-hidden"
      style={{
        backgroundImage: "url('/images/dark-marmor.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      {/* Goldene, sich wiederholende Border oben */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 z-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "url('/images/border_top-bottom_gold.png')",
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top center",
          }}
        />
      </div>
      {/* Corner Icons */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-20 flex items-center justify-center z-10">
        <Image
          src="/images/corner-hawk.jpg"
          alt=""
          width={80}
          height={80}
          className="w-12 h-12 md:w-16 md:h-16 object-contain"
          priority={false}
        />
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-20 flex items-center justify-center z-10">
        <Image
          src="/images/corner-demon.jpg"
          alt=""
          width={80}
          height={80}
          className="w-12 h-12 md:w-16 md:h-16 object-contain"
          priority={false}
        />
      </div>

      {/* Navigation Buttons - Zentriert */}
      <div className="relative mx-auto max-w-6xl px-20 md:px-24 lg:px-28 py-1 flex items-center justify-center gap-3 md:gap-4 flex-wrap">
        {navItems.map((item) => {
          const isActive = activeContent === item.id;
          const isLink = !!item.href;

          const buttonContent = (
            <motion.div
              className="group relative inline-flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative w-[180px] sm:w-[200px] md:w-[220px]">
                <Image
                  src="/images/button-green-wood.png"
                  alt=""
                  width={260}
                  height={80}
                  priority={false}
                  className="w-full h-auto"
                  style={{ height: "auto" }}
                />
                <Image
                  src="/images/button-green-wood_hover.png"
                  alt=""
                  width={260}
                  height={80}
                  priority={false}
                  className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 w-full h-auto"
                  style={{ height: "auto" }}
                />
                <span
                  className={`absolute inset-0 flex items-center justify-center font-barlow font-bold uppercase tracking-wide text-xs sm:text-sm md:text-base ${
                    isActive ? "text-accent-gold" : "text-white"
                  }`}
                  style={{ padding: "10px" }}
                >
                  {item.label}
                </span>
              </div>
            </motion.div>
          );

          if (isLink) {
            return (
              <Link
                key={item.id}
                href={item.href!}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="inline-block"
              >
                {buttonContent}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onContentChange(item.id)}
              className="inline-block"
              aria-label={item.label}
            >
              {buttonContent}
            </button>
          );
        })}
      </div>

      {/* Goldene, sich wiederholende Border unten */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 z-20">
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
    </nav>
  );
}
