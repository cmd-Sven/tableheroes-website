"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { FireEffect } from "@/src/components/marketing/FireEffect";
import { SlotProgressBar } from "@/src/components/marketing/SessionTicketCardParts";
import {
  COMMUNITY_EVENT_KIND_LABELS,
  type CommunityEvent,
} from "@/src/lib/community-events/types";
import { APP_TIMEZONE } from "@/src/lib/datetime/berlin";
import {
  loadLandingSessionTickets,
  type SessionTicket,
} from "@/src/lib/marketing/load-landing-session-tickets";

const RUNES = ["ᚱ", "ᚦ", "ᚨ", "ᚲ", "ᚾ", "ᚺ", "ᛃ", "ᛟ"];

type LandingTerminItem =
  | { kind: "session"; id: string; sortTime: number; ticket: SessionTicket }
  | { kind: "event"; id: string; sortTime: number; event: CommunityEvent };

type Props = {
  events: CommunityEvent[];
};

function formatEventWhen(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return { date, time };
}

function SessionCard({ ticket }: { ticket: SessionTicket }) {
  return (
    <article
      className="group relative flex h-full min-h-[28rem] w-[min(88vw,22rem)] shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-accent-gold/20 shadow-lg transition-all duration-300 hover:border-accent-gold/60 hover:shadow-[0_0_20px_rgba(202,185,38,0.2)] sm:w-[min(44vw,22rem)] lg:w-[min(30vw,22rem)]"
      style={{
        backgroundImage: "url('/images/dark-marmor.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Link href={`/campaigns/${ticket.campaignId}`} className="flex h-full flex-col">
        <div className="relative overflow-hidden p-5 text-center">
          {ticket.bannerUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url(${ticket.bannerUrl})` }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          <div className="relative z-10">
            <p className="mb-2 font-barlow text-[10px] font-bold uppercase tracking-wider text-hero-vibrant">
              Laufende Runde
            </p>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-gold/30 bg-black/40 px-4 py-1 backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5 text-accent-gold" />
              <span className="font-barlow text-sm font-bold uppercase tracking-wider text-accent-gold">
                {ticket.timeString}
              </span>
            </div>
            <div
              className="font-barlow text-2xl font-extrabold uppercase tracking-wider text-transparent bg-clip-text"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #cab926 0%, #f5e6a3 40%, #cab926 60%, #a89320 100%)",
              }}
            >
              {ticket.dateString}
            </div>
          </div>
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />
        </div>

        <div className="px-5 py-2">
          <div className="flex items-center justify-center gap-1.5 font-barlow text-xs font-bold uppercase tracking-widest text-gray-500">
            <MapPin className="h-3 w-3 text-accent-gold/70" />
            {ticket.location}
          </div>
        </div>

        <div className="flex flex-1 flex-col px-5 pb-5">
          <h3 className="mb-1 line-clamp-2 font-cinzel text-xl font-bold text-white/90 transition-colors duration-300 group-hover:text-accent-gold">
            {ticket.campaignName}
          </h3>
          {ticket.sessionTitle && ticket.showSessionTitleOnLanding !== false ? (
            <p className="mb-3 line-clamp-2 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold/85">
              Termin: {ticket.sessionTitle}
            </p>
          ) : null}
          <div className="mb-5">
            <span className="inline-flex items-center gap-1.5 rounded border border-accent-gold/30 bg-black/50 px-2.5 py-1 font-barlow text-[11px] font-bold uppercase tracking-wider text-accent-gold/80">
              <Sparkles className="h-3 w-3" />
              {ticket.gameSystem}
            </span>
          </div>
          <div className="mt-auto flex items-center gap-3 border-t border-accent-gold/10 pt-4">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-accent-gold/30 bg-black/50">
              {ticket.gmAvatarUrl ? (
                <Image
                  src={ticket.gmAvatarUrl}
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
              <span className="font-barlow text-[10px] font-bold uppercase tracking-widest text-accent-gold/50">
                Spielleitung
              </span>
              <span className="font-libre text-sm text-gray-300">
                {ticket.gmUsername || "Unbekannt"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-accent-gold/10 bg-black/30 px-5 py-4">
          <SlotProgressBar
            current={ticket.currentPlayers}
            max={ticket.maxPlayers}
            label={ticket.slotsLabel}
            registrationClosedOnLanding={ticket.registrationClosedOnLanding}
            showOpenSlotsOnLanding={ticket.showOpenSlotsOnLanding !== false}
          />
          <div className="relative overflow-hidden rounded-md border border-accent-gold/40 bg-accent-gold/10 px-4 py-2.5 text-center transition-all duration-300 group-hover:border-accent-gold/60 group-hover:bg-accent-gold/20 group-hover:shadow-[0_0_12px_rgba(202,185,38,0.15)]">
            <span className="relative z-10 font-barlow text-sm font-bold uppercase tracking-wider text-accent-gold transition-colors duration-300 group-hover:text-white">
              Jetzt ansehen
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function EventCard({ event }: { event: CommunityEvent }) {
  const { date, time } = formatEventWhen(event.start_time);
  const kind = COMMUNITY_EVENT_KIND_LABELS[event.event_kind] ?? event.event_kind;
  const isPlanning = event.event_kind === "Spielplanung";

  return (
    <article
      className={`flex h-full min-h-[28rem] w-[min(88vw,22rem)] shrink-0 snap-center flex-col rounded-xl border p-5 shadow-lg sm:w-[min(44vw,22rem)] lg:w-[min(30vw,22rem)] ${
        isPlanning
          ? "border-accent-gold/40 bg-accent-gold/5"
          : "border-hero-border/40 bg-background-card/90"
      }`}
      style={{
        backgroundImage: isPlanning ? undefined : "url('/images/dark-marmor.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <p className="font-barlow text-[10px] font-bold uppercase tracking-wider text-hero-vibrant">
        {isPlanning ? "Einladung · Spielplanung" : kind}
      </p>
      <h3 className="mt-1 font-cinzel text-xl font-bold text-white">{event.title}</h3>
      {event.description ? (
        <p className="mt-2 line-clamp-4 font-libre text-sm text-gray-400">{event.description}</p>
      ) : (
        <p className="mt-2 font-libre text-sm text-gray-500">
          Community-Termin — werde Mitglied und nimm teil.
        </p>
      )}
      <div className="mt-auto space-y-1.5 pt-6 font-barlow text-xs text-gray-300">
        <p className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-accent-gold" />
          {date}
        </p>
        <p className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-accent-gold" />
          {time} Uhr
        </p>
        {event.location ? (
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-accent-gold" />
            {event.location}
          </p>
        ) : null}
      </div>
      <Link
        href="/signup"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded border border-hero-vibrant/50 bg-hero-vibrant/15 px-4 py-2.5 font-barlow text-xs font-bold uppercase text-hero-vibrant transition-colors hover:bg-hero-vibrant/25"
      >
        <UserPlus className="h-4 w-4" />
        Registrieren &amp; teilnehmen
      </Link>
    </article>
  );
}

export function TermineUndRundenSection({ events }: Props) {
  const [tickets, setTickets] = useState<SessionTicket[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    void loadLandingSessionTickets().then((rows) => {
      if (mounted) {
        setTickets(rows);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const items = useMemo<LandingTerminItem[]>(() => {
    const sessionItems: LandingTerminItem[] = (tickets ?? []).map((ticket) => ({
      kind: "session" as const,
      id: `session-${ticket.campaignId}`,
      sortTime: ticket.startTimeMs ?? 0,
      ticket,
    }));

    const eventItems: LandingTerminItem[] = events.map((event) => ({
      kind: "event",
      id: `event-${event.id}`,
      sortTime: new Date(event.start_time).getTime(),
      event,
    }));

    return [...sessionItems, ...eventItems].sort((a, b) => a.sortTime - b.sortTime);
  }, [events, tickets]);

  const updateScrollButtons = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [items, isLoading, updateScrollButtons]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-termin-card]");
    const gap = 24;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.9;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const showEmpty = !isLoading && items.length === 0;

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
      <div className="relative z-30 mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="marketing-section-h2"
          >
            Termine &amp; Runden in Osnabrück &amp; Online
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mx-auto mt-3 max-w-3xl font-libre leading-relaxed text-gray-200"
          >
            Laufende Kampagnen-Termine und offene Einladungen — vom Kennenlernen bis
            zum nächsten Abenteuer am Tisch.
          </motion.p>
        </div>

        {isLoading ? (
          <p className="text-center font-libre text-gray-400">Termine werden geladen…</p>
        ) : null}

        {showEmpty ? (
          <div className="flex items-center justify-center">
            <div
              className="flex min-h-[250px] min-w-[250px] items-center justify-center px-8 py-4 text-center"
              style={{
                backgroundImage: "url('/images/comingSoon-note.webp')",
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                borderRadius: "4px",
              }}
            >
              <p className="font-libre text-slate-900">
                Termine demnächst
                <br />
                verfügbar!
              </p>
            </div>
          </div>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <div className="relative">
            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Frühere Termine"
                  onClick={() => scrollByPage(-1)}
                  disabled={!canScrollLeft}
                  className="absolute -left-2 top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-accent-gold/40 bg-black/70 text-accent-gold shadow-lg transition hover:bg-accent-gold/20 disabled:pointer-events-none disabled:opacity-30 sm:-left-5"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Weitere Termine"
                  onClick={() => scrollByPage(1)}
                  disabled={!canScrollRight}
                  className="absolute -right-2 top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-accent-gold/40 bg-black/70 text-accent-gold shadow-lg transition hover:bg-accent-gold/20 disabled:pointer-events-none disabled:opacity-30 sm:-right-5"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}

            <div
              ref={scrollerRef}
              className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item) =>
                item.kind === "session" ? (
                  <div key={item.id} data-termin-card>
                    <SessionCard ticket={item.ticket} />
                  </div>
                ) : (
                  <div key={item.id} data-termin-card>
                    <EventCard event={item.event} />
                  </div>
                ),
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Dekoration */}
      <div className="pointer-events-none absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
        <div className="relative">
          <Image
            src="/images/wall-torch.png"
            alt=""
            width={192}
            height={384}
            className="h-auto w-24 object-contain lg:w-48 xl:w-56"
          />
          <div className="absolute left-0 right-0 top-[10%] -mt-24" style={{ height: "12em" }}>
            <FireEffect />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
        <div className="relative">
          <Image
            src="/images/wall-torch.png"
            alt=""
            width={192}
            height={384}
            className="h-auto w-24 object-contain lg:w-48 xl:w-56"
          />
          <div className="absolute left-0 right-0 top-[10%] -mt-24" style={{ height: "12em" }}>
            <FireEffect />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[20px] left-0 z-30 flex w-full justify-center">
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

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4" style={{ zIndex: 4 }}>
        <div
          className="h-full w-full"
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
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}
