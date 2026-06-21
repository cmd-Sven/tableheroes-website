"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, User, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SlotProgressBar } from "@/src/components/marketing/SessionTicketCardParts";

// Eigener Typ für die UI-Darstellung (bereits aufbereitete Daten)
export type SessionTicket = {
  campaignId: string;
  campaignName: string;
  /** Anzeigename des nächsten Termins (optional) */
  sessionTitle?: string | null;
  gameSystem: string;
  gmUsername: string;
  gmAvatarUrl: string | null;
  bannerUrl: string | null;
  location: string;
  dateString: string; // "Fr., 12. Okt."
  timeString: string; // "19:00 Uhr"
  slotsLabel: string; // "2/5 Plätze belegt"
  currentPlayers: number;
  maxPlayers: number;
  /** Sortierung im Landing-Karussell */
  startTimeMs?: number;
  /** GM: Text „Alle Gruppenplätze voll“ (unabhängig vom Ist-Stand) */
  registrationClosedOnLanding?: boolean;
  /** false = keine Plätze-Anzeige auf der Karte */
  showOpenSlotsOnLanding?: boolean;
  /** false = kein Session-Titel trotz gesetztem Namen */
  showSessionTitleOnLanding?: boolean;
};

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */
export function CampaignListAnimation({ tickets }: { tickets: SessionTicket[] }) {
  if (tickets.length === 0) {
    return null;
  }

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariant = {
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
          variants={cardVariant}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="group relative flex flex-col overflow-hidden rounded-xl border border-accent-gold/20 shadow-lg transition-all duration-300 hover:border-accent-gold/60 hover:shadow-[0_0_20px_rgba(202,185,38,0.2)]"
          style={{
            backgroundImage: "url('/images/dark-marmor.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <Link href={`/campaigns/${t.campaignId}`} className="flex flex-col h-full">
            {/* ── 1. Header: Datum & Zeit ── */}
            <div className="relative overflow-hidden p-5 text-center">
              {/* Banner Overlay */}
              {t.bannerUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-20"
                  style={{ backgroundImage: `url(${t.bannerUrl})` }}
                />
              )}
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent-gold/30 bg-black/40 px-4 py-1 mb-2 backdrop-blur-sm">
                  <Clock className="h-3.5 w-3.5 text-accent-gold" />
                  <span className="font-barlow font-bold text-sm uppercase tracking-wider text-accent-gold">
                    {t.timeString}
                  </span>
                </div>
                <div
                  className="font-barlow font-extrabold text-2xl uppercase tracking-wider text-transparent bg-clip-text"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #cab926 0%, #f5e6a3 40%, #cab926 60%, #a89320 100%)",
                  }}
                >
                  {t.dateString}
                </div>
              </div>

              {/* Goldene Trennlinie */}
              <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />
            </div>

            {/* ── 2. Ort ── */}
            <div className="px-5 py-2">
              <div className="flex items-center justify-center gap-1.5 font-barlow font-bold text-xs uppercase tracking-widest text-gray-500">
                <MapPin className="h-3 w-3 text-accent-gold/70" />
                {t.location}
              </div>
            </div>

            {/* ── 3. Body: Kampagne, System, GM ── */}
            <div className="flex flex-1 flex-col px-5 pb-5">
              {/* Kampagnen-Titel */}
              <h3 className="line-clamp-2 font-cinzel font-bold text-xl text-white/90 mb-1 group-hover:text-accent-gold transition-colors duration-300">
                {t.campaignName}
              </h3>
              {t.sessionTitle && t.showSessionTitleOnLanding !== false ? (
                <p className="line-clamp-2 font-barlow font-bold text-xs uppercase tracking-wide text-accent-gold/85 mb-3">
                  Termin: {t.sessionTitle}
                </p>
              ) : null}

              {/* System Badge */}
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 rounded border border-accent-gold/30 bg-black/50 px-2.5 py-1 font-barlow font-bold text-[11px] uppercase tracking-wider text-accent-gold/80">
                  <Sparkles className="h-3 w-3" />
                  {t.gameSystem}
                </span>
              </div>

              {/* GM Info */}
              <div className="mt-auto flex items-center gap-3 border-t border-accent-gold/10 pt-4">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-accent-gold/30 bg-black/50">
                  {t.gmAvatarUrl ? (
                    <Image
                      src={t.gmAvatarUrl}
                      alt="GM"
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <User className="h-4 w-4 text-accent-gold" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-barlow font-bold text-[10px] uppercase tracking-widest text-accent-gold/50">
                    Spielleitung
                  </span>
                  <span className="font-libre text-sm text-gray-300">
                    {t.gmUsername || "Unbekannt"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 4. Footer: Progress Bar + CTA ── */}
            <div className="border-t border-accent-gold/10 bg-black/30 px-5 py-4 space-y-3">
              {/* Progress */}
              <SlotProgressBar
                current={t.currentPlayers}
                max={t.maxPlayers}
                label={t.slotsLabel}
                registrationClosedOnLanding={t.registrationClosedOnLanding}
                showOpenSlotsOnLanding={
                  t.showOpenSlotsOnLanding !== false
                }
              />

              {/* CTA Button */}
              <div className="relative overflow-hidden rounded-md border border-accent-gold/40 bg-accent-gold/10 px-4 py-2.5 text-center transition-all duration-300 group-hover:bg-accent-gold/20 group-hover:border-accent-gold/60 group-hover:shadow-[0_0_12px_rgba(202,185,38,0.15)]">
                <span className="relative z-10 font-barlow font-bold text-sm uppercase tracking-wider text-accent-gold group-hover:text-white transition-colors duration-300">
                  Jetzt ansehen
                </span>
                {/* Hover-Glanz */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </div>
            </div>
          </Link>
        </motion.article>
      ))}
    </motion.div>
  );
}

