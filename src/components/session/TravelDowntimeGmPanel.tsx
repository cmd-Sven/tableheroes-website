"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Map, Play, Square, X } from "lucide-react";
import {
  distributeRations,
  endDowntime,
  startDowntime,
} from "@/src/lib/actions/downtime-actions";
import type { FapAllocationsMap } from "@/src/lib/downtime-fap-types";
import {
  calendarDayCount,
  defaultDowntimeConfig,
  estimateTravelDays,
  formatTravelSummary,
  getDayLog,
  kmPerDayForTransport,
  maxTravelDaysForPace,
  playerFapBudgetForDay,
  PROVISIONS_LABELS,
  TRAVEL_PACE_LABELS,
  TRAVEL_TRANSPORT_LABELS,
  travelFapCostPerDay,
  travelProgressPct,
  type DowntimeConfig,
  type ProvisionsMode,
  type TravelPace,
  type TravelTransport,
} from "@/src/lib/travel-fap-config";
import { TravelDayGmWorkflow } from "@/src/components/session/TravelDayGmWorkflow";
import { CityStayGmPanel, startCityStayConfig } from "@/src/components/session/CityStayGmPanel";

type PartyCharacter = {
  id: string;
  name: string;
  rations_count: number;
  starvation_days: number;
};

type Props = {
  sessionId: string;
  partyCharacters: PartyCharacter[];
  downtimeActive: boolean;
  downtimeCurrentDay: number;
  downtimeTotalDays: number;
  downtimeConfig: DowntimeConfig | null;
  fapAllocations: FapAllocationsMap;
  onReload: () => void | Promise<void>;
  layout?: "sidebar" | "modal";
  /** Weltkarte aktiv → Reise-Workflow; sonst Stadt-FAP */
  worldMapActive?: boolean;
};

function formatAllocations(allocations: { activity: string; fap: number }[]) {
  if (!allocations.length) return "—";
  return allocations.map((a) => `${a.fap}× ${a.activity}`).join(", ");
}

function maxRationsAdd(pc: PartyCharacter) {
  const cur = Math.min(10, Math.max(0, Math.round(pc.rations_count)));
  return Math.max(0, 10 - cur);
}

export function TravelDowntimeGmPanel({
  sessionId,
  partyCharacters,
  downtimeActive,
  downtimeCurrentDay,
  downtimeTotalDays,
  downtimeConfig,
  fapAllocations,
  onReload,
  layout = "sidebar",
  worldMapActive = false,
}: Props) {
  const isModal = layout === "modal";
  const travelUi = worldMapActive;
  const [setup, setSetup] = useState<DowntimeConfig>(() =>
    defaultDowntimeConfig(travelUi ? "travel" : "leisure"),
  );
  const [daysInput, setDaysInput] = useState("3");
  const [cityName, setCityName] = useState("");
  const [distanceInput, setDistanceInput] = useState("90");
  const [isPending, startTransition] = useTransition();
  const [huntOpen, setHuntOpen] = useState(false);
  const [huntDraft, setHuntDraft] = useState<Record<string, number>>({});
  const [isDistributing, startDistributing] = useTransition();
  const [openEnded, setOpenEnded] = useState(false);

  useEffect(() => {
    if (downtimeActive) return;
    setSetup((s) => ({ ...s, mode: travelUi ? "travel" : "leisure" }));
  }, [travelUi, downtimeActive]);

  const activeConfig = downtimeConfig ?? defaultDowntimeConfig();
  const currentDayLog = getDayLog(activeConfig, downtimeCurrentDay);
  const playerBudget = playerFapBudgetForDay(activeConfig, currentDayLog);
  const travelCost = travelFapCostPerDay({
    ...activeConfig,
    pace: currentDayLog?.pace ?? activeConfig.pace,
  });
  const progressPct = travelProgressPct(activeConfig);

  const estimatedDays = useMemo(() => {
    const km = Math.max(0, Number(distanceInput) || 0);
    return estimateTravelDays(km, setup.transport ?? "foot");
  }, [distanceInput, setup.transport]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        alert(res.error ?? "Aktion fehlgeschlagen.");
        return;
      }
      await onReload();
    });
  };

  function openHuntModal() {
    const next: Record<string, number> = {};
    for (const pc of partyCharacters) next[pc.id] = 0;
    setHuntDraft(next);
    setHuntOpen(true);
  }

  function submitHunt() {
    startDistributing(async () => {
      const res = await distributeRations(sessionId, huntDraft);
      if (!res.ok) {
        alert(res.error ?? "Verteilen fehlgeschlagen.");
        return;
      }
      setHuntOpen(false);
      await onReload();
    });
  }

  function handleStart() {
    const mode = travelUi ? "travel" : "leisure";
    let days = Math.max(1, Math.min(60, Math.round(Number(daysInput) || 1)));
    if (mode === "travel") {
      if (setup.pace === "extreme") {
        days = Math.min(days, maxTravelDaysForPace("extreme"));
      } else if (Number(distanceInput) > 0) {
        days = Math.max(days, estimatedDays);
      }
    }
    const config: DowntimeConfig =
      mode === "leisure"
        ? startCityStayConfig(cityName)
        : {
            ...setup,
            mode: "travel",
            openEnded,
            distanceKm: !openEnded ? Math.max(0, Number(distanceInput) || 0) : undefined,
            calendarSlots: openEnded ? Math.max(days, 5) : undefined,
            kmTraveled: 0,
            dayLogs: [],
          };
    void run(() => startDowntime(sessionId, days, config));
  }

  const shell = isModal
    ? "rounded-xl border border-amber-900/40 bg-background-dark/50 p-4 sm:p-5"
    : "rounded-2xl border border-amber-900/60 bg-background-card/80 p-3";

  return (
    <div className={shell}>
      {!isModal ? (
        <div className="mb-2 flex items-center gap-2">
          <Map className="h-4 w-4 text-accent-gold" />
          <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
            {travelUi ? "Reise & FAP" : "Stadt-FAP"}
          </span>
        </div>
      ) : null}

      {(!downtimeActive && !travelUi) ||
      (downtimeActive && activeConfig.mode === "leisure") ? (
        <CityStayGmPanel
          sessionId={sessionId}
          partyCharacters={partyCharacters}
          downtimeActive={downtimeActive}
          downtimeCurrentDay={downtimeCurrentDay}
          downtimeTotalDays={downtimeTotalDays}
          downtimeConfig={activeConfig}
          fapAllocations={fapAllocations}
          onReload={onReload}
          isPending={isPending}
          run={run}
          layout={layout}
          daysInput={daysInput}
          setDaysInput={setDaysInput}
          cityName={cityName}
          setCityName={setCityName}
          onStartCityStay={handleStart}
          onEnd={() => {
            if (!window.confirm("Stadtaufenthalt vorzeitig beenden?")) return;
            void run(() => endDowntime(sessionId));
          }}
        />
      ) : !downtimeActive ? (
        <div className={isModal ? "space-y-4" : "space-y-3"}>
          <p className="font-libre text-[11px] text-gray-400">
            Reise starten: Tempo, Wetter und Kilometer. Stadt-FAP liegt auf Bühne/Battlemap.
          </p>

          <fieldset>
            <legend className="font-barlow text-[9px] font-bold uppercase text-gray-500">
              Reisetempo
            </legend>
            <div className="mt-1 grid grid-cols-1 gap-1.5">
              {(Object.keys(TRAVEL_PACE_LABELS) as TravelPace[]).map((pace) => (
                <button
                  key={pace}
                  type="button"
                  onClick={() => setSetup((s) => ({ ...s, pace }))}
                  className={`rounded border px-2 py-2 text-left font-libre text-[11px] ${
                    setup.pace === pace
                      ? "border-hero-vibrant/60 bg-hero-vibrant/10 text-gray-100"
                      : "border-hero-border/30 text-gray-400"
                  }`}
                >
                  <span className="font-barlow font-bold uppercase">
                    {TRAVEL_PACE_LABELS[pace]}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-gray-500">
                    {pace === "normal" && "3 FAP Reise · 3 FAP frei · 30/70 km (Fuß/Pferd)"}
                    {pace === "fast" && "4 FAP Reise · 2 FAP Schlaf Pflicht · +1 Erschöpfung/Tag"}
                    {pace === "extreme" && "Max. 3 Tage · 5 Erschöpfung gesamt"}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-barlow text-[9px] font-bold uppercase text-gray-500">
              Fortbewegung
            </legend>
            <div className="mt-1 flex gap-2">
              {(Object.keys(TRAVEL_TRANSPORT_LABELS) as TravelTransport[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSetup((s) => ({ ...s, transport: t }))}
                  className={`flex-1 rounded border px-2 py-2 font-barlow text-[10px] font-bold uppercase ${
                    setup.transport === t
                      ? "border-accent-gold/60 bg-accent-gold/10 text-accent-gold"
                      : "border-hero-border/40 text-gray-400"
                  }`}
                >
                  {TRAVEL_TRANSPORT_LABELS[t]}
                  <span className="mt-0.5 block font-libre text-[9px] font-normal normal-case text-gray-500">
                    {kmPerDayForTransport(t)} km/Tag
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-barlow text-[9px] font-bold uppercase text-gray-500">
              Proviant
            </legend>
            <div className="mt-1 flex gap-2">
              {(Object.keys(PROVISIONS_LABELS) as ProvisionsMode[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSetup((s) => ({ ...s, provisions: p }))}
                  className={`flex-1 rounded border px-2 py-2 font-barlow text-[10px] font-bold uppercase ${
                    setup.provisions === p
                      ? "border-amber-600/60 bg-amber-950/40 text-amber-100"
                      : "border-hero-border/40 text-gray-400"
                  }`}
                >
                  {PROVISIONS_LABELS[p]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">Von</span>
              <input
                value={setup.fromLocation ?? ""}
                onChange={(e) => setSetup((s) => ({ ...s, fromLocation: e.target.value }))}
                className="mt-1 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-libre text-sm text-white"
                placeholder="Stadt A"
              />
            </label>
            <label className="block">
              <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">Nach</span>
              <input
                value={setup.toLocation ?? ""}
                onChange={(e) => setSetup((s) => ({ ...s, toLocation: e.target.value }))}
                className="mt-1 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-libre text-sm text-white"
                placeholder="Stadt B"
              />
            </label>
          </div>

          <label className="block">
            <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
              Strecke (km)
            </span>
            <input
              type="number"
              min={0}
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              disabled={openEnded}
              className="mt-1 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-barlow text-sm text-white disabled:opacity-50"
            />
            {openEnded ? (
              <p className="mt-1 font-libre text-[10px] text-accent-gold">
                Offenes Ziel — Fortschritt in km, Dauer unbekannt
              </p>
            ) : (
              <p className="mt-1 font-libre text-[10px] text-gray-500">
                Geschätzt ~{estimatedDays} Tag{estimatedDays === 1 ? "" : "e"} bei{" "}
                {TRAVEL_TRANSPORT_LABELS[setup.transport ?? "foot"]}
              </p>
            )}
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded border border-hero-border/30 px-2 py-2">
            <input
              type="checkbox"
              checked={openEnded}
              onChange={(e) => setOpenEnded(e.target.checked)}
              className="accent-hero-vibrant"
            />
            <span className="font-libre text-[11px] text-gray-300">Offenes Ziel (Dauer unbekannt)</span>
          </label>

          <label className="block">
            <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
              Reisetage (min.)
            </span>
            <input
              type="number"
              min={1}
              max={setup.pace === "extreme" ? 3 : 60}
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              className="mt-1 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-barlow text-sm text-white"
            />
          </label>

          <button
            type="button"
            disabled={isPending}
            onClick={handleStart}
            className={`flex w-full items-center justify-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/15 font-barlow font-extrabold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:opacity-50 ${isModal ? "py-3 text-xs" : "py-2 text-[10px]"}`}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Reise starten
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded border border-hero-border/40 bg-background-dark/50 px-2 py-2">
            <p className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
              Reise · Tag {downtimeCurrentDay}/
              {activeConfig.openEnded
                ? calendarDayCount(activeConfig, downtimeCurrentDay, downtimeTotalDays)
                : downtimeTotalDays}
            </p>
            <p className="mt-0.5 font-libre text-[11px] text-gray-400">
              {formatTravelSummary(activeConfig)}
            </p>
            <p className="mt-1 font-libre text-[10px] text-gray-500">
              {travelCost} FAP Reise · {playerBudget} FAP Spieler-Budget/Tag
            </p>
            {(activeConfig.kmTraveled ?? 0) > 0 || activeConfig.distanceKm ? (
              <p className="mt-1 font-libre text-[10px] text-hero-vibrant">
                {activeConfig.kmTraveled ?? 0} km zurückgelegt
                {activeConfig.distanceKm
                  ? ` · ${progressPct ?? 0}% von ${activeConfig.distanceKm} km`
                  : activeConfig.openEnded
                    ? " · Ziel offen"
                    : ""}
              </p>
            ) : null}
          </div>

          {travelUi ? (
            <TravelDayGmWorkflow
              sessionId={sessionId}
              config={activeConfig}
              currentDay={downtimeCurrentDay}
              totalDays={downtimeTotalDays}
              onReload={onReload}
            />
          ) : (
            <p className="font-libre text-[11px] text-gray-400">
              Wetter, Lager und Kilometer steuerst du auf der Weltkarte. Hier nur Gruppen-FAP der
              Reise.
            </p>
          )}

          <ul
            className={`space-y-2 overflow-y-auto font-libre text-gray-200 ${isModal ? "max-h-[min(40vh,20rem)] text-sm" : "max-h-36 text-[11px]"}`}
          >
            {partyCharacters.map((pc) => {
              const st = fapAllocations[pc.id];
              const status = st?.status === "ready" ? "Fertig" : "Plant noch";
              return (
                <li
                  key={pc.id}
                  className={`rounded border border-hero-border/40 bg-background-dark/60 ${isModal ? "px-3 py-2" : "px-2 py-1.5"}`}
                >
                  <span className="font-barlow font-bold text-accent-gold">{pc.name}</span>
                  <span className="text-gray-500"> — {status}</span>
                  <span className="ml-1 text-gray-400">ðŸŽ’ {pc.rations_count ?? 0}/10</span>
                  {(pc.starvation_days ?? 0) > 0 ? (
                    <span className="ml-1 rounded bg-red-950/90 px-1 font-barlow text-[8px] font-bold uppercase text-red-200">
                      Hunger {pc.starvation_days}T
                    </span>
                  ) : null}
                  {st?.status === "ready" && st.allocations.length > 0 ? (
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {formatAllocations(st.allocations)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {partyCharacters.length > 0 ? (
            <button
              type="button"
              disabled={isPending || isDistributing}
              onClick={openHuntModal}
              className={`w-full rounded border border-amber-700/60 bg-amber-950/40 font-barlow font-extrabold uppercase text-amber-100 hover:bg-amber-900/50 disabled:opacity-50 ${isModal ? "py-2 text-xs" : "py-2 text-[10px]"}`}
            >
              Jagdbeute / Rationen verteilen
            </button>
          ) : null}

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!window.confirm("Reise vorzeitig beenden?")) return;
              void run(() => endDowntime(sessionId));
            }}
            className={`flex w-full items-center justify-center gap-2 rounded border border-red-800/60 bg-red-950/40 font-barlow font-extrabold uppercase text-red-200 hover:bg-red-900/50 disabled:opacity-50 ${isModal ? "py-3 text-xs" : "py-2 text-[10px]"}`}
          >
            <Square className="h-4 w-4" />
            Beenden
          </button>
        </div>
      )}


      {huntOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 px-3 py-6">
          <div className="max-h-[min(80vh,480px)] w-full max-w-sm overflow-y-auto rounded-xl border border-accent-gold/40 bg-background-card p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="font-barlow text-sm font-extrabold uppercase text-accent-gold">
                Jagdbeute / Rationen
              </h3>
              <button type="button" onClick={() => setHuntOpen(false)} className="rounded p-1 text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-3">
              {partyCharacters.map((pc) => {
                const cap = maxRationsAdd(pc);
                const v = Math.min(cap, Math.max(0, Math.round(huntDraft[pc.id] ?? 0)));
                return (
                  <li key={pc.id} className="rounded border border-hero-border/40 bg-background-dark/70 px-2 py-2">
                    <div className="mb-1 flex justify-between">
                      <span className="font-barlow text-xs font-bold text-accent-gold">{pc.name}</span>
                      <span className="font-libre text-[10px] text-gray-500">
                        {pc.rations_count}/10 → {Math.min(10, pc.rations_count + v)}/10
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={cap}
                      value={v}
                      disabled={isDistributing || cap === 0}
                      onChange={(e) =>
                        setHuntDraft((prev) => ({ ...prev, [pc.id]: Number(e.target.value) }))
                      }
                      className="w-full accent-hero-vibrant"
                    />
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setHuntOpen(false)} className="rounded border border-gray-600 px-3 py-2 font-barlow text-[10px] uppercase text-gray-300">
                Abbrechen
              </button>
              <button type="button" disabled={isDistributing} onClick={submitHunt} className="rounded border border-accent-gold bg-accent-gold/20 px-3 py-2 font-barlow text-[10px] font-extrabold uppercase text-accent-gold">
                Verteilen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
