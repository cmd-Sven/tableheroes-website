"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, ImagePlus, Shield, Sparkles, ToggleLeft, ToggleRight, Undo2 } from "lucide-react";
import { setKaiserEventCardImage } from "@/src/app/dashboard/worlds/city-sim-event-actions";
import { uploadLoreImage } from "@/src/lib/profile-media";
import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { AURENFURT_WORLD_ID } from "./aurenfurt-district-lore-ids";
import { findNpc, allAurenfurtNpcs, NPC_PORTRAIT_PLACEHOLDER } from "./aurenfurt-npcs";
import {
  activateKaiserCard,
  getActiveKaiserPlays,
  getGuardIstOn,
  getGuardSoll,
  GUARD_DRIFT_RATE,
  isAutomationDisabled,
  listKaiserHand,
  remainingDaysForPlay,
  setAutomationEnabled,
  setGuardSollForDistrict,
  setKaiserCardImageUrl,
  subscribeCityAndVerwaltung,
  verwaltungVersionNow,
} from "./aurenfurt-verwaltung-store";
import { findKaiserCard, type KaiserEventCard } from "./aurenfurt-kaiser-cards";
import { allStreetMerchantPacks } from "./aurenfurt-npc-event-content";
import { CityViewSwitch, type CitySurface } from "./CityViewSwitch";
import { CityHudChrome } from "./CityHudFrame";

const METER_LABELS: Record<string, string> = {
  crime: "Kriminalität",
  guard: "Sicherheit",
  vattrak: "Vattrak",
  malanthir: "Malanthir",
  economy: "Wirtschaft",
  unemployment: "Arbeitslosigkeit",
  refugees: "Flüchtlinge",
  elysia: "Elysia",
  chromus: "Chromus",
};

type Props = {
  day: string;
  onShowMap: () => void;
  onShowDashboard: () => void;
  onLeave: () => void;
  leaveLabel?: string;
};

function useVerwaltungTick() {
  return useSyncExternalStore(subscribeCityAndVerwaltung, verwaltungVersionNow, () => 0);
}

export default function CityVerwaltung({
  day,
  onShowMap,
  onShowDashboard,
  onLeave,
  leaveLabel = "Zurück zur Lore",
}: Props) {
  const tick = useVerwaltungTick();
  const kaiser = findNpc("npc-kaiser-artheus");
  const soll = useMemo(() => getGuardSoll(), [tick]);
  const ist = useMemo(() => getGuardIstOn(day), [tick, day]);
  const plays = useMemo(() => getActiveKaiserPlays(), [tick]);
  const [razziaDistrict, setRazziaDistrict] = useState<CityDistrictId>("unterstadt");
  const [error, setError] = useState<string | null>(null);
  const [busyCard, setBusyCard] = useState<string | null>(null);
  const [uploadingCard, setUploadingCard] = useState<string | null>(null);
  const handCards = useMemo(() => listKaiserHand(), [tick]);

  async function onCardImageUpload(card: KaiserEventCard, file: File) {
    setError(null);
    setUploadingCard(card.id);
    try {
      const result = await uploadLoreImage(file, {
        worldId: AURENFURT_WORLD_ID,
        loreId: `kaiser-card-${card.id}`,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setKaiserCardImageUrl(card.id, result.publicUrl);
      await setKaiserEventCardImage(AURENFURT_WORLD_ID, card.id, result.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bild konnte nicht gespeichert werden.");
    } finally {
      setUploadingCard(null);
    }
  }

  async function onCardImageRemove(cardId: string) {
    setError(null);
    setUploadingCard(cardId);
    try {
      setKaiserCardImageUrl(cardId, null);
      await setKaiserEventCardImage(AURENFURT_WORLD_ID, cardId, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bild konnte nicht entfernt werden.");
    } finally {
      setUploadingCard(null);
    }
  }

  const automations = useMemo(() => {
    const rows: Array<{
      npcId: string;
      npcName: string;
      abilityId: string;
      title: string;
      detail: string;
      enabled: boolean;
    }> = [];
    for (const npc of allAurenfurtNpcs()) {
      for (const ability of npc.cityAbilities) {
        const cond = ability.conditions
          .map((c) => {
            const op =
              c.op === "gte" ? "≥" : c.op === "lte" ? "≤" : c.op === "gt" ? ">" : "<";
            const where = ability.conditionScope === "city" ? " (stadtweit)" : "";
            return `${METER_LABELS[c.meter] ?? c.meter} ${op} ${c.value}${where}`;
          })
          .join(", ");
        rows.push({
          npcId: npc.id,
          npcName: npc.name,
          abilityId: ability.id,
          title: ability.title,
          detail: cond || "Kein Trigger",
          enabled: !isAutomationDisabled(npc.id, ability.id),
        });
      }
    }
    for (const [npcId, pack] of Object.entries(allStreetMerchantPacks())) {
      for (const ability of pack.abilities) {
        const cond = ability.conditions
          .map((c) => {
            const op =
              c.op === "gte" ? "≥" : c.op === "lte" ? "≤" : c.op === "gt" ? ">" : "<";
            const where = ability.conditionScope === "city" ? " (stadtweit)" : "";
            return `${METER_LABELS[c.meter] ?? c.meter} ${op} ${c.value}${where}`;
          })
          .join(", ");
        rows.push({
          npcId,
          npcName: pack.cards[0]?.title ? `Händler (${npcId.slice(-1)})` : "Straßenhändler",
          abilityId: ability.id,
          title: ability.title,
          detail: cond || "Kein Trigger",
          enabled: !isAutomationDisabled(npcId, ability.id),
        });
      }
    }
    // Lesbare Händlernamen
    const merchantNames: Record<string, string> = {
      "aaf30001-0001-4000-8000-000000000001": "Findus Kieselschweif",
      "aaf30001-0001-4000-8000-000000000002": "Troldorksch Hauerkopf",
      "aaf30001-0001-4000-8000-000000000003": "Gaysimir Ferrendisch",
      "aaf30001-0001-4000-8000-000000000004": "Konrad Himmel",
      "aaf30001-0001-4000-8000-000000000005": "Sharlandi Jesspin",
      "aaf30001-0001-4000-8000-000000000006": "Goward",
      "aaf30001-0001-4000-8000-000000000007": "Ratali Finkenfauch",
      "aaf30001-0001-4000-8000-000000000008": "Sekur Salvander",
      "aaf30001-0001-4000-8000-000000000009": "Robert Kramm",
    };
    return rows.map((row) => ({
      ...row,
      npcName: merchantNames[row.npcId] ?? row.npcName,
    }));
  }, [tick]);

  function onActivate(cardId: string) {
    setError(null);
    setBusyCard(cardId);
    try {
      const card = findKaiserCard(cardId);
      activateKaiserCard(cardId, card?.scope === "district" ? razziaDistrict : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Karte konnte nicht aktiviert werden.");
    } finally {
      setBusyCard(null);
    }
  }

  function onSurface(mode: CitySurface) {
    if (mode === "map") onShowMap();
    if (mode === "dashboard") onShowDashboard();
  }

  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-background-dark text-gray-200">
      {/* Chrome an Inhalts­höhe binden (nicht am Viewport), sonst schneidet die Bottom-Leiste durch. */}
      <div className="relative min-h-full">
        <CityHudChrome density="panel" />
        <header className="relative z-10 flex flex-wrap items-end gap-3 border-b border-hero-dark/50 px-5 pb-3 pt-4">
          <CityViewSwitch mode="verwaltung" onChange={onSurface} showVerwaltung />
          <div className="min-w-0 pb-2">
            <p className="font-cinzel text-sm font-bold text-accent-gold">Aurenfurt</p>
            <h2 className="font-barlow text-xl font-extrabold uppercase tracking-wide text-hero-vibrant">
              Verwaltung
            </h2>
          </div>
          <button
            type="button"
            onClick={onLeave}
            className="ml-auto inline-flex items-center gap-1.5 border border-hero-dark bg-hero-dark px-3 py-2 font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold hover:bg-background-card"
          >
            <Undo2 className="h-4 w-4" aria-hidden />
            {leaveLabel}
          </button>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-6">
        {/* Kaiser-Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md border border-hero-border bg-background-card">
            <Image
              src={kaiser?.portraitUrl || NPC_PORTRAIT_PLACEHOLDER}
              alt={kaiser?.name ?? "Kaiser"}
              fill
              className="object-cover"
              sizes="112px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-cinzel text-sm font-bold text-accent-gold">
              <Crown className="mr-1 inline h-4 w-4" aria-hidden />
              {kaiser?.title ?? "Kaiser von Aurelis"}
            </p>
            <h1 className="font-barlow text-3xl font-extrabold uppercase tracking-wide text-hero-vibrant">
              {kaiser?.name ?? "Kaiser Artheus Flammguard der Zweite"}
            </h1>
            <p className="mt-2 max-w-2xl font-libre text-sm leading-relaxed text-gray-200">
              {kaiser?.description ??
                "Vom Festungspalast aus spricht er Recht für die ganze Stadt. Garde, Zölle und Vattrak folgen seinem Wort — verzögert, nie sofort."}
            </p>
          </div>
        </section>

        {/* Aktive Karten */}
        <section>
          <h2 className="font-barlow text-2xl font-semibold text-accent-blood border-b border-hero-border pb-2 mb-4">
            Aktive Kaiser-Karten
          </h2>
          {plays.length === 0 ? (
            <p className="font-libre text-sm text-gray-400">Keine Karte liegt derzeit auf dem Tisch.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {plays.map((play) => {
                const card = findKaiserCard(play.cardId);
                const left = remainingDaysForPlay(play, day);
                return (
                  <li
                    key={play.playId}
                    className="border border-hero-dark bg-background-card p-4 shadow-lg"
                  >
                    <p className="font-cinzel font-bold text-accent-gold">{card?.title ?? play.cardId}</p>
                    <p className="mt-1 font-libre text-xs text-gray-300">
                      Restlaufzeit: {left} Tag{left === 1 ? "" : "e"}
                      {play.districtId
                        ? ` · ${AURENFURT_DISTRICTS.find((d) => d.id === play.districtId)?.name ?? play.districtId}`
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Hand */}
        <section>
          <h2 className="font-barlow text-2xl font-semibold text-accent-blood border-b border-hero-border pb-2 mb-4">
            Kaiser-Hand
          </h2>
          <p className="mb-3 font-libre text-sm text-gray-400">
            Vorgefertigte Ereigniskarten — zeitlich begrenzt. Regler steuern dauerhafte Präsenz.
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="font-barlow text-xs font-bold uppercase text-accent-gold" htmlFor="razzia-district">
              Razzia-Viertel
            </label>
            <select
              id="razzia-district"
              value={razziaDistrict}
              onChange={(e) => setRazziaDistrict(e.target.value as CityDistrictId)}
              className="rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            >
              {AURENFURT_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="mb-3 font-libre text-sm text-red-300">{error}</p> : null}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {handCards.map((card) => (
              <motion.article
                key={card.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4 }}
                className="flex flex-col overflow-hidden border border-hero-dark bg-background-card shadow-lg"
              >
                <div className="relative aspect-[5/3] w-full bg-background-dark/70">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 280px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-500">
                      <ImagePlus className="h-6 w-6" aria-hidden />
                      <span className="font-barlow text-[10px] font-bold uppercase tracking-wide">
                        Kein Motiv
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-cinzel text-lg font-bold text-accent-gold">{card.title}</h3>
                  <p className="mt-2 flex-1 font-libre text-xs leading-relaxed text-gray-200">
                    {card.description}
                  </p>
                  <div className="mt-3 rounded border border-hero-dark/60 bg-background-dark/40 p-2">
                    <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                      Kartenmotiv
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCard === card.id}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void onCardImageUpload(card, file);
                      }}
                      className="mt-1.5 w-full rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-[11px] text-gray-300 file:mr-2 file:rounded file:border-0 file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-[10px] file:font-bold file:uppercase file:text-accent-gold"
                    />
                    {card.imageUrl ? (
                      <button
                        type="button"
                        disabled={uploadingCard === card.id}
                        onClick={() => void onCardImageRemove(card.id)}
                        className="mt-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-white disabled:opacity-50"
                      >
                        Motiv entfernen
                      </button>
                    ) : (
                      <p className="mt-1 font-libre text-[10px] text-gray-500">
                        {uploadingCard === card.id
                          ? "Upload läuft…"
                          : "JPEG, PNG oder WebP · max. 5 MB"}
                      </p>
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-1 font-barlow text-[11px] uppercase tracking-wide text-gray-400">
                    <div>
                      <dt className="text-gray-500">Dauer</dt>
                      <dd className="text-accent-gold">{card.durationDays} Tage</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Kosten</dt>
                      <dd className="text-accent-gold">{card.cost} GP</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Scope</dt>
                      <dd className="text-accent-gold">
                        {card.scope === "city"
                          ? "Stadt"
                          : card.scope === "palace"
                            ? "Palast"
                            : "Viertel"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Hinweis</dt>
                      <dd className="text-accent-gold">
                        {card.intensityOnly ? "Intensität" : "Meter"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    disabled={busyCard === card.id}
                    onClick={() => onActivate(card.id)}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 border border-hero-border bg-hero-dark px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold hover:bg-background-dark disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Auf den Tisch
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Garde-Regler */}
        <section>
          <h2 className="font-barlow text-2xl font-semibold text-accent-blood border-b border-hero-border pb-2 mb-4">
            <Shield className="mr-2 inline h-5 w-5" aria-hidden />
            Garde-Verteilung
          </h2>
          <p className="mb-4 font-libre text-sm text-gray-400">
            Soll steuern die Priorität. Ist folgt mit Verzögerung (~{Math.round(GUARD_DRIFT_RATE * 100)} % der
            Lücke pro Tag). Mehr Wachen hier bedeuten weniger woanders — Kapazität ist begrenzt.
          </p>
          <ul className="space-y-4">
            {AURENFURT_DISTRICTS.map((district) => {
              const sollVal = soll[district.id] ?? 0;
              const istVal = ist[district.id] ?? 0;
              return (
                <li key={district.id} className="border border-hero-dark/60 bg-background-card/40 p-3">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="font-cinzel text-sm font-bold text-accent-gold">{district.name}</span>
                    <span className="font-barlow text-xs font-bold uppercase text-gray-400">
                      Soll {sollVal.toFixed(1)} % · Ist {istVal.toFixed(1)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={0.5}
                    value={Math.min(40, sollVal)}
                    onChange={(e) => setGuardSollForDistrict(district.id, Number(e.target.value))}
                    className="w-full accent-hero-vibrant"
                    aria-label={`Garde-Soll ${district.name}`}
                  />
                  <div className="relative mt-2 h-2 overflow-hidden rounded bg-slate-900">
                    <div
                      className="absolute inset-y-0 left-0 bg-sky-500/40"
                      style={{ width: `${Math.min(100, istVal * 2.5)}%` }}
                      title="Ist"
                    />
                    <div
                      className="absolute inset-y-0 left-0 border-r-2 border-hero-vibrant"
                      style={{ width: `${Math.min(100, sollVal * 2.5)}%` }}
                      title="Soll"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Automatisierungen */}
        <section className="pb-10">
          <h2 className="font-barlow text-2xl font-semibold text-accent-blood border-b border-hero-border pb-2 mb-4">
            Automatisierungen
          </h2>
          <p className="mb-4 font-libre text-sm text-gray-400">
            Wenn–Dann: Meter-Schwelle löst Aktion aus (Buff / Kartenwirkung). Pro Stadt-NPC mindestens eine Regel.
          </p>
          <ul className="divide-y divide-hero-dark/50 border border-hero-dark">
            <AnimatePresence initial={false}>
              {automations.map((row) => (
                <motion.li
                  key={`${row.npcId}:${row.abilityId}`}
                  layout
                  className="flex flex-wrap items-center gap-3 bg-background-card/30 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant">
                      {row.npcName}
                    </p>
                    <p className="font-cinzel text-sm text-accent-gold">{row.title}</p>
                    <p className="font-libre text-xs text-gray-400">Wenn {row.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutomationEnabled(row.npcId, row.abilityId, !row.enabled)}
                    className="inline-flex items-center gap-1.5 font-barlow text-xs font-bold uppercase text-accent-gold"
                    aria-pressed={row.enabled}
                  >
                    {row.enabled ? (
                      <ToggleRight className="h-5 w-5 text-hero-vibrant" aria-hidden />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-500" aria-hidden />
                    )}
                    {row.enabled ? "An" : "Aus"}
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
        </div>
      </div>
    </div>
  );
}
