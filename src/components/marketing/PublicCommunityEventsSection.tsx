"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, UserPlus } from "lucide-react";
import {
  COMMUNITY_EVENT_KIND_LABELS,
  type CommunityEvent,
} from "@/src/lib/community-events/types";
import { APP_TIMEZONE } from "@/src/lib/datetime/berlin";

type Props = {
  events: CommunityEvent[];
};

function formatWhen(iso: string) {
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

export function PublicCommunityEventsSection({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <section className="relative z-20 border-t border-hero-dark/60 bg-background-dark/80 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <h2 className="marketing-section-h2">Termine &amp; Einladungen</h2>
          <p className="mt-3 font-libre text-gray-400 max-w-2xl mx-auto">
            Stammtisch, Feiern oder Spielplanung vor dem ersten Abenteuer — melde dich
            an, um teilzunehmen.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const { date, time } = formatWhen(event.start_time);
            const kind =
              COMMUNITY_EVENT_KIND_LABELS[event.event_kind] ?? event.event_kind;
            const isPlanning = event.event_kind === "Spielplanung";

            return (
              <motion.article
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`rounded-lg border p-5 ${
                  isPlanning
                    ? "border-accent-gold/40 bg-accent-gold/5"
                    : "border-hero-border/40 bg-background-card/80"
                }`}
              >
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wider text-hero-vibrant">
                  {isPlanning ? "Einladung · Spielplanung" : kind}
                </p>
                <h3 className="mt-1 font-cinzel text-lg font-bold text-white">
                  {event.title}
                </h3>
                {event.description ? (
                  <p className="mt-2 line-clamp-3 font-libre text-sm text-gray-400">
                    {event.description}
                  </p>
                ) : null}
                <div className="mt-4 space-y-1.5 font-barlow text-xs text-gray-300">
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
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
