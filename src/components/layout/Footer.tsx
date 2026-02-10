"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, Mail, MessageCircle, Instagram, Home, Settings, LogIn } from "lucide-react";
import { HeroButton } from "@/src/components/ui/HeroButton";
import { FireEffect } from "@/src/components/marketing/FireEffect";
import { TwinklingStars } from "@/src/components/marketing/TwinklingStars";

export function Footer() {
  return (
    <div className="relative">
      {/* Top Section - Contact Banner */}
      <div
        className="relative overflow-visible"
        style={{
          backgroundImage: "url('/images/nachthimmel-bg.webp')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Dunkler Overlay für bessere Lesbarkeit mit radialem Verlauf (Vignette) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)",
            zIndex: 1,
          }}
        />
        
        {/* Animierte glitzernde Sterne */}
        <TwinklingStars />
        
        <div className="relative container mx-auto max-w-7xl px-6" style={{ zIndex: 10, paddingTop: "48px", paddingBottom: "348px" }}>
          <div className="flex flex-col items-center text-center gap-6">
            <div>
              <h2 className="font-barlow font-bold text-2xl uppercase text-white mb-2">
                Du hast Fragen oder willst mitmachen?
              </h2>
              <p className="font-libre text-gray-300 text-lg max-w-2xl">
                Wir sind immer offen für neue Gesichter. Schreib uns einfach oder komm auf unseren Server.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <HeroButton
                href="mailto:kontakt@tableheroes.de"
                ariaLabel="E-Mail schreiben"
              >
                E-Mail schreiben
              </HeroButton>
              <HeroButton
                href="https://discord.gg/JzfXw9b7v7"
                target="_blank"
                rel="noopener noreferrer"
                ariaLabel="Zum Discord Server - Öffnet in neuem Tab"
              >
                Zum Discord
              </HeroButton>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Navigation & Socials */}
      <footer className="bg-[#051a02] relative" style={{ zIndex: 3 }}>
        {/* Hintergrund-Layer nur für den grünen Footer mit Fade nach oben */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundColor: "#051a02",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 100%)",
          }}
        />
        {/* Image Overlay - 90% in Kontakt-Sektion, 10% in Footer */}
        {/* Bild am Anfang des Footers, mit translateY(-90%) verschoben */}
        <div
          className="absolute top-0 left-0 w-full pointer-events-none"
          style={{
            height: "650px",
            transform: "translateY(-90%)",
            zIndex: 5,
            backgroundImage: "url('/images/camp-footer-top.png')",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        >
          {/* Feuer-Effekt auf dem Divider-Bild - nur Desktop */}
          <div
            className="hidden md:block absolute top-1/2 pointer-events-none -ml-[110px] mt-[180px] opacity-90"
            style={{
              left: "83%",
              transform: "translate(-50%, -50%)",
              zIndex: 6,
            }}
          >
            <div className="scale-[1.2] origin-bottom">
              <FireEffect />
            </div>
          </div>
        </div>
        <div
          className="container mx-auto max-w-7xl px-6 pb-[198px] relative"
          style={{ zIndex: 10, paddingTop: "168px" }} // Ursprünglich ca. 48px (pt-12) + 120px zusätzlicher Shift
        >
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 - Brand */}
          <div>
            <div className="flex items-center mb-4">
              <Image
                src="/images/tableHeroes-logo.png"
                alt="TableHeroes Logo"
                width={200}
                height={62}
                priority={false}
                className="h-auto"
                style={{ height: "auto" }}
              />
            </div>
            <p className="font-libre text-gray-400 text-sm leading-relaxed">
              Deine Pen &amp; Paper Community in Osnabrück.
            </p>
          </div>

          {/* Column 2 - Links */}
          <div>
            <h3 className="font-barlow font-bold uppercase text-white text-sm mb-4">
              Navigation
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="flex items-center gap-2 font-libre text-gray-400 text-sm hover:text-hero-vibrant transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Startseite
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="flex items-center gap-2 font-libre text-gray-400 text-sm hover:text-hero-vibrant transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Plattform
                </Link>
              </li>
              <li>
                <Link
                  href="/maintenance"
                  className="flex items-center gap-2 font-libre text-gray-400 text-sm hover:text-hero-vibrant transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Rechtliches */}
          <div>
            <h3 className="font-barlow font-bold uppercase text-white text-sm mb-4">
              Rechtliches
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/impressum"
                  className="font-libre text-gray-400 text-sm hover:text-hero-vibrant transition-colors"
                >
                  Impressum
                </Link>
              </li>
              <li>
                <Link
                  href="/datenschutz"
                  className="font-libre text-gray-400 text-sm hover:text-hero-vibrant transition-colors"
                >
                  Datenschutz
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 - Socials */}
          <div>
            <h3 className="font-barlow font-bold uppercase text-white text-sm mb-4">
              Folge uns
            </h3>
            <div className="flex items-center gap-4">
              <a
                href="https://discord.gg/JzfXw9b7v7"
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-12 w-12 place-items-center rounded-md border border-hero-border/40 bg-background-card text-gray-300 transition-colors hover:border-hero-vibrant hover:bg-hero-dark hover:text-white"
                aria-label="Discord"
              >
                <MessageCircle className="h-6 w-6" />
              </a>
              <a
                href="https://instagram.com/tableheroes"
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-12 w-12 place-items-center rounded-md border border-hero-border/40 bg-background-card text-gray-300 transition-colors hover:border-hero-vibrant hover:bg-hero-dark hover:text-white"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="mailto:kontakt@tableheroes.de"
                className="grid h-12 w-12 place-items-center rounded-md border border-hero-border/40 bg-background-card text-gray-300 transition-colors hover:border-hero-vibrant hover:bg-hero-dark hover:text-white"
                aria-label="E-Mail"
              >
                <Mail className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 text-center">
          <p className="font-libre text-gray-500 text-sm">
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> TableHeroes — 
            Deine Pen &amp; Paper Community in Osnabrück
          </p>
        </div>
        </div>
      </footer>
    </div>
  );
}





