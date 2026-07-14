"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Trash2, X, ZoomIn } from "lucide-react";
import {
  CHARACTER_CONDITION_DEFINITIONS,
  type CharacterConditionKey,
  type ConditionTokensMap,
} from "@/src/lib/characters/condition-tokens";
import {
  generateAllCharacterConditionTokens,
  generateCharacterConditionToken,
  loadCharacterConditionTokens,
  removeCharacterConditionToken,
} from "@/src/app/dashboard/campaigns/[id]/character-token-actions";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

export type CharacterConditionTokensPanelProps = {
  campaignId: string;
  characterId: string;
  conditionTokens: ConditionTokensMap;
  onConditionTokensChange: (next: ConditionTokensMap) => void;
  /** Portrait oder Basis-Token muss vorhanden sein */
  hasSourceImage: boolean;
  canManage?: boolean;
  /** GM darf KI auch in der Vorschau starten */
  isGm?: boolean;
};

function tokenImageSrc(url: string, generatedAt?: string): string {
  const base = url.trim();
  if (!base) return base;
  if (!generatedAt) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${encodeURIComponent(generatedAt)}`;
}

export function CharacterConditionTokensPanel({
  campaignId,
  characterId,
  conditionTokens,
  onConditionTokensChange,
  hasSourceImage,
  canManage = true,
  isGm = false,
}: CharacterConditionTokensPanelProps) {
  const { t, conditionLabel } = useCharacterSheetLocale();
  const [tokens, setTokens] = useState<ConditionTokensMap>(() => conditionTokens);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState<CharacterConditionKey | "all" | null>(null);
  const [brokenImages, setBrokenImages] = useState<Partial<Record<CharacterConditionKey, boolean>>>(
    {},
  );
  const [previewKey, setPreviewKey] = useState<CharacterConditionKey | null>(null);

  const previewDef = useMemo(
    () =>
      previewKey
        ? CHARACTER_CONDITION_DEFINITIONS.find((d) => d.key === previewKey) ?? null
        : null,
    [previewKey],
  );
  const previewEntry = previewKey ? tokens[previewKey] : undefined;

  useEffect(() => {
    if (!previewKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewKey(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewKey]);

  const applyTokens = useCallback(
    (next: ConditionTokensMap) => {
      setTokens(next);
      onConditionTokensChange(next);
      setBrokenImages({});
    },
    [onConditionTokensChange],
  );

  const refreshTokensFromServer = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const result = await loadCharacterConditionTokens({ campaignId, characterId });
      if (!result.success) {
        setFetchError(result.error ?? t("condition.fetchError"));
        return;
      }
      applyTokens(result.tokens);
    } catch (error) {
      setFetchError(
        error instanceof Error
          ? error.message
          : t("condition.fetchError"),
      );
    } finally {
      setIsFetching(false);
    }
  }, [applyTokens, campaignId, characterId]);

  useEffect(() => {
    void refreshTokensFromServer();
  }, [refreshTokensFromServer]);

  useEffect(() => {
    if (Object.keys(conditionTokens).length > 0) {
      setTokens(conditionTokens);
    }
  }, [conditionTokens]);

  const generatedCount = useMemo(
    () => CHARACTER_CONDITION_DEFINITIONS.filter((d) => tokens[d.key]?.url).length,
    [tokens],
  );
  const missingCount = CHARACTER_CONDITION_DEFINITIONS.length - generatedCount;

  const ensureSourceImage = () => {
    if (hasSourceImage) return true;
    alert(t("condition.needPortrait"));
    return false;
  };

  const handleGenerateOne = async (key: CharacterConditionKey) => {
    if (!canManage || isLoading) return;
    if (!ensureSourceImage()) return;

    setGeneratingKey(key);
    setIsLoading(true);
    try {
      const result = await generateCharacterConditionToken({
        campaignId,
        characterId,
        conditionKey: key,
      });
      if (!result.success || !result.entry) {
        alert(result.error ?? t("condition.generateError"));
        return;
      }
      applyTokens({ ...tokens, [key]: result.entry });
      await refreshTokensFromServer();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : t("condition.generateNetworkError"),
      );
    } finally {
      setIsLoading(false);
      setGeneratingKey(null);
    }
  };

  const handleGenerateAll = async (regenerateExisting: boolean) => {
    if (!canManage || isLoading) return;
    if (!ensureSourceImage()) return;

    if (regenerateExisting) {
      const ok = confirm(
        t("condition.regenerateAllConfirm"),
      );
      if (!ok) return;
    } else if (missingCount === 0) {
      alert(t("condition.allPresent"));
      return;
    }

    setGeneratingKey("all");
    setIsLoading(true);
    try {
      const result = await generateAllCharacterConditionTokens({
        campaignId,
        characterId,
        onlyMissing: !regenerateExisting,
      });

      if (result.entries && Object.keys(result.entries).length > 0) {
        applyTokens({ ...tokens, ...result.entries });
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
        alert(result.error ?? t("condition.noneGenerated"));
      }

      await refreshTokensFromServer();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : t("condition.generateNetworkError"),
      );
    } finally {
      setIsLoading(false);
      setGeneratingKey(null);
    }
  };

  const handleRemove = async (key: CharacterConditionKey) => {
    if (!canManage || isLoading) return;
    if (!confirm(t("condition.deleteConfirm"))) return;

    setIsLoading(true);
    try {
      const result = await removeCharacterConditionToken({
        campaignId,
        characterId,
        conditionKey: key,
      });
      if (!result.success) {
        alert(result.error ?? t("condition.deleteError"));
        return;
      }
      const next = { ...tokens };
      delete next[key];
      applyTokens(next);
      await refreshTokensFromServer();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : t("condition.deleteNetworkError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isBulkGenerating = generatingKey === "all" && isLoading;

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
      <div className="border-b border-hero-dark pb-3 space-y-2">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          {t("condition.title")}
        </h3>
        <p className="font-libre text-xs text-gray-500">
          {t("condition.hint")}
        </p>
        {isGm ? (
          <p className="font-libre text-xs text-amber-200/90">
            {t("condition.gmHint")}
          </p>
        ) : null}
        <p className="font-libre text-xs text-gray-500">
          {isFetching
            ? t("condition.loading")
            : t("condition.progress", {
                generated: generatedCount,
                total: CHARACTER_CONDITION_DEFINITIONS.length,
              })}
        </p>
        {fetchError ? (
          <p className="rounded border border-red-900/50 bg-red-950/20 px-3 py-2 font-libre text-xs text-red-300">
            {fetchError}
          </p>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isLoading || !hasSourceImage}
            onClick={() => handleGenerateAll(false)}
            className="inline-flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/15 px-3 py-2 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:opacity-50"
          >
            {isBulkGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {missingCount > 0
              ? t("condition.generateMissing", { count: missingCount })
              : t("condition.generateAll")}
          </button>
          {generatedCount > 0 ? (
            <button
              type="button"
              disabled={isLoading || !hasSourceImage}
              onClick={() => handleGenerateAll(true)}
              className="inline-flex items-center gap-2 rounded border border-hero-border px-3 py-2 font-barlow text-xs font-bold uppercase text-gray-300 hover:text-white hover:border-hero-vibrant disabled:opacity-50"
            >
              {isBulkGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t("condition.regenerateAll")}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="font-libre text-xs text-gray-500 italic">
          Noch keine Zustands-Token erzeugt. Der Spieler oder Spielleiter kann die KI im Bearbeitungsmodus
          starten.
        </p>
      )}

      {!hasSourceImage ? (
        <p className="rounded border border-amber-700/40 bg-amber-950/20 px-3 py-2 font-libre text-xs text-amber-200">
          Lade zuerst ein Portrait oder Karten-Token hoch — die KI nutzt es als Vorlage.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHARACTER_CONDITION_DEFINITIONS.map((def) => {
          const entry = tokens[def.key];
          const isGenerating = generatingKey === def.key && isLoading;
          const imageBroken = Boolean(entry?.url && brokenImages[def.key]);
          const canPreview = Boolean(entry?.url && !imageBroken);

          return (
            <div
              key={def.key}
              className="rounded-lg border border-hero-border/50 bg-hero-dark/30 p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-barlow text-sm font-bold uppercase text-white truncate">
                    {conditionLabel(def.key)}
                  </p>
                </div>
              </div>

              {canPreview ? (
                <button
                  type="button"
                  onClick={() => setPreviewKey(def.key)}
                  className="group relative mx-auto h-36 w-36 overflow-hidden rounded-full border-2 border-hero-border bg-hero-dark transition-colors hover:border-hero-vibrant focus:outline-none focus-visible:ring-2 focus-visible:ring-hero-vibrant focus-visible:ring-offset-2 focus-visible:ring-offset-background-card cursor-zoom-in"
                  title={conditionLabel(def.key)}
                  aria-label={conditionLabel(def.key)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-URL */}
                  <img
                    src={tokenImageSrc(entry!.url, entry!.generated_at)}
                    alt={conditionLabel(def.key)}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [def.key]: true }))
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
                <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-full border-2 border-hero-border bg-hero-dark">
                  {entry?.url && imageBroken ? (
                    <div className="flex h-full w-full flex-col items-center justify-center font-libre text-[10px] text-red-400 text-center px-2 gap-1">
                      <span>Bild beschädigt</span>
                      {canManage ? (
                        <span className="text-[9px] text-gray-500">Neu generieren</span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-libre text-[10px] text-gray-600 text-center px-2">
                      {isFetching ? "…" : t("condition.noTokenYet")}
                    </div>
                  )}
                </div>
              )}

              {canPreview ? (
                <p className="text-center font-libre text-[10px] text-gray-500">
                  Klicken zum Vergrößern
                </p>
              ) : null}

              {canManage ? (
                <div className="flex flex-wrap gap-1 justify-center">
                  <button
                    type="button"
                    disabled={isLoading || !hasSourceImage}
                    onClick={() => handleGenerateOne(def.key)}
                    className="inline-flex items-center gap-1 rounded border border-accent-gold/50 bg-accent-gold/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {entry ? t("condition.regenerate") : t("condition.startAi")}
                  </button>
                  {entry ? (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleRemove(def.key)}
                      className="inline-flex items-center gap-1 rounded border border-red-900/50 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-red-400 hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Entfernen
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {previewDef && previewEntry?.url && !brokenImages[previewDef.key] ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="condition-token-preview-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label={t("condition.previewClose")}
            onClick={() => setPreviewKey(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-hero-border bg-background-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4
                  id="condition-token-preview-title"
                  className="font-barlow text-xl font-bold uppercase text-hero-vibrant"
                >
                  {conditionLabel(previewDef.key)}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewKey(null)}
                className="rounded border border-hero-border p-2 text-gray-400 hover:text-white hover:border-hero-vibrant"
                aria-label={t("condition.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-auto aspect-square w-full max-w-[min(80vw,20rem)] overflow-hidden rounded-full border-4 border-hero-border bg-hero-dark shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-URL */}
              <img
                src={tokenImageSrc(previewEntry.url, previewEntry.generated_at)}
                alt={conditionLabel(previewDef.key)}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {previewEntry.is_ai_generated ? (
                <span className="inline-flex items-center gap-1.5 font-barlow text-xs font-bold uppercase text-accent-gold">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("condition.aiGenerated")}
                </span>
              ) : null}
              <a
                href={tokenImageSrc(previewEntry.url, previewEntry.generated_at)}
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
    </section>
  );
}
