"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Dices, Loader2, Play, SkipForward, Square } from "lucide-react";
import {
  confirmFapAllocation,
  getFapPartySnapshot,
  nextDowntimeDay,
  requestFapSkillCheck,
  submitFapAllocation,
  type FapPartyMemberStatus,
} from "@/src/lib/actions/downtime-actions";
import { remainingStayFap } from "@/src/lib/city-fap-sleep";
import { DND5E_SKILLS } from "@/src/lib/characters/dnd5e/skills";
import {
  sleepFapSum,
  type FapAllocationLine,
  type FapAllocationsMap,
} from "@/src/lib/downtime-fap-types";
import {
  FAP_PARTS_PER_DAY,
  totalLeisureFap,
  type DowntimeConfig,
} from "@/src/lib/travel-fap-config";

type PartyCharacter = {
  id: string;
  name: string;
};

type Props = {
  sessionId: string;
  partyCharacters: PartyCharacter[];
  downtimeActive: boolean;
  downtimeCurrentDay: number;
  downtimeTotalDays: number;
  downtimeConfig: DowntimeConfig;
  fapAllocations: FapAllocationsMap;
  onReload: () => void | Promise<void>;
  isPending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  onEnd: () => void;
  layout?: "sidebar" | "modal";
  daysInput: string;
  setDaysInput: (v: string) => void;
  cityName: string;
  setCityName: (v: string) => void;
  onStartCityStay: () => void;
};

function remainingToday(allocations: FapAllocationLine[] | undefined): number {
  const used = (allocations ?? []).reduce((s, a) => s + Math.max(0, Math.round(a.fap)), 0);
  return Math.max(0, FAP_PARTS_PER_DAY - used);
}

export function CityStayGmPanel({
  sessionId,
  partyCharacters,
  downtimeActive,
  downtimeCurrentDay,
  downtimeTotalDays,
  downtimeConfig,
  fapAllocations,
  onReload,
  isPending,
  run,
  onEnd,
  layout = "sidebar",
  daysInput,
  setDaysInput,
  cityName,
  setCityName,
  onStartCityStay,
}: Props) {
  const isModal = layout === "modal";
  const [snapshot, setSnapshot] = useState<FapPartyMemberStatus[]>([]);
  const [probe, setProbe] = useState<{
    characterId: string;
    characterName: string;
    activity: string;
    skillKey: string;
    dc: string;
  } | null>(null);
  const [gmDraft, setGmDraft] = useState<Record<string, string>>({});
  const [isSnapPending, startSnap] = useTransition();

  const days = Math.max(1, Math.round(Number(daysInput) || 1));

  useEffect(() => {
    if (!downtimeActive) return;
    startSnap(async () => {
      const res = await getFapPartySnapshot(sessionId);
      if (res.ok) setSnapshot(res.members);
    });
  }, [sessionId, downtimeActive, fapAllocations, downtimeCurrentDay]);

  const snapById = useMemo(() => {
    const m = new Map<string, FapPartyMemberStatus>();
    for (const row of snapshot) m.set(row.id, row);
    return m;
  }, [snapshot]);

  const totalPool = totalLeisureFap(downtimeTotalDays);

  if (!downtimeActive) {
    return (
      <div className={isModal ? "space-y-4" : "space-y-3"}>
        <p className="font-libre text-[11px] text-gray-400">
          Stadtaufenthalt: {days} Tage × 6 FAP ={" "}
          <strong className="text-accent-gold">{days * FAP_PARTS_PER_DAY} FAP</strong> gesamt.
          Schlaf max. 3 FAP/Tag (Kurzschlaf 2 FAP möglich).
        </p>
        <label className="block">
          <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">Ort (optional)</span>
          <input
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="z. B. Silberhafen"
            className="mt-1 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-libre text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">Tage</span>
          <input
            type="number"
            min={1}
            max={60}
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            className="mt-1 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-barlow text-sm text-white"
          />
        </label>
        <button
          type="button"
          disabled={isPending}
          onClick={onStartCityStay}
          className={`flex w-full items-center justify-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/15 font-barlow font-extrabold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:opacity-50 ${isModal ? "py-3 text-xs" : "py-2 text-[10px]"}`}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Stadtaufenthalt starten
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-hero-border/40 bg-background-dark/50 px-2 py-2">
        <p className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
          Stadtaufenthalt · Tag {downtimeCurrentDay}/{downtimeTotalDays}
        </p>
        <p className="mt-0.5 font-libre text-[11px] text-gray-400">
          {downtimeConfig.fromLocation ? `${downtimeConfig.fromLocation} · ` : ""}
          {FAP_PARTS_PER_DAY} FAP/Tag · {totalPool} FAP gesamt
        </p>
      </div>

      <ul
        className={`space-y-2 overflow-y-auto font-libre text-gray-200 ${isModal ? "max-h-[min(50vh,28rem)] text-sm" : "max-h-72 text-[11px]"}`}
      >
        {partyCharacters.map((pc) => {
          const st = fapAllocations[pc.id];
          const used = (st?.allocations ?? []).reduce((s, a) => s + Math.max(0, a.fap), 0);
          const leftToday = remainingToday(st?.allocations);
          const stayLeft = remainingStayFap({
            currentDay: downtimeCurrentDay,
            totalDays: downtimeTotalDays,
            allocatedToday: used,
          });
          const sleep = sleepFapSum(st?.allocations ?? []);
          const snap = snapById.get(pc.id);
          const ready = st?.status === "ready";
          const confirmed = st?.confirmed === true;

          return (
            <li
              key={pc.id}
              className={`rounded border bg-background-dark/60 ${isModal ? "px-3 py-2" : "px-2 py-1.5"} ${
                confirmed
                  ? "border-hero-vibrant/50"
                  : ready
                    ? "border-accent-gold/40"
                    : "border-hero-border/40"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <span className="font-barlow font-bold text-accent-gold">{pc.name}</span>
                <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                  {confirmed ? "Bestätigt" : ready ? "Eingereicht" : "Plant noch"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-gray-400">
                Heute {leftToday} FAP frei · Aufenthalt {stayLeft} FAP übrig · Schlaf {sleep || "—"} FAP
                {snap ? (
                  <>
                    {" "}
                    · Erschöpfung {snap.exhaustionLevel}
                    {snap.consecutiveShortSleepDays > 0
                      ? ` · Kurzschlaf ${snap.consecutiveShortSleepDays}T`
                      : ""}
                  </>
                ) : null}
              </p>
              {ready && st.allocations.length > 0 ? (
                <ul className="mt-1 space-y-0.5 text-[10px] text-gray-400">
                  {st.allocations.map((a, idx) => (
                    <li key={`${pc.id}-${idx}`}>
                      {a.fap}× {a.activity}
                      {a.skillKey
                        ? ` · ${DND5E_SKILLS.find((s) => s.key === a.skillKey)?.labelDe ?? a.skillKey}`
                        : ""}
                      {a.activity.trim().toLowerCase() !== "schlaf" ? (
                        <button
                          type="button"
                          className="ml-1 inline-flex items-center gap-0.5 font-barlow text-[8px] font-bold uppercase text-hero-vibrant hover:text-accent-gold"
                          onClick={() =>
                            setProbe({
                              characterId: pc.id,
                              characterName: pc.name,
                              activity: a.activity,
                              skillKey: a.skillKey ?? "prf",
                              dc: "",
                            })
                          }
                        >
                          <Dices className="h-3 w-3" />
                          Probe
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-1 flex gap-1">
                  <input
                    value={gmDraft[pc.id] ?? ""}
                    onChange={(e) => setGmDraft((p) => ({ ...p, [pc.id]: e.target.value }))}
                    placeholder="SL: z. B. Markt 2, Schlaf 3"
                    className="min-w-0 flex-1 rounded border border-hero-dark bg-slate-900 px-1.5 py-1 font-libre text-[10px] text-white"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    className="rounded border border-hero-border/50 px-1.5 font-barlow text-[8px] font-bold uppercase text-gray-300"
                    onClick={() => {
                      const parsed = parseGmDraft(gmDraft[pc.id] ?? "");
                      if (!parsed.length) {
                        alert("Format: Aktivität FAP, … — z. B. Markt 2, Schlaf 3, Auftreten 1");
                        return;
                      }
                      void run(() => submitFapAllocation(sessionId, pc.id, parsed));
                    }}
                  >
                    Eintragen
                  </button>
                </div>
              )}
              {ready && !confirmed ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => confirmFapAllocation(sessionId, pc.id))}
                  className="mt-1 inline-flex items-center gap-1 font-barlow text-[8px] font-bold uppercase text-hero-vibrant"
                >
                  <Check className="h-3 w-3" />
                  Bestätigen
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {isSnapPending ? (
        <p className="font-libre text-[10px] text-gray-600">Lade Erschöpfung…</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => nextDowntimeDay(sessionId))}
          className={`flex items-center justify-center gap-2 rounded border border-hero-vibrant/60 bg-hero-vibrant/15 font-barlow font-extrabold uppercase text-hero-vibrant hover:bg-hero-vibrant/25 disabled:opacity-50 ${isModal ? "py-3 text-xs" : "py-2 text-[10px]"}`}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="h-4 w-4" />}
          Nächsten Tag auswerten
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onEnd}
          className={`flex items-center justify-center gap-2 rounded border border-red-800/60 bg-red-950/40 font-barlow font-extrabold uppercase text-red-200 hover:bg-red-900/50 disabled:opacity-50 ${isModal ? "py-3 text-xs" : "py-2 text-[10px]"}`}
        >
          <Square className="h-4 w-4" />
          Aufenthalt beenden
        </button>
      </div>

      {probe ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 px-3">
          <div className="w-full max-w-sm rounded-xl border border-accent-gold/40 bg-background-card p-4">
            <h3 className="font-barlow text-sm font-extrabold uppercase text-accent-gold">
              Probe anfordern
            </h3>
            <p className="mt-1 font-libre text-xs text-gray-400">
              {probe.characterName} · {probe.activity}
            </p>
            <label className="mt-3 block font-libre text-[10px] text-gray-400">
              Fertigkeit
              <select
                value={probe.skillKey}
                onChange={(e) => setProbe((p) => (p ? { ...p, skillKey: e.target.value } : p))}
                className="mt-0.5 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-sm text-white"
              >
                {DND5E_SKILLS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.labelDe}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block font-libre text-[10px] text-gray-400">
              SG (optional)
              <input
                type="number"
                min={1}
                max={30}
                value={probe.dc}
                onChange={(e) => setProbe((p) => (p ? { ...p, dc: e.target.value } : p))}
                className="mt-0.5 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProbe(null)}
                className="rounded border border-gray-600 px-3 py-2 font-barlow text-[10px] uppercase text-gray-300"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const dcNum = probe.dc.trim() ? Number(probe.dc) : undefined;
                  void run(async () => {
                    const res = await requestFapSkillCheck(sessionId, {
                      characterId: probe.characterId,
                      characterName: probe.characterName,
                      activity: probe.activity,
                      skillKey: probe.skillKey,
                      dc: dcNum,
                    });
                    if (res.ok) setProbe(null);
                    return res;
                  });
                }}
                className="rounded border border-accent-gold bg-accent-gold/20 px-3 py-2 font-barlow text-[10px] font-extrabold uppercase text-accent-gold"
              >
                In den Chat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Sehr einfacher SL-Parser: „Markt 2, Schlaf 3“ */
function parseGmDraft(raw: string): FapAllocationLine[] {
  const parts = raw.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
  const lines: FapAllocationLine[] = [];
  for (const part of parts) {
    const m = part.match(/^(.*?)[\s:]+(\d+)\s*$/);
    if (!m) continue;
    const activity = m[1].trim();
    const fap = Math.max(0, Math.round(Number(m[2]) || 0));
    if (!activity || fap <= 0) continue;
    lines.push({ activity, fap });
  }
  return lines;
}

export function startCityStayConfig(cityName: string): DowntimeConfig {
  const loc = cityName.trim();
  return {
    mode: "leisure",
    fromLocation: loc || undefined,
    dayLogs: [],
  };
}
