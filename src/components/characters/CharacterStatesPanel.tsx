"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Shield, Smile, Sparkles, X, ZoomIn } from "lucide-react";
import {
  CHARACTER_CONDITION_DEFINITIONS,
  type CharacterConditionKey,
  type ConditionTokensMap,
} from "@/src/lib/characters/condition-tokens";
import {
  MOOD_STATE_DEFINITIONS,
  type MoodStateKey,
  type MoodTokensMap,
} from "@/src/lib/characters/mood-states";
import { resolveCharacterDisplayToken } from "@/src/lib/characters/display-token";
import {
  generateAllCharacterMoodTokens,
  generateCharacterMoodToken,
  loadCharacterStateData,
  setCharacterMoodState,
  toggleCharacterActiveCondition,
} from "@/src/app/dashboard/campaigns/[id]/character-state-actions";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

export type CharacterStatesPanelProps = {
  campaignId: string;
  characterId: string;
  moodState: MoodStateKey | null;
  moodTokens: MoodTokensMap;
  activeConditions: CharacterConditionKey[];
  conditionTokens: ConditionTokensMap;
  onMoodStateChange: (next: MoodStateKey | null) => void;
  onActiveConditionsChange: (next: CharacterConditionKey[]) => void;
  onMoodTokensChange: (next: MoodTokensMap) => void;
  baseTokenUrl: string;
  hasSourceImage: boolean;
  canManageMood?: boolean;
  canManageActiveConditions?: boolean;
  isGmViewer?: boolean;
};

function tokenImageSrc(url: string, generatedAt?: string): string {
  const base = url.trim();
  if (!base) return base;
  if (!generatedAt) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${encodeURIComponent(generatedAt)}`;
}

export function CharacterStatesPanel({
  campaignId,
  characterId,
  moodState,
  moodTokens,
  activeConditions,
  conditionTokens,
  onMoodStateChange,
  onActiveConditionsChange,
  onMoodTokensChange,
  baseTokenUrl,
  hasSourceImage,
  canManageMood = true,
  canManageActiveConditions = false,
  isGmViewer = false,
}: CharacterStatesPanelProps) {
  const { t, conditionLabel, locale } = useCharacterSheetLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [generatingMood, setGeneratingMood] = useState<MoodStateKey | "all" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMoodKey, setPreviewMoodKey] = useState<MoodStateKey | null>(null);
  const [brokenMoodImages, setBrokenMoodImages] = useState<Partial<Record<MoodStateKey, boolean>>>(
    {},
  );

  const moodLabel = useCallback(
    (key: MoodStateKey) => {
      const def = MOOD_STATE_DEFINITIONS.find((d) => d.key === key);
      if (!def) return key;
      return locale === "en" ? def.labelEn : def.labelDe;
    },
    [locale],
  );

  const display = useMemo(
    () =>
      resolveCharacterDisplayToken({
        baseTokenUrl,
        activeConditions,
        conditionTokens,
        moodState,
        moodTokens,
      }),
    [baseTokenUrl, activeConditions, conditionTokens, moodState, moodTokens],
  );

  const moodGeneratedCount = useMemo(
    () => MOOD_STATE_DEFINITIONS.filter((d) => moodTokens[d.key]?.url).length,
    [moodTokens],
  );
  const moodMissingCount = MOOD_STATE_DEFINITIONS.length - moodGeneratedCount;
  const isBulkGenerating = generatingMood === "all" && isLoading;

  const ensureSourceImage = () => {
    if (hasSourceImage) return true;
    alert(t("condition.needPortrait"));
    return false;
  };

  const refreshFromServer = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const result = await loadCharacterStateData({ campaignId, characterId });
      if (!result.success) {
        setFetchError(result.error ?? t("states.fetchError"));
        return;
      }
      onMoodStateChange(result.moodState);
      onMoodTokensChange(result.moodTokens);
      onActiveConditionsChange(result.activeConditions);
    } catch (error) {
      setFetchError(
        error instanceof Error ? error.message : t("states.fetchError"),
      );
    } finally {
      setIsFetching(false);
    }
  }, [
    campaignId,
    characterId,
    onActiveConditionsChange,
    onMoodStateChange,
    onMoodTokensChange,
    t,
  ]);

  useEffect(() => {
    void refreshFromServer();
  }, [refreshFromServer]);

  useEffect(() => {
    if (!previewUrl && !previewMoodKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewUrl(null);
        setPreviewMoodKey(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewUrl, previewMoodKey]);

  const openMoodPreview = (key: MoodStateKey) => {
    const entry = moodTokens[key];
    if (!entry?.url || brokenMoodImages[key]) return;
    setPreviewMoodKey(key);
    setPreviewUrl(tokenImageSrc(entry.url, entry.generated_at));
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewMoodKey(null);
  };

  const handleMoodSelect = async (key: MoodStateKey) => {
    if (!canManageMood || isLoading) return;
    const next = moodState === key ? null : key;
    setIsLoading(true);
    try {
      const result = await setCharacterMoodState({
        campaignId,
        characterId,
        moodKey: next,
      });
      if (!result.success) {
        alert(result.error ?? t("states.moodSaveError"));
        return;
      }
      onMoodStateChange(result.moodState);
    } catch (error) {
      alert(error instanceof Error ? error.message : t("states.moodSaveError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMoodToken = async (key: MoodStateKey) => {
    if (!canManageMood || isLoading) return;
    if (!ensureSourceImage()) return;
    setGeneratingMood(key);
    setIsLoading(true);
    try {
      const result = await generateCharacterMoodToken({
        campaignId,
        characterId,
        moodKey: key,
      });
      if (!result.success || !result.entry) {
        alert(result.error ?? t("states.moodGenerateError"));
        return;
      }
      onMoodTokensChange({ ...moodTokens, [key]: result.entry });
      await refreshFromServer();
    } catch (error) {
      alert(error instanceof Error ? error.message : t("states.moodGenerateError"));
    } finally {
      setIsLoading(false);
      setGeneratingMood(null);
    }
  };

  const handleGenerateAllMoodTokens = async (regenerateExisting: boolean) => {
    if (!canManageMood || isLoading) return;
    if (!ensureSourceImage()) return;

    if (regenerateExisting) {
      const ok = confirm(t("states.moodRegenerateAllConfirm"));
      if (!ok) return;
    } else if (moodMissingCount === 0) {
      alert(t("states.moodAllPresent"));
      return;
    }

    setGeneratingMood("all");
    setIsLoading(true);
    try {
      const result = await generateAllCharacterMoodTokens({
        campaignId,
        characterId,
        onlyMissing: !regenerateExisting,
      });

      if (result.entries && Object.keys(result.entries).length > 0) {
        onMoodTokensChange({ ...moodTokens, ...result.entries });
      }

      if (result.errors && Object.keys(result.errors).length > 0) {
        const failed = Object.entries(result.errors)
          .map(([k, msg]) => `${k}: ${msg}`)
          .join("\n");
        alert(
          result.generatedCount > 0
            ? `${result.generatedCount} Token erzeugt. Fehler bei:\n${failed}`
            : `KI-Generierung fehlgeschlagen:\n${failed}`,
        );
      } else if (result.generatedCount === 0) {
        alert(result.error ?? t("states.moodNoneGenerated"));
      }

      await refreshFromServer();
    } catch (error) {
      alert(error instanceof Error ? error.message : t("condition.generateNetworkError"));
    } finally {
      setIsLoading(false);
      setGeneratingMood(null);
    }
  };

  const handleToggleActiveCondition = async (key: CharacterConditionKey) => {
    if (!canManageActiveConditions || isLoading) return;
    setIsLoading(true);
    try {
      const result = await toggleCharacterActiveCondition({
        campaignId,
        characterId,
        conditionKey: key,
      });
      if (!result.success) {
        alert(result.error ?? t("states.activeSaveError"));
        return;
      }
      onActiveConditionsChange(result.activeConditions);
    } catch (error) {
      alert(error instanceof Error ? error.message : t("states.activeSaveError"));
    } finally {
      setIsLoading(false);
    }
  };

  const displayLabel = useMemo(() => {
    if (display.source === "gm_condition" && display.key) {
      return conditionLabel(display.key as CharacterConditionKey);
    }
    if (display.source === "mood" && display.key) {
      return moodLabel(display.key as MoodStateKey);
    }
    return t("states.displayBase");
  }, [conditionLabel, display.key, display.source, moodLabel, t]);

  return (
    <div className="space-y-4">
      {/* Anzeige-Übersicht */}
      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">
          {t("states.displayTitle")}
        </h3>
        <p className="font-libre text-xs text-gray-500">{t("states.displayHint")}</p>
        <div className="flex flex-wrap items-center gap-4">
          {display.url ? (
            <button
              type="button"
              onClick={() => {
                setPreviewMoodKey(null);
                setPreviewUrl(display.url);
              }}
              className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-hero-border bg-hero-dark hover:border-hero-vibrant"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={display.url} alt={displayLabel} className="h-full w-full object-cover" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" />
              </span>
            </button>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-hero-border/60 bg-hero-dark/40 font-libre text-[10px] text-gray-500 text-center px-2">
              {t("states.noDisplayToken")}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-barlow text-sm font-bold uppercase text-white">{displayLabel}</p>
            <p className="font-libre text-xs text-gray-500">
              {display.source === "gm_condition"
                ? t("states.sourceGm")
                : display.source === "mood"
                  ? t("states.sourceMood")
                  : t("states.sourceBase")}
            </p>
            {activeConditions.length > 0 && moodState ? (
              <p className="mt-1 font-libre text-xs text-amber-200/80">{t("states.gmOverridesMood")}</p>
            ) : null}
          </div>
        </div>
        {fetchError ? (
          <p className="rounded border border-red-900/50 bg-red-950/20 px-3 py-2 font-libre text-xs text-red-300">
            {fetchError}
          </p>
        ) : null}
      </section>

      {/* Aktive Zustände (GM) */}
      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {t("states.activeTitle")}
        </h3>
        <p className="font-libre text-xs text-gray-500">
          {canManageActiveConditions ? t("states.activeHintGm") : t("states.activeHintPlayer")}
        </p>
        {isFetching ? (
          <p className="font-libre text-xs text-gray-500">{t("states.loading")}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {CHARACTER_CONDITION_DEFINITIONS.map((def) => {
            const active = activeConditions.includes(def.key);
            return (
              <button
                key={def.key}
                type="button"
                disabled={!canManageActiveConditions || isLoading}
                onClick={() => handleToggleActiveCondition(def.key)}
                aria-pressed={active}
                className={`rounded border px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase transition-colors disabled:opacity-50 ${
                  active
                    ? "border-accent-gold/70 bg-accent-gold/15 text-accent-gold"
                    : "border-hero-border/50 bg-hero-dark/30 text-gray-400 hover:border-hero-vibrant hover:text-white"
                }`}
              >
                {conditionLabel(def.key)}
              </button>
            );
          })}
        </div>
        {activeConditions.length === 0 ? (
          <p className="font-libre text-xs text-gray-600 italic">{t("states.noActiveConditions")}</p>
        ) : null}
      </section>

      {/* Gemütszustand (Spieler) */}
      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
          <Smile className="h-4 w-4" />
          {t("states.moodTitle")}
        </h3>
        <p className="font-libre text-xs text-gray-500">{t("states.moodHint")}</p>
        {isGmViewer ? (
          <p className="font-libre text-xs text-amber-200/90">{t("states.moodGmHint")}</p>
        ) : null}
        <p className="font-libre text-xs text-gray-500">
          {t("states.moodProgress", {
            generated: moodGeneratedCount,
            total: MOOD_STATE_DEFINITIONS.length,
          })}
        </p>
        {canManageMood ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isLoading || !hasSourceImage}
              onClick={() => handleGenerateAllMoodTokens(false)}
              className="inline-flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/15 px-3 py-2 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:opacity-50"
            >
              {isBulkGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {moodMissingCount > 0
                ? t("states.moodGenerateMissing", { count: moodMissingCount })
                : t("states.moodGenerateAll")}
            </button>
            {moodGeneratedCount > 0 ? (
              <button
                type="button"
                disabled={isLoading || !hasSourceImage}
                onClick={() => handleGenerateAllMoodTokens(true)}
                className="inline-flex items-center gap-2 rounded border border-hero-border px-3 py-2 font-barlow text-xs font-bold uppercase text-gray-300 hover:border-hero-vibrant hover:text-white disabled:opacity-50"
              >
                {isBulkGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t("states.moodRegenerateAll")}
              </button>
            ) : null}
          </div>
        ) : null}
        {!hasSourceImage && canManageMood ? (
          <p className="rounded border border-amber-700/40 bg-amber-950/20 px-3 py-2 font-libre text-xs text-amber-200">
            {t("condition.needPortrait")}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOOD_STATE_DEFINITIONS.map((def) => {
            const selected = moodState === def.key;
            const entry = moodTokens[def.key];
            const isGenerating = (generatingMood === def.key || isBulkGenerating) && isLoading;
            const imageBroken = Boolean(entry?.url && brokenMoodImages[def.key]);
            const canPreview = Boolean(entry?.url && !imageBroken);
            return (
              <div
                key={def.key}
                className={`rounded-lg border p-4 flex flex-col gap-3 ${
                  selected
                    ? "border-accent-gold/60 bg-accent-gold/10"
                    : "border-hero-border/50 bg-hero-dark/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-barlow text-sm font-bold uppercase text-white truncate">
                    {moodLabel(def.key)}
                  </p>
                  {canManageMood ? (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleMoodSelect(def.key)}
                      className={`shrink-0 rounded border px-2 py-0.5 font-barlow text-[9px] font-bold uppercase ${
                        selected
                          ? "border-accent-gold text-accent-gold"
                          : "border-hero-border text-gray-400 hover:text-white"
                      }`}
                    >
                      {selected ? t("states.moodSelected") : t("states.moodSelect")}
                    </button>
                  ) : selected ? (
                    <span className="shrink-0 font-barlow text-[9px] font-bold uppercase text-accent-gold">
                      {t("states.moodSelected")}
                    </span>
                  ) : null}
                </div>
                {canPreview ? (
                  <button
                    type="button"
                    onClick={() => openMoodPreview(def.key)}
                    className="group relative mx-auto h-36 w-36 overflow-hidden rounded-full border-2 border-hero-border bg-hero-dark transition-colors hover:border-hero-vibrant focus:outline-none focus-visible:ring-2 focus-visible:ring-hero-vibrant focus-visible:ring-offset-2 focus-visible:ring-offset-background-card cursor-zoom-in"
                    title={moodLabel(def.key)}
                    aria-label={moodLabel(def.key)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tokenImageSrc(entry!.url, entry!.generated_at)}
                      alt={moodLabel(def.key)}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={() =>
                        setBrokenMoodImages((prev) => ({ ...prev, [def.key]: true }))
                      }
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100 drop-shadow-lg" />
                    </span>
                    {entry?.is_ai_generated ? (
                      <span
                        className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1.5 py-0.5"
                        title="KI-generiert"
                      >
                        <Sparkles className="h-3 w-3 text-accent-gold" />
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div className="relative mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-hero-border/50 bg-hero-dark font-libre text-[10px] text-gray-600 text-center px-2">
                    {entry?.url && imageBroken ? (
                      <span className="text-red-400">Bild beschädigt</span>
                    ) : (
                      t("condition.noTokenYet")
                    )}
                  </div>
                )}
                {canPreview ? (
                  <p className="text-center font-libre text-[10px] text-gray-500">
                    Klicken zum Vergrößern
                  </p>
                ) : null}
                {canManageMood ? (
                  <button
                    type="button"
                    disabled={isLoading || !hasSourceImage}
                    onClick={() => handleGenerateMoodToken(def.key)}
                    className="inline-flex items-center justify-center gap-1 rounded border border-accent-gold/50 bg-accent-gold/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {entry ? t("condition.regenerate") : t("condition.startAi")}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {previewUrl ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={previewMoodKey ? "mood-token-preview-title" : undefined}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label={t("condition.previewClose")}
            onClick={closePreview}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-hero-border bg-background-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                {previewMoodKey ? (
                  <h4
                    id="mood-token-preview-title"
                    className="font-barlow text-xl font-bold uppercase text-hero-vibrant"
                  >
                    {moodLabel(previewMoodKey)}
                  </h4>
                ) : (
                  <h4 className="font-barlow text-xl font-bold uppercase text-hero-vibrant">
                    {displayLabel}
                  </h4>
                )}
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded border border-hero-border p-2 text-gray-400 hover:text-white hover:border-hero-vibrant"
                aria-label={t("condition.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-auto aspect-square w-full max-w-[min(80vw,20rem)] overflow-hidden rounded-full border-4 border-hero-border bg-hero-dark shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {previewMoodKey && moodTokens[previewMoodKey]?.is_ai_generated ? (
                <span className="inline-flex items-center gap-1.5 font-barlow text-xs font-bold uppercase text-accent-gold">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("condition.aiGenerated")}
                </span>
              ) : null}
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-barlow text-xs font-bold uppercase text-gray-400 hover:text-hero-vibrant"
              >
                Original öffnen
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
