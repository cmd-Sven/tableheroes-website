"use client";

import Link from "next/link";
import { Sparkles, Mail, MessageCircle, Instagram, Home, Settings, LogIn } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background-dark border-t border-hero-border/30">
      {/* Top Section - Contact Banner */}
      <div className="bg-hero-dark/20 border-b border-hero-border/30">
        <div className="container mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center text-center gap-6">
            <div>
              <h2 className="font-barlow font-bold text-2xl uppercase text-white mb-2">
                Du hast Fragen oder willst mitmachen?
              </h2>
              <p className="font-libre text-gray-300 text-lg max-w-2xl">
                Wir sind immer offen für neue Gesichter. Schreib uns einfach oder komm auf unseren Server.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:kontakt@tableheroes.de"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-hero-border bg-hero-vibrant px-6 py-3 font-barlow font-bold uppercase text-background-dark shadow-lg transition-transform hover:scale-[1.02]"
              >
                <Mail className="h-5 w-5" />
                E-Mail schreiben
              </a>
              <a
                href="https://discord.gg/tableheroes"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-hero-border/60 bg-background-card px-6 py-3 font-barlow font-bold uppercase text-gray-100 transition-colors hover:bg-background-card/80"
              >
                <MessageCircle className="h-5 w-5" />
                Zum Discord
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Navigation & Socials */}
      <div className="container mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 - Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-accent-gold" />
              <span className="font-barlow font-bold text-xl uppercase tracking-wide text-hero-vibrant">
                TableHeroes
              </span>
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
                href="https://discord.gg/tableheroes"
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
        <div className="mt-12 pt-8 border-t border-hero-border/20 text-center">
          <p className="font-libre text-gray-500 text-sm">
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> TableHeroes — 
            Deine Pen &amp; Paper Community in Osnabrück
          </p>
        </div>
      </div>
    </footer>
  );
}





