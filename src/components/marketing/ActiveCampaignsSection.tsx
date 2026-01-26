"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabaseClient";
import {
  CampaignListAnimation,
  type SessionTicket,
} from "@/src/components/marketing/CampaignListAnimation";
import { FireEffect } from "@/src/components/marketing/FireEffect";

const RUNES = ["ᚱ", "ᚦ", "ᚨ", "ᚲ", "ᚾ", "ᚺ", "ᛃ", "ᛟ"];

// DB Types (manuell gemappt aus Query-Result)
type UserRow = {
  username: string | null;
  avatar_url: string | null;
};

type SessionRow = {
  id: string;
  start_time: string | null;
  status: string | null;
};

type CampaignWithRelations = {
  id: string;
  name: string | null;
  system: string | null;
  max_players: number | null;
  mode: string | null;
  banner_url: string | null;
  gm: UserRow | null;
  sessions: SessionRow[];
};

export function ActiveCampaignsSection() {
  const [tickets, setTickets] = useState<SessionTicket[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        // 1. Fetch Campaigns + GM + Sessions
        const { data, error } = await supabase
          .from("campaigns")
          .select(
            `
        id,
        name,
        system,
        max_players,
        mode,
        banner_url,
        gm:users!gm_id (username, avatar_url),
        sessions (id, start_time, status)
      `
          )
          .eq("status", "Active")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("ActiveCampaignsSection Fetch Error:", error.message);
          if (isMounted) {
            setTickets([]);
            setIsLoading(false);
          }
          return;
        }

        if (!data) {
          if (isMounted) {
            setTickets([]);
            setIsLoading(false);
          }
          return;
        }

        // Casten, weil Supabase Types manchmal tricky sind bei Deep Joins
        const campaigns = data as unknown as CampaignWithRelations[];

        const now = new Date();

        // 2. JS-Logik: Nächste Session finden & Sortieren
        const relevantCampaigns = campaigns
          .map((c) => {
            if (!c.sessions) return null;
            const futureSessions = c.sessions
              .filter((s) => s.start_time && new Date(s.start_time) > now)
              .sort(
                (a, b) =>
                  new Date(a.start_time!).getTime() -
                  new Date(b.start_time!).getTime()
              );

            if (futureSessions.length === 0) return null;

            return {
              campaign: c,
              nextSession: futureSessions[0],
              dateObj: new Date(futureSessions[0].start_time!),
            };
          })
          .filter((item) => item !== null) as {
          campaign: CampaignWithRelations;
          nextSession: SessionRow;
          dateObj: Date;
        }[];

        // Sort by Date Ascending
        relevantCampaigns.sort(
          (a, b) => a.dateObj.getTime() - b.dateObj.getTime()
        );

        // Limit 3
        const top3 = relevantCampaigns.slice(0, 3);

        // Final Mapping & Async Member Count fetching
        const finalTickets: SessionTicket[] = [];

        for (const item of top3) {
          const { campaign: c, dateObj } = item;

          // Slots fetch (immer noch in Loop, bei 3 Items okay)
          let currentPlayers = 0;
          const { count, error: countError } = await supabase
            .from("campaign_members")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", c.id)
            .eq("status", "Accepted");

          if (countError) {
            console.error(
              `❌ Count Error for Campaign ${c.id}:`,
              countError
            );
          }

          if (count !== null) currentPlayers = count;
          const max = c.max_players || 0;
          const freeSlots = Math.max(0, max - currentPlayers);

          // Debug Logging in Development
          if (process.env.NODE_ENV === "development") {
            console.log(
              `🎟️ Campaign "${c.name}": ${currentPlayers}/${max} occupied, ${freeSlots} free slots`
            );
          }

          // Visual Label mit Farbcodierung
          let slotsLabel = "";
          if (max === 0) {
            slotsLabel = "Auf Anfrage";
          } else if (freeSlots === 0) {
            slotsLabel = `Voll (${max}/${max})`;
          } else {
            slotsLabel = `${freeSlots}/${max} Plätze frei`;
          }

          const dateFormatter = new Intl.DateTimeFormat("de-DE", {
            weekday: "short",
            day: "numeric",
            month: "short",
            timeZone: "Europe/Berlin",
          });
          const timeFormatter = new Intl.DateTimeFormat("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Berlin",
          });

          finalTickets.push({
            campaignId: c.id,
            campaignName: c.name || "Unbenanntes Abenteuer",
            gameSystem: c.system || "System offen",
            gmUsername: c.gm?.username || "Unbekannt",
            gmAvatarUrl: c.gm?.avatar_url || null,
            bannerUrl: c.banner_url || null,
            location: c.mode || "Online",
            dateString: dateFormatter.format(dateObj),
            timeString: `${timeFormatter.format(dateObj)} Uhr`,
            slotsLabel,
          });
        }

        if (isMounted) {
          setTickets(finalTickets);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("ActiveCampaignsSection unexpected error:", err);
        if (isMounted) {
          setTickets([]);
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const finalTickets = tickets ?? [];

  return (
    <section
      id="campaigns"
      className="relative scroll-mt-20 bg-background-dark"
      style={{
        backgroundImage: "url('/images/dark-wood.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        boxShadow: "0 -15px 40px rgba(0, 0, 0, 0.6), 0 15px 40px rgba(0, 0, 0, 0.6)",
        zIndex: 10,
      }}
    >
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center w-full">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8 inline-block"
            >
              Aktuelle Runden in Osnabrück &amp; Online
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-libre text-gray-200 leading-relaxed max-w-3xl mx-auto"
            >
              Hier findest du unsere laufenden Abenteuer. Egal ob Anfänger oder Veteran – such dir einen Platz am Tisch.
            </motion.p>
          </div>

          {finalTickets.length === 0 && (
            <div
              className="px-8 py-4 text-center flex items-center justify-center"
              style={{
                backgroundImage: "url('/images/comingSoon-note.webp')",
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                borderRadius: "4px",
                minHeight: "250px",
                minWidth: "250px",
              }}
            >
              <p className="font-libre text-slate-900">
                Termine demnächst<br />verfügbar!
              </p>
            </div>
          )}
        </div>

        {finalTickets.length > 0 && <CampaignListAnimation tickets={finalTickets} />}
      </div>

      {/* Vertikal zentrierte Wand-Fackeln links und rechts mit Feuer-Effekt */}
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
        <div className="relative">
          <Image
            src="/images/wall-torch.png"
            alt=""
            width={192}
            height={384}
            className="w-24 lg:w-48 xl:w-56 h-auto object-contain"
            style={{ height: "auto" }}
          />
          {/* Feuer-Effekt - Positioniert bei ca. 10% von oben (Brennschale) */}
          <div className="absolute top-[10%] left-0 right-0 -mt-24" style={{ height: "12em" }}>
            <FireEffect />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
        <div className="relative">
          <Image
            src="/images/wall-torch.png"
            alt=""
            width={192}
            height={384}
            className="w-24 lg:w-48 xl:w-56 h-auto object-contain"
            style={{ height: "auto" }}
          />
          {/* Feuer-Effekt - Positioniert bei ca. 10% von oben (Brennschale) */}
          <div className="absolute top-[10%] left-0 right-0 -mt-24" style={{ height: "12em" }}>
            <FireEffect />
          </div>
        </div>
      </div>

      {/* Dekorative Eck-Grafiken: Skull in allen vier Ecken */}
      {/* Oben Links: Skull (horizontal und vertikal gespiegelt) */}
      <div className="pointer-events-none absolute top-0 left-0 z-30 hidden md:block">
        <Image
          src="/images/skull-corner-only.png"
          alt=""
          width={70}
          height={70}
          className="max-w-[70px] h-auto scale-x-[-1] scale-y-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      {/* Unten Links: Skull (horizontal gespiegelt) mit 12px Abstand */}
      <div className="pointer-events-none absolute bottom-[12px] left-0 z-30 hidden md:block">
        <Image
          src="/images/skull-corner-only.png"
          alt=""
          width={70}
          height={70}
          className="max-w-[70px] h-auto scale-x-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      {/* Oben Rechts: Skull (vertikal gespiegelt) */}
      <div className="pointer-events-none absolute top-0 right-0 z-30 hidden md:block">
        <Image
          src="/images/skull-corner-only.png"
          alt=""
          width={70}
          height={70}
          className="max-w-[70px] h-auto scale-y-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      {/* Unten Rechts: Skull mit 12px Abstand */}
      <div className="pointer-events-none absolute bottom-[12px] right-0 z-30 hidden md:block">
        <Image
          src="/images/skull-corner-only.png"
          alt=""
          width={70}
          height={70}
          className="max-w-[70px] h-auto"
          style={{ height: "auto" }}
        />
      </div>

      {/* Glühende Runen-Reihe am unteren Rand */}
      <div className="pointer-events-none absolute bottom-[20px] left-0 w-full flex justify-center z-30">
        <div className="flex w-full max-w-6xl justify-between px-4 md:px-6 lg:px-8">
          {RUNES.map((rune, index) => (
            <span
              key={`${rune}-${index}`}
              className={[
                "rune-glow font-cinzel tracking-[0.35em]",
                "text-[9px] md:text-xs lg:text-sm",
                index >= 6 ? "hidden sm:inline-block" : "",
              ].join(" ")}
              style={{ animationDelay: `${index * 1.25}s` }}
            >
              {rune}
            </span>
          ))}
        </div>
      </div>

      {/* Goldene, sich wiederholende Border zwischen Sektionen */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4" style={{ zIndex: 4 }}>
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

      <style jsx>{`
        .rune-glow {
          color: #ffe8c7;
          text-shadow: 0 0 5px #ff4500, 0 0 10px #ff4500, 0 0 20px #ff0000;
          opacity: 0;
          animation: rune-pulse 6s ease-in-out infinite;
        }

        @keyframes rune-pulse {
          0% {
            opacity: 0;
            text-shadow: 0 0 2px #7f1d1d, 0 0 4px #7f1d1d, 0 0 8px #7f1d1d;
            transform: translate3d(0, 0, 0) scale(0.95);
          }
          20% {
            opacity: 1;
            text-shadow: 0 0 5px #ff4500, 0 0 12px #ff4500, 0 0 24px #ff0000;
            transform: translate3d(0, -1px, 0) scale(1.05);
          }
          50% {
            opacity: 0.85;
            text-shadow: 0 0 4px #ff7a1a, 0 0 10px #ff7a1a, 0 0 20px #ff4500;
            transform: translate3d(0, 0, 0) scale(1.02);
          }
          80% {
            opacity: 0.4;
            text-shadow: 0 0 3px #b91c1c, 0 0 6px #b91c1c, 0 0 12px #7f1d1d;
            transform: translate3d(0, 1px, 0) scale(0.98);
          }
          100% {
            opacity: 0;
            text-shadow: 0 0 2px #7f1d1d, 0 0 4px #7f1d1d, 0 0 8px #7f1d1d;
            transform: translate3d(0, 0, 0) scale(0.95);
          }
        }

      `}</style>
    </section>
  );
}
