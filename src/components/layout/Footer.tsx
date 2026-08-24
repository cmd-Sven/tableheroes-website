"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MessageCircle, Instagram, Home, Settings, LogIn, Heart } from "lucide-react";
import { HeroButton } from "@/src/components/ui/HeroButton";
import { FireEffect } from "@/src/components/marketing/FireEffect";
import { StarrySkySection } from "@/src/components/layout/StarrySkySection";

type FooterProps = {
  /** Wenn false, wird nur der untere Footer-Bereich (Navigation, Links) gerendert – z.B. auf der Login-Seite. Default: true */
  showStarrySection?: boolean;
};

export function Footer({ showStarrySection = true }: FooterProps) {
  return (
    <div className="relative w-full min-w-0 max-w-full">
      {showStarrySection && (
        <StarrySkySection className="pt-12 pb-[348px]">
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
        </StarrySkySection>
      )}

      {/* Bottom Section: transparent, damit StarrySkySection dahinter sichtbar bleibt; nur Lagerfeuer + Inhalt */}
      <footer className="bg-transparent relative w-full min-w-0 max-w-full" style={{ zIndex: 3 }}>
        {/* Lagerfeuer-Zone: nur Bild (mit weicher Maske) + Feuer; keine Sterne – Sterne liegen in StarrySkySection */}
        <div
          className="absolute top-0 left-0 right-0 z-0 -translate-y-[90%] pointer-events-none overflow-hidden"
        >
          {/* Bild-Container: volle Breite, festes Seitenverhältnis; Maske/Vignette auf w-full */}
          <div className="relative z-10 min-w-0-force w-full">
            <div className="min-w-0-force aspect-video w-full relative">
              {/* Lagerfeuer-Bild mit Maskierung: weicher Übergang nach oben zu dahinterliegenden Sternen (volle Breite) */}
              <div
                className="absolute inset-0 z-0 w-full mask-[radial-gradient(ellipse_80%_70%_at_50%_50%,black_55%,transparent_100%)]"
                style={{ WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 55%, transparent 100%)" }}
              >
                <Image
                  src="/images/camp-footer-top.webp"
                  alt=""
                  fill
                  priority
                  className="w-full object-cover object-center"
                  sizes="100vw"
                />
              </div>
              {/* Animiertes Feuer: Position auf sichtbarem Lagerfeuer – ggf. nach Augenmaß anpassen (left/top %) */}
              <div
                className="hidden md:block absolute left-[83.75%] top-[65.125%] w-[15%] aspect-square z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-90"
                aria-hidden
              >
                <div className="scale-[1.2] origin-bottom w-full h-full">
                  <FireEffect />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Grüner Hintergrund nur unten: oben transparent, damit StarrySkySection durchscheint */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundColor: "#051a02",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 100%)",
          }}
        />
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
                  href="/login"
                  className="flex items-center gap-2 font-libre text-gray-400 text-sm hover:text-hero-vibrant transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="flex items-center gap-2 font-libre text-gray-400 text-sm hover:text-accent-gold transition-colors"
                >
                  <Heart className="h-4 w-4" />
                  Unterstützung
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





