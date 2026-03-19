"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sword } from "lucide-react";

export type DiscoverableCampaign = {
  id: string;
  name: string;
  system: string | null;
  banner_url: string | null;
  description: string | null;
  mode: string | null;
  frequency: string | null;
  schedule_day: number | null;
  schedule_time: string | null;
  schedule_interval: string | null;
};

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const INTERVAL_LABELS: Record<string, string> = {
  weekly: "Jeden",
  biweekly: "Alle 2 Wochen,",
  monthly: "Monatlich,",
};

function formatSchedule(c: DiscoverableCampaign): string | null {
  if (c.schedule_interval && c.schedule_day !== null && c.schedule_day !== undefined && c.schedule_time) {
    const prefix = INTERVAL_LABELS[c.schedule_interval] ?? "";
    const day = DAY_NAMES[c.schedule_day] ?? "";
    const time = c.schedule_time.slice(0, 5);
    return `${prefix} ${day}, ${time} Uhr`.trim();
  }
  return c.frequency || null;
}

type Props = {
  discoverableCampaigns: DiscoverableCampaign[];
};

const CARD_WIDTH = 280;
const GAP = 24;
const SLIDER_THRESHOLD = 2;

function CampaignTicketCard({
  campaign,
  compact = false,
}: {
  campaign: DiscoverableCampaign;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group block w-full overflow-hidden rounded-lg border border-hero-border bg-background-card shadow-lg transition-all hover:scale-[1.02] hover:border-hero-vibrant shrink-0"
      style={{ width: compact ? 240 : CARD_WIDTH }}
    >
      <div
        className={`relative overflow-hidden bg-linear-to-br from-hero-dark to-background-dark ${
          compact ? "h-28" : "h-40"
        }`}
        style={{
          backgroundImage: campaign.banner_url ? `url(${campaign.banner_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-background-dark via-background-dark/60 to-transparent" />
        <div className="absolute top-2 left-2">
          <span className="inline-block rounded bg-hero-dark/90 px-2 py-1 font-barlow font-bold uppercase text-xs text-white shadow-lg">
            {campaign.system || "System"}
          </span>
        </div>
      </div>
      <div className={compact ? "p-3" : "p-4"}>
        <h3
          className={`font-cinzel font-bold truncate ${
            compact ? "text-base" : "text-lg"
          } text-accent-gold mb-1 group-hover:text-white transition-colors`}
        >
          {campaign.name}
        </h3>
        {!compact && campaign.description && (
          <p className="font-libre text-sm text-gray-400 leading-relaxed mb-2 line-clamp-2">
            {campaign.description}
          </p>
        )}
        {formatSchedule(campaign) && (
          <p className="font-barlow text-xs text-gray-500 uppercase mb-2">{formatSchedule(campaign)}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="font-barlow font-bold uppercase text-xs text-hero-vibrant group-hover:text-white transition-colors">
            Ansehen &rarr;
          </span>
          {campaign.mode && (
            <span className="rounded bg-background-dark px-2 py-0.5 font-barlow text-xs text-gray-500">
              {campaign.mode}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function OpenCampaignsCard({ discoverableCampaigns }: Props) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const useSlider = discoverableCampaigns.length > SLIDER_THRESHOLD;
  const maxIndex = Math.max(0, Math.ceil(discoverableCampaigns.length / 2) - 1);

  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [maxIndex, index]);

  if (discoverableCampaigns.length === 0) {
    return (
      <div className="w-full p-4">
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hero-dark bg-background-card/50 py-12 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border border-hero-border">
            <Sword className="h-8 w-8 text-accent-gold" />
          </div>
          <h3 className="mb-2 font-cinzel font-bold text-xl text-white">Keine offenen Runden</h3>
          <p className="max-w-sm font-libre text-gray-400">
            Aktuell sind keine Kampagnen verfügbar. Schau später wieder vorbei!
          </p>
        </div>
      </div>
    );
  }

  if (!useSlider) {
    return (
      <div className="w-full p-4">
        <div className="flex w-full gap-6 flex-wrap">
          {discoverableCampaigns.map((c) => (
            <CampaignTicketCard key={c.id} campaign={c} />
          ))}
        </div>
      </div>
    );
  }

  const offset = -index * (CARD_WIDTH + GAP) * 2;
  return (
    <div className="w-full p-4">
      <div className="relative w-full overflow-hidden">
        <div ref={containerRef} className="overflow-hidden w-full">
          <motion.div
            className="flex w-full gap-6"
            initial={false}
            animate={{ x: offset }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
            style={{ width: "max-content" }}
          >
            {discoverableCampaigns.map((c) => (
              <CampaignTicketCard key={c.id} campaign={c} />
            ))}
          </motion.div>
        </div>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-hero-border bg-background-card/95 text-accent-gold shadow-lg hover:bg-hero-dark hover:border-hero-vibrant disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="Vorherige Kampagnen"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(maxIndex, i + 1))}
          disabled={index >= maxIndex}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-hero-border bg-background-card/95 text-accent-gold shadow-lg hover:bg-hero-dark hover:border-hero-vibrant disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="Nächste Kampagnen"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-accent-gold" : "w-2 bg-hero-border/60 hover:bg-hero-border"
              }`}
              aria-label={`Seite ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
