"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Package, Truck } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import {
  MALANTHIR_ORE_LORE_ID,
  RESOURCE_LORE_FALLBACK,
  VATTRAK_ORE_LORE_ID,
  type ResourceLoreCard,
} from "./aurenfurt-resource-lore";
import type { VattrakDemandBuckets, VattrakStockSnapshot } from "./aurenfurt-vattrak-stock";
import { VATTRAK_STOCK_CAP } from "./aurenfurt-vattrak-stock";

type Props = {
  stock: VattrakStockSnapshot;
};

function germanDayLabel(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}.${Number(m)}.${y}`;
}

const BUCKET_META: Array<{
  key: keyof VattrakDemandBuckets;
  label: string;
  color: string;
}> = [
  { key: "front", label: "Front", color: "#cab926" },
  { key: "temple", label: "Tempel", color: "#e7b6c9" },
  { key: "craft", label: "Handwerk", color: "#38bdf8" },
  { key: "nobles", label: "Adel", color: "#d4a574" },
];

function rationMeta(level: VattrakStockSnapshot["level"]) {
  if (level === "critical") return { label: "Kritisch", className: "text-red-300 border-red-400/50 bg-red-950/40" };
  if (level === "rationed")
    return { label: "Rationiert", className: "text-accent-gold border-accent-gold/40 bg-amber-950/30" };
  return { label: "Ruhig", className: "text-hero-vibrant border-hero-border/60 bg-hero-dark/30" };
}

function truncate(text: string, max = 120) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function DistributionBars({
  demand,
  served,
}: {
  demand: VattrakDemandBuckets;
  served: VattrakDemandBuckets;
}) {
  return (
    <ul className="space-y-2">
      {BUCKET_META.map((bucket) => {
        const need = Math.max(0.001, demand[bucket.key]);
        const got = served[bucket.key];
        const pct = Math.max(0, Math.min(100, Math.round((got / need) * 100)));
        return (
          <li key={bucket.key}>
            <div className="mb-0.5 flex items-baseline justify-between gap-2">
              <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
                {bucket.label}
              </span>
              <span className="font-libre text-[10px] tabular-nums text-gray-400">
                {got.toFixed(2)} / {need.toFixed(2)} · {pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/45">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: bucket.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LoreTile({ card, accent }: { card: ResourceLoreCard; accent: string }) {
  return (
    <div className="overflow-hidden rounded border border-hero-dark/70 bg-background-dark/50">
      <div className="relative aspect-[5/3] w-full bg-black/40">
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={card.name}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-6">
          <p className="font-cinzel text-xs font-bold" style={{ color: accent }}>
            {card.name}
          </p>
        </div>
      </div>
      <p className="px-2 py-1.5 font-libre text-[10px] leading-snug text-gray-300">
        {truncate(card.description, 110)}
      </p>
    </div>
  );
}

export function VattrakLagerCard({ stock }: Props) {
  const [vattrakLore, setVattrakLore] = useState(RESOURCE_LORE_FALLBACK.vattrak);
  const [malanthirLore, setMalanthirLore] = useState(RESOURCE_LORE_FALLBACK.malanthir);
  const ration = rationMeta(stock.level);
  const fillPct = Math.max(0, Math.min(100, Math.round((stock.stock / VATTRAK_STOCK_CAP) * 100)));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await (supabase.from("world_lore") as any)
          .select("id, name, description, image_url, default_image_url")
          .in("id", [VATTRAK_ORE_LORE_ID, MALANTHIR_ORE_LORE_ID]);
        if (cancelled || !Array.isArray(data)) return;
        for (const row of data as Array<Record<string, unknown>>) {
          const id = String(row.id ?? "");
          const imageUrl =
            (typeof row.image_url === "string" && row.image_url.trim()) ||
            (typeof row.default_image_url === "string" && row.default_image_url.trim()) ||
            null;
          const card: ResourceLoreCard = {
            id,
            name: String(row.name ?? ""),
            description: String(row.description ?? ""),
            imageUrl,
          };
          if (id === VATTRAK_ORE_LORE_ID) setVattrakLore({ ...RESOURCE_LORE_FALLBACK.vattrak, ...card });
          if (id === MALANTHIR_ORE_LORE_ID) setMalanthirLore({ ...RESOURCE_LORE_FALLBACK.malanthir, ...card });
        }
      } catch {
        /* Fallback bleibt */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article className="overflow-hidden rounded-md border border-hero-border/70 bg-background-card shadow-lg">
      <div
        className="relative border-b border-hero-dark/80 px-4 py-3"
        style={{
          backgroundImage: "url('/images/dark-marmor.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-background-dark/55" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Stadtweites Erz-Lager
            </p>
            <h3 className="font-cinzel text-lg font-bold text-accent-gold">Vattrak-Lager</h3>
            <p className="mt-0.5 font-libre text-[11px] text-gray-300">{stock.cutHint}</p>
          </div>
          <span
            className={`shrink-0 rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide ${ration.className}`}
          >
            {ration.label}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <LoreTile card={vattrakLore} accent="#379806" />
          <LoreTile card={malanthirLore} accent="#a78bfa" />
        </div>

        <div>
          <div className="mb-1 flex items-end justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-hero-vibrant" aria-hidden />
              <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Bestand
              </span>
            </div>
            <span className="font-barlow text-xl font-extrabold tabular-nums text-hero-vibrant">
              {stock.stock}
              <span className="ml-1 text-[10px] font-bold text-gray-500">/ {VATTRAK_STOCK_CAP}</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full border border-hero-dark/70 bg-black/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-hero-dark via-hero-vibrant to-accent-gold"
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-libre text-[11px] text-gray-300">
            <span>
              Zufluss <strong className="text-white">{stock.supply}</strong>
              {stock.convoySupply > 0 ? (
                <span className="text-accent-gold"> (Karawane +{stock.convoySupply})</span>
              ) : null}
            </span>
            <span>
              Bedarf <strong className="text-white">{stock.demand}</strong>
            </span>
          </div>
        </div>

        <div className="rounded border border-hero-dark/60 bg-background-dark/45 px-3 py-2.5">
          <div className="mb-2 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-accent-gold" aria-hidden />
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
              Nächste Lieferung
            </p>
          </div>
          <p className="font-libre text-sm text-gray-100">{stock.nextDelivery.label}</p>
          <p className="mt-0.5 font-libre text-[10px] text-gray-500">
            Geplant: {germanDayLabel(stock.nextDelivery.dayIso)}
            {stock.nextDelivery.daysUntil === 0 ? " · heute eingeplant" : ""}
          </p>
        </div>

        <div>
          <p className="mb-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Verteilung heute (Priorität Front → Tempel → Handwerk → Adel)
          </p>
          <DistributionBars demand={stock.demandBuckets} served={stock.servedBuckets} />
        </div>

        <p className="font-libre text-[10px] leading-snug text-gray-500">
          Knappheit senkt den Vattrak-Meter und treibt Malanthir sowie Kriminalität — zuerst leiden Handwerk und
          Adel, dann der Tempel, zuletzt die Front.
        </p>
      </div>
    </article>
  );
}
