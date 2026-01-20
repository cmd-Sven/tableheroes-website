"use client";

import { motion } from "framer-motion";
import { MapPin, User, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Eigener Typ für die UI-Darstellung (bereits aufbereitete Daten)
export type SessionTicket = {
  campaignId: string;
  campaignName: string;
  gameSystem: string;
  gmUsername: string;
  gmAvatarUrl: string | null;
  bannerUrl: string | null;
  location: string;
  dateString: string; // "Fr., 12. Okt."
  timeString: string; // "19:00 Uhr"
  slotsLabel: string; // "2/5 Plätze frei"
};

export function CampaignListAnimation({ tickets }: { tickets: SessionTicket[] }) {
  if (tickets.length === 0) {
    return (
      <div className="mt-12 flex justify-center">
        <div className="rounded-md border border-hero-border/30 bg-background-card px-8 py-4 text-center">
          <p className="font-libre text-gray-200">
            Termine stehen bald zur Verfügung.
          </p>
          <p className="mt-2 font-libre text-gray-400 text-sm">
            Schau pünktlich zum Launch wieder vorbei, um dir deinen Platz am Tisch zu sichern!
          </p>
        </div>
      </div>
    );
  }

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className="mt-10 grid gap-6 lg:grid-cols-3"
    >
      {tickets.map((t) => (
        <motion.article
          key={t.campaignId}
          variants={item}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="group relative flex flex-col overflow-hidden rounded-lg border border-hero-border/40 bg-background-card shadow-lg transition-all hover:border-hero-vibrant hover:shadow-xl"
        >
          <Link href={`/campaigns/${t.campaignId}`} className="flex flex-col h-full">
            {/* 1. Header (The "When") with Banner Background */}
            <div className="relative bg-hero-dark p-4 text-center overflow-hidden">
              {/* Banner Background (if exists) */}
              {t.bannerUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ backgroundImage: `url(${t.bannerUrl})` }}
                />
              )}
              <div className="relative z-10">
                <div className="font-barlow font-extrabold text-2xl uppercase tracking-wider text-white drop-shadow-md">
                  {t.dateString}
                </div>
                <div className="font-barlow font-bold text-hero-vibrant text-lg drop-shadow-md">
                  {t.timeString}
                </div>
              </div>
            </div>

          {/* 2. Sub-Header (The "Where") */}
          <div className="border-b border-hero-border/20 bg-background-card px-4 py-2 text-center">
            <div className="flex items-center justify-center gap-1 font-barlow font-bold text-sm uppercase tracking-wide text-gray-300">
              <MapPin className="h-3 w-3 text-accent-gold" />
              {t.location}
            </div>
          </div>

          {/* 3. Body (The "What") */}
          <div className="flex flex-1 flex-col p-6">
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-cinzel font-bold text-xl text-white group-hover:text-accent-gold transition-colors">
                {t.campaignName}
              </h3>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <span className="rounded bg-slate-800 px-2 py-0.5 font-barlow font-bold text-xs uppercase text-gray-300 border border-white/10">
                {t.gameSystem}
              </span>
            </div>

            {/* GM Info */}
            <div className="mt-auto flex items-center gap-3 border-t border-hero-border/20 pt-4">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-hero-border/40 bg-background-dark">
                {t.gmAvatarUrl ? (
                  <Image
                    src={t.gmAvatarUrl}
                    alt="GM"
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <User className="h-4 w-4 text-accent-gold" aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-barlow font-bold text-xs uppercase text-gray-500">
                  Spielleitung
                </span>
                <span className="font-libre text-sm text-gray-200">
                  {t.gmUsername || "Unbekannt"}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Footer (CTA / Slots) */}
          <div className="flex items-center justify-between bg-black/20 px-4 py-3 border-t border-hero-border/10">
            <div className="flex items-center gap-2 font-barlow font-bold text-sm uppercase text-hero-vibrant group-hover:text-white transition-colors">
              <span>Jetzt ansehen</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
            <span 
              className={`font-barlow font-bold text-sm uppercase ${
                t.slotsLabel.startsWith("Voll") || t.slotsLabel.startsWith("0/")
                  ? "text-red-400"
                  : t.slotsLabel === "Auf Anfrage"
                  ? "text-accent-gold"
                  : "text-gray-400"
              }`}
            >
              {t.slotsLabel}
            </span>
          </div>
          </Link>
        </motion.article>
      ))}
    </motion.div>
  );
}

