"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Calendar,
  Monitor,
  ScrollText,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";

export type HeroSlideId = "updates" | "features" | "membership";

const SLIDES: { id: HeroSlideId; label: string }[] = [
  { id: "updates", label: "Updates" },
  { id: "features", label: "Features" },
  { id: "membership", label: "Mitglied werden" },
];

const PLAYER_FEATURES = [
  { icon: Monitor, title: "Live-Bühne", text: "Party, Initiative & Log am Session-Abend" },
  { icon: Swords, title: "Charakterblatt", text: "Held, Inventar & Fraktionsruf" },
  { icon: ScrollText, title: "Session-Recap", text: "Kurz nachlesen vor dem nächsten Termin" },
  { icon: Sparkles, title: "Entdeckte Lore", text: "NSCs & Orte — nur was ihr freigeschaltet habt" },
  { icon: Calendar, title: "Termine & RSVP", text: "Zusage, Absage oder online dabei sein" },
  { icon: Trophy, title: "Punkte & Rang", text: "Teilnahme belohnt, Achievements sammeln" },
] as const;

export function HeroSlideBox() {
  const [activeSlide, setActiveSlide] = useState<HeroSlideId>("updates");

  return (
    <div className="marketing-hero-slide-box w-full max-w-sm">
      <div className="marketing-hero-slide-tablist" role="tablist" aria-label="Hero-Inhalte">
        {SLIDES.map(({ id, label }) => {
          const isActive = activeSlide === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`hero-slide-${id}`}
              id={`hero-tab-${id}`}
              onClick={() => setActiveSlide(id)}
              className={`marketing-hero-slide-tab sm:text-[11px] ${
                isActive ? "marketing-hero-slide-tab--active" : ""
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="relative min-h-[240px] p-4 sm:p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            id={`hero-slide-${activeSlide}`}
            role="tabpanel"
            aria-labelledby={`hero-tab-${activeSlide}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {activeSlide === "updates" && <UpdatesSlide />}
            {activeSlide === "features" && <FeaturesSlide />}
            {activeSlide === "membership" && <MembershipSlide />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function UpdatesSlide() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            border: "1px solid rgba(202, 185, 38, 0.45)",
            backgroundColor: "rgba(202, 185, 38, 0.15)",
          }}
        >
          <Bot className="h-4 w-4" style={{ color: "#cab926" }} aria-hidden />
        </div>
        <div>
          <p
            className="font-barlow text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(202, 185, 38, 0.85)" }}
          >
            Neuestes Update
          </p>
          <h3 className="font-cinzel text-base font-bold text-white sm:text-lg">Der Chronist</h3>
        </div>
      </div>
      <p className="font-libre text-xs leading-relaxed text-gray-300 sm:text-sm">
        Unser Chronist hört während eurer Session mit, fasst das Geschehen zusammen und stellt
        daraus ein Spieler-Recap zusammen — damit ihr vor dem nächsten Termin wieder wisst, wer
        was getan hat und wohin die Geschichte geht.
      </p>
      <p className="font-libre text-[11px] leading-relaxed text-gray-500">
        Der GM prüft und gibt das Recap frei — ihr findet es in eurer Kampagne, sobald es
        veröffentlicht ist.
      </p>
    </div>
  );
}

function FeaturesSlide() {
  return (
    <div className="space-y-3">
      <div>
        <p
          className="font-barlow text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(202, 185, 38, 0.85)" }}
        >
          Für Spieler
        </p>
        <h3 className="font-cinzel text-base font-bold text-white sm:text-lg">
          Dein Abenteuer — digital begleitet
        </h3>
      </div>
      <ul className="grid grid-cols-2 gap-1.5">
        {PLAYER_FEATURES.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            className="flex items-start gap-1.5 rounded-md px-2 py-1.5"
            style={{
              border: "1px solid rgba(35, 199, 99, 0.25)",
              backgroundColor: "rgba(10, 31, 16, 0.65)",
            }}
          >
            <Icon className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "#cab926" }} aria-hidden />
            <span className="min-w-0">
              <span className="block font-barlow text-[9px] font-bold uppercase text-gray-200">
                {title}
              </span>
              <span className="block font-libre text-[9px] leading-snug text-gray-500">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="#features"
        className="inline-block font-barlow text-[10px] font-bold uppercase tracking-wide underline-offset-2 hover:underline"
        style={{ color: "#cab926" }}
      >
        Alle Features ansehen
      </Link>
    </div>
  );
}

function MembershipSlide() {
  return (
    <div className="space-y-3">
      <div>
        <p
          className="font-barlow text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(202, 185, 38, 0.85)" }}
        >
          Community
        </p>
        <h3 className="font-cinzel text-base font-bold text-white sm:text-lg">Mitglied werden</h3>
      </div>
      <p className="font-libre text-xs leading-relaxed text-gray-300 sm:text-sm">
        Registriere dich und erhalte Zugriff auf das Spieler-Dashboard: Kampagnen entdecken,
        bewerben, Charakter anlegen und Termine im Blick behalten.
      </p>
      <Link href="/signup" className="btn-player-edit-gold">
        Jetzt registrieren
      </Link>
    </div>
  );
}
