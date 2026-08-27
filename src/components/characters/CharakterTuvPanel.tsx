/**
 * Charakter-TÜV — KI-Prüfung des D&D-2024-Charakterbogens mit Rückfragen.
 * Eigener Sheet-Tab mit Platz für alle Hinweise und Rückfragen.
 */
"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  ClipboardCheck,
  Loader2,
  MessageCircleQuestion,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import {
  buildCharacterTuvSnapshot,
  createEmptyCharacterTuvState,
  parseCharacterTuvState,
  withAnswersApplied,
  withFindingResolved,
  type CharacterTuvFinding,
  type CharacterTuvState,
} from "@/src/lib/characters/dnd5e/character-tuv";
import type { Dnd5eSheetData } from "@/src/lib/characters/dnd5e/types";

type Meta = {
  name: string;
  className: string;
  subclass: string;
  race: string;
  background: string;
  level: number;
  experiencePoints: number;
};

type Props = {
  campaignId: string;
  characterId: string;
  sheet: Dnd5eSheetData;
  meta: Meta;
  readOnly: boolean;
  onSheetChange: (sheet: Dnd5eSheetData) => void;
  /** Persistiert sheet inkl. characterInspection (silent save). Sheet-Override vermeidet Stale-State. */
  onPersist?: (nextSheet: Dnd5eSheetData) => void;
};

function severityClass(severity: CharacterTuvFinding["severity"]): string {
  switch (severity) {
    case "error":
      return "border-red-800/80 text-red-300";
    case "warning":
      return "border-amber-700/70 text-amber-200";
    case "info":
      return "border-hero-dark/60 text-gray-400";
    default:
      return "border-accent-gold/50 text-accent-gold";
  }
}

export function CharakterTuvPanel({
  campaignId,
  characterId,
  sheet,
  meta,
  readOnly,
  onSheetChange,
  onPersist,
}: Props) {
  const { t, locale } = useCharacterSheetLocale();
  const [busy, setBusy] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});

  const tuv: CharacterTuvState = useMemo(() => {
    return (
      parseCharacterTuvState(sheet.characterInspection) ??
      createEmptyCharacterTuvState()
    );
  }, [sheet.characterInspection]);

  const openCount = tuv.openHintCount;
  const hasRun = Boolean(tuv.checkedAt);

  function applyTuv(next: CharacterTuvState): Dnd5eSheetData {
    const nextSheet = { ...sheet, characterInspection: next };
    onSheetChange(nextSheet);
    return nextSheet;
  }

  async function runInspection() {
    if (readOnly || busy) return;
    setBusy(true);
    try {
      const derived = computeDerivedDnd5eSheet(sheet, meta.level);
      const snapshot = buildCharacterTuvSnapshot({
        name: meta.name,
        className: meta.className || null,
        subclass: meta.subclass || null,
        race: meta.race || null,
        background: meta.background || null,
        level: meta.level,
        experiencePoints: meta.experiencePoints,
        sheet,
        derived,
        previousAnswers: {
          ...tuv.answers,
          ...Object.fromEntries(
            Object.entries(tuv.answers).flatMap(([qid, text]) => {
              const q = tuv.questions.find((x) => x.id === qid);
              if (!q?.fieldPath || !text.trim()) return [];
              return [[`field:${q.fieldPath}`, text] as const];
            }),
          ),
        },
        previousFindings: tuv.findings,
        locale,
      });

      const res = await fetch("/api/characters/character-tuv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          characterId,
          snapshot,
          locale,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        inspection?: CharacterTuvState;
        error?: string;
      };
      if (!res.ok || !data.inspection) {
        throw new Error(data.error || t("tuv.error"));
      }

      // Pflichtantworten aus Draft übernehmen, falls fieldPath matchte
      let next = data.inspection;
      if (Object.keys(draftAnswers).length > 0) {
        next = withAnswersApplied(next, draftAnswers);
      }
      const nextSheet = applyTuv(next);
      setDraftAnswers(next.answers);
      toast.success(
        t("tuv.checkDone", { count: next.openHintCount }),
      );
      onPersist?.(nextSheet);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("tuv.error"));
    } finally {
      setBusy(false);
    }
  }

  function saveAnswers() {
    if (readOnly) return;
    const merged = { ...tuv.answers, ...draftAnswers };
    const next = withAnswersApplied(tuv, merged);
    const nextSheet = applyTuv(next);
    setDraftAnswers(next.answers);
    toast.success(t("tuv.answersSaved"));
    onPersist?.(nextSheet);
  }

  function resolveFinding(id: string) {
    if (readOnly) return;
    const next = withFindingResolved(tuv, id);
    const nextSheet = applyTuv(next);
    onPersist?.(nextSheet);
  }

  const openQuestions = tuv.questions.filter((q) => {
    const answered = (draftAnswers[q.id] ?? tuv.answers[q.id] ?? "").trim();
    return q.required && !answered;
  });

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-1 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 shrink-0" />
            {t("tuv.title")}
          </h3>
          <p className="font-libre text-sm text-gray-400 leading-relaxed">
            {t("tuv.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasRun ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-barlow text-[11px] font-bold uppercase tracking-wide ${
                openCount === 0
                  ? "border-hero-border/60 bg-hero-vibrant/15 text-hero-vibrant"
                  : "border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
              }`}
            >
              {openCount === 0 ? (
                <BadgeCheck className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              {t("tuv.hintCount", { count: openCount })}
            </span>
          ) : null}
          <button
            type="button"
            disabled={readOnly || busy}
            onClick={() => void runInspection()}
            className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark/40 px-3 py-2 font-barlow text-[11px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardCheck className="h-4 w-4" />
            )}
            {busy ? t("tuv.checking") : t("tuv.checkButton")}
          </button>
        </div>
      </div>

      {busy ? (
        <p className="font-libre text-sm text-gray-400 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-accent-gold" />
          {t("tuv.checkingHint")}
        </p>
      ) : null}

      {hasRun ? (
        <div className="space-y-5 border-t border-hero-dark pt-4">
          {tuv.summary ? (
            <p className="font-libre text-sm text-gray-200 leading-relaxed max-w-4xl">
              {tuv.summary}
            </p>
          ) : null}

          {tuv.findings.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-blood border-b border-hero-border pb-1">
                {t("tuv.findings")}
              </h4>
              <ul className="space-y-2">
                {tuv.findings.map((f) => (
                  <li
                    key={f.id}
                    className={`rounded border px-3 py-2.5 ${severityClass(f.severity)} ${
                      f.resolved ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-barlow text-xs font-bold uppercase tracking-wide">
                          {f.title}
                          {f.resolved ? ` · ${t("tuv.resolved")}` : ""}
                        </p>
                        <p className="mt-1 font-libre text-sm text-gray-300 leading-relaxed">
                          {f.detail}
                        </p>
                      </div>
                      {!f.resolved && !readOnly && f.severity !== "info" ? (
                        <button
                          type="button"
                          onClick={() => resolveFinding(f.id)}
                          className="shrink-0 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:underline"
                        >
                          {t("tuv.markResolved")}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="font-libre text-sm text-hero-vibrant">{t("tuv.noFindings")}</p>
          )}

          {tuv.questions.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-blood border-b border-hero-border pb-1 flex items-center gap-2">
                <MessageCircleQuestion className="h-3.5 w-3.5" />
                {t("tuv.questions")}
                {openQuestions.length > 0 ? (
                  <span className="text-accent-gold">
                    ({t("tuv.openQuestions", { count: openQuestions.length })})
                  </span>
                ) : null}
              </h4>
              {tuv.questions.map((q) => {
                const value = draftAnswers[q.id] ?? tuv.answers[q.id] ?? "";
                return (
                  <label key={q.id} className="block space-y-1.5">
                    <span className="font-libre text-sm text-gray-200 leading-relaxed">
                      {q.prompt}
                      {q.required ? (
                        <span className="ml-1 text-accent-gold">*</span>
                      ) : null}
                    </span>
                    <textarea
                      value={value}
                      disabled={readOnly}
                      rows={3}
                      onChange={(e) =>
                        setDraftAnswers((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      placeholder={t("tuv.answerPlaceholder")}
                      className="w-full bg-slate-900 border border-hero-dark rounded p-2 text-white font-libre text-sm focus:border-hero-vibrant outline-none disabled:opacity-60"
                    />
                  </label>
                );
              })}
              {!readOnly ? (
                <button
                  type="button"
                  onClick={saveAnswers}
                  className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow text-[11px] font-bold uppercase text-black hover:bg-yellow-500"
                >
                  {t("tuv.saveAnswers")}
                </button>
              ) : null}
            </div>
          ) : null}

          {tuv.checkedAt ? (
            <p className="font-libre text-[10px] text-gray-500">
              {t("tuv.lastChecked")}:{" "}
              {new Date(tuv.checkedAt).toLocaleString(
                locale === "en" ? "en-US" : "de-DE",
              )}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="font-libre text-sm text-gray-500 leading-relaxed max-w-3xl">
          {t("tuv.emptyHint")}
        </p>
      )}
    </section>
  );
}
