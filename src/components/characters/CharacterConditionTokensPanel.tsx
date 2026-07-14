"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
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
  const [tokens, setTokens] = useState<ConditionTokensMap>(() => conditionTokens);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState<CharacterConditionKey | "all" | null>(null);
  const [brokenImages, setBrokenImages] = useState<Partial<Record<CharacterConditionKey, boolean>>>(
    {},
  );

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
        setFetchError(result.error ?? "Zustands-Token konnten nicht geladen werden.");
        return;
      }
      applyTokens(result.tokens);
    } catch (error) {
      setFetchError(
        error instanceof Error
          ? error.message
          : "Zustands-Token konnten nicht geladen werden.",
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
    alert("Bitte lade zuerst ein Portrait oder Basis-Token hoch.");
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
        alert(result.error ?? "KI-Generierung fehlgeschlagen.");
        return;
      }
      applyTokens({ ...tokens, [key]: result.entry });
      await refreshTokensFromServer();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unerwarteter Fehler bei der KI-Generierung (Timeout oder Netzwerk).",
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
        "Alle 12 Zustands-Token neu generieren? Bestehende Bilder werden ersetzt. Das kann einige Minuten dauern.",
      );
      if (!ok) return;
    } else if (missingCount === 0) {
      alert("Alle Zustands-Token sind bereits vorhanden. Nutze „Neu generieren“ pro Zustand oder „Alle neu generieren“.");
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
        alert(result.error ?? "Keine Token erzeugt.");
      }

      await refreshTokensFromServer();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unerwarteter Fehler bei der KI-Generierung (Timeout oder Netzwerk).",
      );
    } finally {
      setIsLoading(false);
      setGeneratingKey(null);
    }
  };

  const handleRemove = async (key: CharacterConditionKey) => {
    if (!canManage || isLoading) return;
    if (!confirm("Zustands-Token wirklich entfernen?")) return;

    setIsLoading(true);
    try {
      const result = await removeCharacterConditionToken({
        campaignId,
        characterId,
        conditionKey: key,
      });
      if (!result.success) {
        alert(result.error ?? "Löschen fehlgeschlagen.");
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
          : "Unerwarteter Fehler beim Löschen (Timeout oder Netzwerk).",
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
          Zustands-Token (KI)
        </h3>
        <p className="font-libre text-xs text-gray-500">
          Erstelle aus deinem Basis-Token Varianten für typische Foundry-Zustände. Die KI passt nur
          das Avatarbild an — Identität und Stil bleiben erhalten. Später wechselt der Token auf der
          Karte automatisch je nach Zustand.
        </p>
        {isGm ? (
          <p className="font-libre text-xs text-amber-200/90">
            Als Spielleiter kannst du die KI-Generierung für diesen Charakter starten.
          </p>
        ) : null}
        <p className="font-libre text-xs text-gray-500">
          {isFetching ? "Lade Zustands-Token…" : `${generatedCount} von ${CHARACTER_CONDITION_DEFINITIONS.length} Zuständen mit Token.`}
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
              ? `KI starten: ${missingCount} fehlende generieren`
              : "Alle Zustände generieren"}
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
              Alle neu generieren
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CHARACTER_CONDITION_DEFINITIONS.map((def) => {
          const entry = tokens[def.key];
          const isGenerating = generatingKey === def.key && isLoading;
          const imageBroken = Boolean(entry?.url && brokenImages[def.key]);

          return (
            <div
              key={def.key}
              className="rounded-lg border border-hero-border/50 bg-hero-dark/30 p-3 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-barlow text-xs font-bold uppercase text-white truncate">
                    {def.labelDe}
                  </p>
                  <p className="font-libre text-[10px] text-gray-500">{def.labelEn}</p>
                </div>
              </div>

              <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border border-hero-border bg-hero-dark">
                {entry?.url && !imageBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-URL
                  <img
                    src={tokenImageSrc(entry.url, entry.generated_at)}
                    alt={def.labelDe}
                    className="h-full w-full object-cover"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [def.key]: true }))
                    }
                  />
                ) : entry?.url && imageBroken ? (
                  <div className="flex h-full w-full items-center justify-center font-libre text-[9px] text-red-400 text-center px-1">
                    Bild nicht ladbar
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-libre text-[9px] text-gray-600 text-center px-1">
                    {isFetching ? "…" : "Noch kein Token"}
                  </div>
                )}
                {entry?.is_ai_generated ? (
                  <span
                    className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 py-0.5"
                    title="KI-generiert"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-accent-gold" />
                  </span>
                ) : null}
              </div>

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
                    {entry ? "Neu generieren" : "KI starten"}
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
    </section>
  );
}
