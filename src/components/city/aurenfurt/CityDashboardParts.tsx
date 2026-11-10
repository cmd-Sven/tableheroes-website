/**
 * UI-Bausteine und Chart-Helfer für das Stadt-Dashboard.
 * Einsatz: nur von CityDashboard importieren — hält die Hauptdatei unter 600 Zeilen.
 */

"use client";

import Image from "next/image";
import { useEffect, useId, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Briefcase,
  ChevronDown,
  Coins,
  Flower2,
  Hourglass,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type AnalyticsEvent,
  type AnalyticsFaction,
  type AnalyticsNpc,
  type AnalyticsPoint,
  type CityAnalytics,
  type DistrictRank,
} from "./aurenfurt-analytics";
import {
  loadCityFactionDashboardExtras,
  loadCityNpcDashboardExtras,
  type CityFactionDashboardExtras,
  type CityNpcDashboardExtras,
} from "./load-aurenfurt-npc-records";
import { AURENFURT_FACTIONS } from "./aurenfurt-factions";
import { SIM_METERS, type SimMeterKey } from "./aurenfurt-sim";

const MARBLE_BG = "/images/dark-marmor.webp";

export type ChartMetric = SimMeterKey | "tension";

type TipRow = { name?: string; value?: number | string; color?: string; dataKey?: string | number };

export const KPI_META: Record<SimMeterKey, { short: string; Icon: LucideIcon }> = {
  crime: { short: "Kriminalität", Icon: ShieldAlert },
  vattrak: { short: "Vattrak", Icon: Sparkles },
  malanthir: { short: "Malanthir", Icon: Skull },
  guard: { short: "Garde", Icon: Shield },
  refugees: { short: "Flüchtlinge", Icon: Users },
  economy: { short: "Wirtschaft", Icon: Coins },
  unemployment: { short: "Arbeitslos", Icon: Briefcase },
  elysia: { short: "Elysia", Icon: Flower2 },
  chromus: { short: "Chromus", Icon: Hourglass },
};

/** Abgeleitete Kennzahlen zusätzlich zu den Sim-Metern. */
export const DERIVED_KPI_META = {
  tension: { short: "Spannung", fullLabel: "Unzufriedenheit / Spannung", Icon: Activity, stroke: "#f0a36b" },
} as const;

export function ScopeChip({
  active,
  label,
  tint,
  crestSrc,
  onClick,
}: {
  active: boolean;
  label: string;
  tint?: string;
  /** Viertel-Wappen wie in der linken Rail. */
  crestSrc?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 font-barlow text-[11px] font-bold uppercase tracking-wide ${
        active ? "border-hero-vibrant bg-hero-vibrant/20 text-white" : "border-hero-border/50 text-gray-300 hover:text-white"
      }`}
    >
      {crestSrc ? (
        <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-accent-gold/40 bg-background-dark">
          <Image src={crestSrc} alt="" width={56} height={56} className="h-full w-full object-cover" />
        </span>
      ) : tint ? (
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tint }} />
      ) : null}
      {label}
    </button>
  );
}

/** Aufklappbarer Kategorieblock im Stadt-Dashboard. */
export function DashboardAccordion({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="mt-4 overflow-hidden rounded-md border border-hero-dark bg-background-card/80 shadow-lg">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 border-b border-hero-dark/50 px-4 py-3 text-left hover:bg-white/5"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-cinzel text-base font-bold text-accent-gold">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block font-libre text-xs text-gray-400">{subtitle}</span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-accent-gold transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="px-4 pb-4 pt-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function KpiCard({
  label,
  fullLabel,
  Icon,
  value,
  anchor,
  showAnchor,
  delta,
  tone,
  stroke,
  active,
  onSelect,
}: {
  label: string;
  fullLabel: string;
  Icon: LucideIcon;
  value: number;
  anchor: number;
  showAnchor: boolean;
  delta: number | undefined;
  tone: "up" | "down" | "neutral";
  stroke: string;
  active: boolean;
  onSelect: () => void;
}) {
  const deltaClass = tone === "up" ? "text-hero-vibrant" : tone === "down" ? "text-red-300" : "text-gray-400";
  return (
    <button
      type="button"
      onClick={onSelect}
      title={fullLabel}
      aria-label={`${fullLabel}: ${value}`}
      className={`rounded border bg-background-card px-2.5 py-2 text-left shadow-md transition ${
        active ? "border-hero-vibrant ring-1 ring-hero-vibrant/40" : "border-hero-dark hover:border-hero-border"
      }`}
    >
      <span className="flex items-center justify-between gap-1.5">
        <span className="truncate font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <Icon className="h-3 w-3 shrink-0" style={{ color: stroke }} aria-hidden />
      </span>
      <span className="mt-1 block font-barlow text-2xl font-extrabold leading-none tabular-nums tracking-wide text-white">
        {value}
      </span>
      <span className={`mt-1 block font-barlow text-[10px] font-bold tabular-nums ${deltaClass}`}>
        {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
      </span>
      {showAnchor ? (
        <span className="mt-0.5 block font-libre text-[10px] text-gray-500">Stichtag {anchor}</span>
      ) : null}
    </button>
  );
}

export function ChartCard({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-cinzel text-base font-bold text-accent-gold">{title}</h3>
        <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">{note}</p>
      </div>
      {children}
    </section>
  );
}

/** Zeile in „Fraktionen am Stichtag“ — Marmor + Wappen. */
export function FactionListButton({
  faction,
  active,
  emblemUrl = null,
  onClick,
}: {
  faction: AnalyticsFaction;
  active: boolean;
  emblemUrl?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-md border px-3 py-2.5 text-left shadow-md transition ${
        active
          ? "border-hero-vibrant ring-1 ring-hero-vibrant/35"
          : "border-hero-border/45 hover:border-hero-border"
      }`}
      style={{
        backgroundImage: `url('${MARBLE_BG}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <span className="pointer-events-none absolute inset-0 bg-background-dark/60" aria-hidden />
      <span className="relative z-10 flex w-full items-center gap-3">
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-accent-gold/40 bg-background-card">
          {emblemUrl ? (
            <Image
              src={emblemUrl}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
              unoptimized={emblemUrl.startsWith("http")}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-cinzel text-base font-bold text-accent-gold/80">
              {faction.name.slice(0, 1)}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-cinzel text-sm font-bold text-gray-100">{faction.name}</span>
          <span className="mt-0.5 block font-libre text-xs leading-snug text-gray-300 line-clamp-2">
            {faction.role}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
            Macht
          </span>
          <span className="block font-barlow text-lg font-extrabold tabular-nums text-accent-gold">
            {faction.power}
          </span>
        </span>
      </span>
    </button>
  );
}

export function Spotlight({
  title,
  rows,
  onOpen,
}: {
  title: string;
  rows: { name: string; value: number }[];
  onOpen: () => void;
}) {
  const [first, second] = rows;
  return (
    <button type="button" onClick={onOpen} className="rounded-md border border-hero-dark bg-background-card p-4 text-left shadow-lg">
      <span className="block font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">{title}</span>
      <span className="mt-1 block font-cinzel text-lg font-bold text-accent-gold">{first?.name ?? "—"}</span>
      <span className="block font-barlow text-2xl font-extrabold tabular-nums text-white">{first?.value ?? "—"}</span>
      {second ? (
        <span className="mt-1 block font-libre text-xs text-gray-400">
          danach {second.name} ({second.value})
        </span>
      ) : null}
    </button>
  );
}

export function DetailCard({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-md border border-hero-border bg-background-card p-4 shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-cinzel text-lg font-bold text-accent-gold">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-hero-dark p-1 text-gray-400 hover:text-white"
          aria-label="Detail schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </motion.article>
  );
}

export function FactionDetail({
  faction,
  factionHref = null,
  worldId = null,
  campaignId = null,
  onClose,
  onSelectMember,
}: {
  faction: AnalyticsFaction;
  factionHref?: string | null;
  worldId?: string | null;
  campaignId?: string | null;
  onClose?: () => void;
  onSelectMember?: (npcCatalogOrRecordHint: string) => void;
}) {
  const [extras, setExtras] = useState<CityFactionDashboardExtras | null>(null);

  useEffect(() => {
    let active = true;
    setExtras(null);
    void loadCityFactionDashboardExtras(faction.id).then((row) => {
      if (active) setExtras(row);
    });
    return () => {
      active = false;
    };
  }, [faction.id]);

  const displayName = extras?.name?.trim() || faction.name;
  const intro = extras?.intro?.trim() || faction.role;
  const loreExcerpt = extras?.loreExcerpt?.trim() || null;
  const emblemUrl = extras?.emblemUrl?.trim() || null;
  const bannerUrl = extras?.bannerUrl?.trim() || null;
  const members = extras?.members ?? [];
  const influences = [...faction.relationships]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 6);

  const loreHref =
    extras?.loreId && worldId
      ? campaignId
        ? `/dashboard/campaigns/${campaignId}/lore/${extras.loreId}`
        : `/dashboard/worlds/${worldId}/lore/${extras.loreId}`
      : null;

  return (
    <div
      className="relative overflow-hidden rounded-md border border-hero-border/70 p-4 shadow-lg"
      style={{
        backgroundImage: `url('${MARBLE_BG}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-background-dark/55" aria-hidden />
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-cinzel text-lg font-bold text-accent-gold">{displayName}</h3>
            <p className="mt-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200">
              {faction.ideologyLabel}
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-hero-dark/80 bg-background-dark/40 p-1 text-gray-400 hover:text-white"
              aria-label="Fraktion schließen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {(bannerUrl || emblemUrl) && (
          <div className="flex gap-3">
            {bannerUrl ? (
              <div className="relative h-24 flex-1 overflow-hidden rounded border border-accent-gold/30 bg-background-dark">
                <Image
                  src={bannerUrl}
                  alt=""
                  fill
                  sizes="320px"
                  className="object-cover"
                  unoptimized={bannerUrl.startsWith("http")}
                />
              </div>
            ) : null}
            {emblemUrl ? (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded border border-accent-gold/40 bg-background-card">
                <Image
                  src={emblemUrl}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized={emblemUrl.startsWith("http")}
                />
              </div>
            ) : null}
          </div>
        )}

        {!bannerUrl && !emblemUrl ? (
          <div className="flex h-16 w-16 items-center justify-center rounded border border-accent-gold/35 bg-background-card font-cinzel text-xl font-bold text-accent-gold/80">
            {displayName.slice(0, 1)}
          </div>
        ) : null}

        <p className="font-libre text-sm leading-relaxed text-gray-200">{intro}</p>

        {loreExcerpt && loreExcerpt !== intro ? (
          <div className="rounded border border-white/10 bg-background-dark/45 p-3">
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
              Aus dem Lore-Eintrag
            </p>
            <p className="mt-1.5 font-libre text-xs leading-relaxed text-gray-300">{loreExcerpt}</p>
          </div>
        ) : null}

        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Macht</dt>
            <dd className="font-barlow text-xl font-bold text-gray-100">{faction.power}</dd>
          </div>
          <div>
            <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Legalität</dt>
            <dd className="font-barlow text-xl font-bold text-gray-100">
              {faction.legality > 0 ? `+${faction.legality}` : faction.legality}
            </dd>
          </div>
          <div>
            <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Wirtschaft</dt>
            <dd className="font-barlow text-xl font-bold text-gray-100">{faction.economicImpact}</dd>
          </div>
        </dl>

        <div>
          <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Präsenz</p>
          <p className="font-libre text-sm text-gray-200">{faction.districtNames.join(" · ")}</p>
        </div>

        <div className="rounded border border-white/10 bg-background-dark/45 p-3">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Mitglieder
          </p>
          {members.length === 0 ? (
            <p className="mt-1.5 font-libre text-xs text-gray-400">Keine Mitglieder verknüpft.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {members.map((member) => {
                const clickable = Boolean(onSelectMember);
                const content = (
                  <>
                    <span className="min-w-0">
                      <span className="block font-libre text-sm text-gray-100">{member.name}</span>
                      <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        {[member.title, member.role].filter(Boolean).join(" · ") || "Mitglied"}
                      </span>
                    </span>
                    {member.influence != null ? (
                      <span className="shrink-0 font-barlow text-xs font-bold tabular-nums text-accent-gold">
                        {member.influence}
                      </span>
                    ) : null}
                  </>
                );
                return (
                  <li key={member.id}>
                    {clickable ? (
                      <button
                        type="button"
                        onClick={() => onSelectMember?.(member.name)}
                        className="flex w-full items-baseline justify-between gap-3 rounded border border-transparent px-1 py-0.5 text-left hover:border-hero-border/50 hover:bg-white/5"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex items-baseline justify-between gap-3 px-1 py-0.5">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {influences.length > 0 ? (
          <div className="rounded border border-white/10 bg-background-dark/45 p-3">
            <p className="mb-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
              Wichtige Einflüsse
            </p>
            <ul className="space-y-1.5">
              {influences.map((link) => (
                <li
                  key={`${link.targetName}-${link.label}`}
                  className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5 last:border-0 last:pb-0"
                >
                  <span className="min-w-0">
                    <span className="block font-libre text-sm text-gray-100">{link.targetName}</span>
                    <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {link.label}
                    </span>
                  </span>
                  <span className="shrink-0 font-barlow text-xs font-bold tabular-nums text-accent-gold">
                    {link.strength}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
          {loreHref ? (
            <a
              href={loreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-hero-border/70 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant hover:border-hero-vibrant hover:bg-hero-vibrant/10"
            >
              Lore-Eintrag
            </a>
          ) : (
            <span className="font-libre text-[11px] text-gray-500">Kein Lore-Link verknüpft</span>
          )}
          {factionHref ? (
            <a
              href={factionHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-accent-gold/50 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold hover:bg-accent-gold/10"
            >
              Zur Fraktion
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function intensityTone(value: number) {
  if (value >= 50) return "text-hero-vibrant";
  if (value > 0) return "text-accent-gold";
  if (value < 0) return "text-red-300";
  return "text-gray-400";
}

export function NpcDetail({
  npc,
  loreHref = null,
  factionHref = null,
  recordId = null,
  onClose,
  onOpenFaction,
}: {
  npc: AnalyticsNpc;
  loreHref?: string | null;
  factionHref?: string | null;
  recordId?: string | null;
  onClose?: () => void;
  /** Öffnet die Fraktion im gleichen Detailpanel. */
  onOpenFaction?: (factionId: string) => void;
}) {
  const [extras, setExtras] = useState<CityNpcDashboardExtras | null>(null);

  useEffect(() => {
    let active = true;
    setExtras(null);
    if (!recordId) return;
    void loadCityNpcDashboardExtras(recordId, npc.factionId).then((row) => {
      if (active) setExtras(row);
    });
    return () => {
      active = false;
    };
  }, [recordId, npc.factionId, npc.id]);

  const portraitSrc = extras?.portraitUrl?.trim() || npc.portraitUrl;
  const seatName = extras?.seatName?.trim() || npc.seatName?.trim() || null;
  const catalogFaction = AURENFURT_FACTIONS.find((faction) => faction.id === npc.factionId);
  const factionName = extras?.faction?.name?.trim() || npc.factionName;
  const factionIntro =
    extras?.faction?.intro?.trim() ||
    catalogFaction?.role ||
    "";
  const factionImage = extras?.faction?.imageUrl?.trim() || null;
  const relationships = extras?.relationships ?? [];

  return (
    <div
      className="relative overflow-hidden rounded-md border border-hero-border/70 p-4 shadow-lg"
      style={{
        backgroundImage: `url('${MARBLE_BG}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-background-dark/55" aria-hidden />
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-cinzel text-lg font-bold text-accent-gold">{npc.name}</h3>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-hero-dark/80 bg-background-dark/40 p-1 text-gray-400 hover:text-white"
              aria-label="NPC-Auswahl schließen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-4">
          <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded border border-accent-gold/40 bg-background-dark shadow-md sm:h-40 sm:w-32">
            <Image
              src={portraitSrc}
              alt={npc.name}
              fill
              sizes="128px"
              className="object-cover object-top"
              unoptimized={portraitSrc.startsWith("http")}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
              {npc.title ?? npc.role} · {npc.districtName}
            </p>
            {seatName ? (
              <p className="mt-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold/90">
                Sitz · {seatName}
              </p>
            ) : null}
            <p className="mt-1 font-barlow text-xl font-extrabold tabular-nums text-accent-gold">
              Einfluss {npc.influence}
            </p>
            <p className="mt-3 font-libre text-sm leading-relaxed text-gray-200">{npc.description}</p>
            {npc.agenda ? (
              <p className="mt-2 font-libre text-sm leading-relaxed text-gray-300">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Agenda ·{" "}
                </span>
                {npc.agenda}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded border border-white/10 bg-background-dark/45 p-3">
          {onOpenFaction ? (
            <button
              type="button"
              onClick={() => onOpenFaction(npc.factionId)}
              className="flex w-full gap-3 text-left transition hover:bg-white/5"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-accent-gold/35 bg-background-card">
                {factionImage ? (
                  <Image
                    src={factionImage}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized={factionImage.startsWith("http")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-cinzel text-lg font-bold text-accent-gold/80">
                    {(factionName || "?").slice(0, 1)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Fraktion · Anklicken
                </p>
                <p className="font-cinzel text-sm font-bold text-accent-gold">{factionName}</p>
                {factionIntro ? (
                  <p className="mt-1 font-libre text-xs leading-relaxed text-gray-300 line-clamp-3">
                    {factionIntro}
                  </p>
                ) : null}
              </div>
            </button>
          ) : (
            <div className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-accent-gold/35 bg-background-card">
                {factionImage ? (
                  <Image
                    src={factionImage}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized={factionImage.startsWith("http")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-cinzel text-lg font-bold text-accent-gold/80">
                    {(factionName || "?").slice(0, 1)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Fraktion
                </p>
                <p className="font-cinzel text-sm font-bold text-accent-gold">{factionName}</p>
                {factionIntro ? (
                  <p className="mt-1 font-libre text-xs leading-relaxed text-gray-300 line-clamp-3">
                    {factionIntro}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="rounded border border-white/10 bg-background-dark/45 p-3">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Wichtige Beziehungen
          </p>
          {relationships.length === 0 ? (
            <p className="mt-1.5 font-libre text-xs text-gray-400">
              {recordId ? "Keine Beziehungen hinterlegt." : "Beziehungen erscheinen nach Verknüpfung."}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {relationships.map((link) => (
                <li
                  key={`${link.otherName}-${link.roleLabel}-${link.intensity}`}
                  className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5 last:border-0 last:pb-0"
                >
                  <span className="min-w-0">
                    <span className="block font-libre text-sm text-gray-100">{link.otherName}</span>
                    <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {link.roleLabel}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-barlow text-xs font-bold tabular-nums ${intensityTone(link.intensity)}`}
                  >
                    {link.intensity > 0 ? `+${link.intensity}` : link.intensity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Aktive Automatismen
          </p>
          {npc.activeAutomations.length === 0 ? (
            <p className="mt-1 font-libre text-xs text-gray-400">Keine Automatismen greifen heute.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {npc.activeAutomations.map((item) => (
                <li
                  key={item.id}
                  className="rounded border border-hero-dark/60 bg-background-dark/50 px-2.5 py-1.5"
                >
                  <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
                    {item.title}
                  </p>
                  {item.detail ? (
                    <p className="mt-0.5 font-libre text-[11px] leading-snug text-gray-300">{item.detail}</p>
                  ) : null}
                  {item.effectsLabel ? (
                    <p className="mt-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                      {item.effectsLabel}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Aktive Ereigniskarten
          </p>
          {npc.activeEventCards.length === 0 ? (
            <p className="mt-1 font-libre text-xs text-gray-400">Keine NPC-Karten wirken heute.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {npc.activeEventCards.map((item) => (
                <li
                  key={item.id}
                  className="rounded border border-hero-dark/60 bg-background-dark/50 px-2.5 py-1.5"
                >
                  <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-sky-300">
                    {item.title}
                  </p>
                  {item.detail ? (
                    <p className="mt-0.5 font-libre text-[11px] leading-snug text-gray-300">{item.detail}</p>
                  ) : null}
                  {item.effectsLabel ? (
                    <p className="mt-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                      {item.effectsLabel}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
          {loreHref ? (
            <a
              href={loreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-hero-border/70 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant hover:border-hero-vibrant hover:bg-hero-vibrant/10"
            >
              Lore-Eintrag
            </a>
          ) : (
            <span className="font-libre text-[11px] text-gray-500">Kein Lore-Link verknüpft</span>
          )}
          {factionHref ? (
            <a
              href={factionHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-accent-gold/50 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold hover:bg-accent-gold/10"
            >
              {factionName}
            </a>
          ) : (
            <span className="rounded border border-hero-dark/60 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {factionName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function topRows(report: CityAnalytics, pick: (district: DistrictRank) => number) {
  return [...report.districts]
    .sort((a, b) => pick(b) - pick(a))
    .slice(0, 3)
    .map((district) => ({ name: district.name, value: pick(district) }));
}

export function meterName(metric: ChartMetric) {
  if (metric === "tension") return "Spannung";
  return SIM_METERS.find((meter) => meter.key === metric)?.label ?? metric;
}

export function districtBars(report: CityAnalytics, metric: ChartMetric) {
  return [...report.districts]
    .sort((a, b) => (metric === "tension" ? b.tension - a.tension : b.average[metric] - a.average[metric]))
    .map((district) => ({
      id: district.id,
      name: district.name,
      tint: district.tint,
      value: metric === "tension" ? district.tension : district.average[metric],
    }));
}

const TIP_MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

function germanDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day}. ${TIP_MONTHS[month - 1]} ${year}`;
}

function tipDate(point: AnalyticsPoint | undefined, label?: string) {
  if (!point?.day) return label ?? "";
  if (point.day === point.until) return germanDate(point.day);
  return `${germanDate(point.day)} – ${germanDate(point.until)}`;
}

export function bandsFor(series: AnalyticsPoint[], events: AnalyticsEvent[]) {
  const bands = new Map<string, { x1: string; x2: string }>();
  for (const event of events) {
    if (!event.start || !event.end) continue;
    const covered = series.filter((point) => point.day <= event.end! && point.until >= event.start!);
    if (covered.length === 0) continue;
    const x1 = covered[0].label;
    const x2 = covered[covered.length - 1].label;
    const key = `${x1}|${x2}`;
    if (!bands.has(key)) bands.set(key, { x1, x2 });
  }
  return [...bands.values()];
}

export function LineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<TipRow & { payload?: AnalyticsPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const events = point?.events ?? [];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="max-w-xs rounded-md border border-hero-dark bg-background-dark px-3 py-2 shadow-lg"
    >
      <p className="font-barlow text-[11px] font-bold uppercase text-accent-gold">{tipDate(point, label)}</p>
      {payload.map((row) => (
        <p key={String(row.dataKey)} className="font-libre text-xs text-gray-100">
          <span style={{ color: row.color }}>{row.name}</span> {row.value}
        </p>
      ))}
      {events.length > 0 ? (
        <div className="mt-2 border-t border-hero-dark/70 pt-1.5">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Top-Einflüsse
          </p>
          {events.slice(0, 5).map((name) => (
            <p key={name} className="font-libre text-xs leading-relaxed text-gray-200">
              {name}
            </p>
          ))}
          {events.length > 5 ? (
            <p className="mt-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
              +{events.length - 5} weitere
            </p>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}

export function BarTooltip({ active, payload, label }: { active?: boolean; payload?: TipRow[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="rounded-md border border-hero-dark bg-background-card px-3 py-2 shadow-lg">
      <p className="font-barlow text-[11px] font-bold uppercase text-accent-gold">{label ?? row?.name}</p>
      <p className="font-libre text-xs text-gray-100">{row?.value}</p>
    </div>
  );
}
