"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { getCharacterInventory } from "@/src/lib/actions/character-inventory-actions";
import { submitFapAllocation } from "@/src/lib/actions/downtime-actions";
import {
  FAP_DAILY_TOTAL,
  maxNonSleepFapBudget,
  minSleepFapForStarvation,
  nonSleepFapSum,
  requiredSleepFap,
  sleepFapSum,
  type FapAllocationLine,
} from "@/src/lib/downtime-fap-types";
import type { CharacterItem } from "@/src/types/inventory";

const GENERAL_ACTIVITIES = [
  "Schlaf",
  "Wache halten",
  "Jagen",
  "Kochen",
  "Lager sortieren",
  "Sozialisieren",
  "Item studieren",
];

type Line = FapAllocationLine;

type Props = {
  sessionId: string;
  characterId: string;
  characterName: string;
  downtimeActive: boolean;
  /** Bereits „ready“ für heute — Overlay nur Planung */
  planningStatus: "planning" | "ready" | null;
  onClose: () => void;
  onSubmitted: () => void | Promise<void>;
};

function emptyLine(): Line {
  return { activity: "Wache halten", fap: 0 };
}

export function DowntimePlayerOverlay({
  sessionId,
  characterId,
  characterName,
  downtimeActive,
  planningStatus,
  onClose,
  onSubmitted,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [sleepDebt, setSleepDebt] = useState(0);
  const [rationsCount, setRationsCount] = useState(0);
  const [starvationDays, setStarvationDays] = useState(0);
  const [studyItems, setStudyItems] = useState<CharacterItem[]>([]);
  const [lines, setLines] = useState<Line[]>([]);

  const needSleep = useMemo(() => requiredSleepFap(sleepDebt), [sleepDebt]);
  const maxNonSleep = useMemo(
    () => maxNonSleepFapBudget(needSleep, starvationDays),
    [needSleep, starvationDays],
  );

  const load = useCallback(async () => {
    try {
      const inv = await getCharacterInventory(characterId);
      setSleepDebt(inv.sleep_debt_fap ?? 0);
      setRationsCount(inv.rations_count ?? 0);
      setStarvationDays(inv.starvation_days ?? 0);
      const need = requiredSleepFap(inv.sleep_debt_fap ?? 0);
      const starv = Math.max(0, Math.round(inv.starvation_days ?? 0));
      const sleepFap = minSleepFapForStarvation(need, starv);
      const wakeFap = Math.max(0, FAP_DAILY_TOTAL - sleepFap);
      const projects = inv.items.filter(
        (it) => it.target_fap > 0 && it.current_fap < it.target_fap,
      );
      setStudyItems(projects);
      setLines([
        { activity: "Schlaf", fap: sleepFap },
        { activity: "Wache halten", fap: wakeFap },
      ]);
    } catch {
      setLines([{ activity: "Schlaf", fap: 2 }, emptyLine()]);
      setRationsCount(0);
      setStarvationDays(0);
    }
  }, [characterId]);

  useEffect(() => {
    if (!downtimeActive || !characterId) return;
    void load();
  }, [downtimeActive, characterId, load]);

  const totalFap = lines.reduce((s, l) => s + Math.max(0, Math.round(l.fap)), 0);
  const sleepSum = sleepFapSum(lines);
  const nonSleepSum = nonSleepFapSum(lines);

  const canSubmit =
    downtimeActive &&
    planningStatus === "planning" &&
    totalFap === FAP_DAILY_TOTAL &&
    sleepSum >= needSleep &&
    nonSleepSum <= maxNonSleep &&
    lines.every((l) => {
      if (l.activity === "Item studieren") {
        return !!l.targetItemId && studyItems.some((it) => it.id === l.targetItemId);
      }
      return true;
    });

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await submitFapAllocation(sessionId, characterId, lines);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      await onSubmitted();
    });
  };

  const rationLineClass =
    rationsCount === 0 && starvationDays > 0
      ? "animate-pulse font-extrabold text-red-400"
      : rationsCount <= 2
        ? "text-orange-400"
        : "text-gray-200";

  if (!downtimeActive) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-accent-gold/40 bg-background-card p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-barlow text-lg font-extrabold uppercase tracking-wide text-hero-vibrant">
              Reisetag planen
            </h2>
            <p className="font-libre text-sm text-gray-300">{characterName}</p>
            <p className="mt-1 font-libre text-xs text-gray-500">
              {FAP_DAILY_TOTAL} FAP pro Tag — mindestens {needSleep} FAP für{" "}
              <span className="text-accent-gold">Schlaf</span>
              {sleepDebt > 0 ? " (Schlafdefizit)" : ""}.
              {starvationDays > 0 ? (
                <>
                  {" "}
                  Außerhalb von „Schlaf“ höchstens {maxNonSleep} FAP (Hunger-Malus).
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-background-dark hover:text-white"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {starvationDays > 0 ? (
          <div
            role="alert"
            className="mb-3 rounded border border-red-800/70 bg-red-950/50 px-3 py-2 font-libre text-sm text-red-100"
          >
            Hunger-Malus: −{starvationDays} FAP (max. verteilbar außerhalb von „Schlaf“: {maxNonSleep}).
          </div>
        ) : null}

        <p
          className={`mb-3 font-barlow text-sm font-bold uppercase tracking-wide ${rationLineClass}`}
        >
          🎒 Rationen: {rationsCount}/10
        </p>

        {planningStatus === "ready" ? (
          <p className="font-libre text-sm text-accent-gold">
            Deine Planung für heute ist eingereicht. Warte auf den Spielleiter für den nächsten
            Reisetag.
          </p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between font-barlow text-[10px] font-bold uppercase text-gray-500">
              <span>Aktionen</span>
              <span className={totalFap === FAP_DAILY_TOTAL ? "text-hero-vibrant" : "text-amber-300"}>
                Summe: {totalFap} / {FAP_DAILY_TOTAL} FAP
              </span>
            </div>

            <ul className="space-y-2">
              {lines.map((line, idx) => (
                <li
                  key={idx}
                  className="flex flex-wrap items-end gap-2 rounded border border-hero-border/50 bg-background-dark/60 p-2"
                >
                  <label className="min-w-[140px] flex-1 font-libre text-[10px] text-gray-400">
                    Aktivität
                    <select
                      value={line.activity}
                      onChange={(e) => {
                        const activity = e.target.value;
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? {
                                  ...l,
                                  activity,
                                  targetItemId:
                                    activity === "Item studieren" ? l.targetItemId : undefined,
                                }
                              : l,
                          ),
                        );
                      }}
                      className="mt-0.5 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-accent-gold"
                    >
                      {GENERAL_ACTIVITIES.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </label>
                  {line.activity === "Item studieren" ? (
                    <label className="min-w-[160px] flex-1 font-libre text-[10px] text-gray-400">
                      Item
                      <select
                        value={line.targetItemId ?? ""}
                        onChange={(e) => {
                          const targetItemId = e.target.value || undefined;
                          setLines((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, targetItemId } : l)),
                          );
                        }}
                        className="mt-0.5 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-accent-gold"
                      >
                        <option value="">— Wählen —</option>
                        {studyItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} ({it.current_fap}/{it.target_fap} FAP)
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="w-20 font-libre text-[10px] text-gray-400">
                    FAP
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={line.fap}
                      onChange={(e) => {
                        const fap = Math.max(0, Math.min(6, Math.round(Number(e.target.value) || 0)));
                        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, fap } : l)));
                      }}
                      className="mt-0.5 w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-barlow text-sm text-white outline-none focus:border-accent-gold"
                    />
                  </label>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                      className="mb-0.5 rounded p-1.5 text-red-300 hover:bg-red-950/60"
                      aria-label="Zeile entfernen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="w-8" />
                  )}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="mt-2 inline-flex items-center gap-1 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-accent-gold"
            >
              <Plus className="h-3 w-3" />
              Zeile
            </button>

            {sleepSum < needSleep ? (
              <p className="mt-2 font-libre text-xs text-amber-300">
                Zu wenig Schlaf-FAP (aktuell {sleepSum}, benötigt {needSleep}).
              </p>
            ) : null}

            {nonSleepSum > maxNonSleep ? (
              <p className="mt-2 font-libre text-xs text-red-300">
                Zu viele FAP außerhalb von „Schlaf“ (aktuell {nonSleepSum}, erlaubt {maxNonSleep}).
              </p>
            ) : null}

            <button
              type="button"
              disabled={!canSubmit || isPending}
              onClick={handleSubmit}
              className="mt-4 w-full rounded border border-accent-gold bg-accent-gold/20 py-3 font-barlow text-sm font-extrabold uppercase text-accent-gold hover:bg-accent-gold/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                "Tagesplanung abschließen"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
