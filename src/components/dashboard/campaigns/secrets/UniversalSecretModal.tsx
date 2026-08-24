"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, Sparkles, X, AlertCircle, ScrollText, Star, Dice6 } from "lucide-react";
import { generateSecret, generateConspiracy } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { saveSecret, getRelatedSecrets } from "@/src/app/dashboard/campaigns/[id]/secrets-actions";

type UniversalSecretModalProps = {
  entityId: string;
  entityType: "npc" | "faction" | "lore";
  campaignId: string;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const ENTITY_TYPE_LABELS = {
  npc: "NPC",
  faction: "Fraktion",
  lore: "Lore-Eintrag",
};

const ENTITY_TYPE_DESCRIPTIONS = {
  npc: "Die KI analysiert Fraktion, Beziehungen, Standort und bestehende GM-Notizen dieses NPCs und schlägt ein tief vernetztes Geheimnis vor.",
  faction: "Die KI analysiert Ziele, Philosophie, Feindbilder und Struktur dieser Fraktion und schlägt ein plotrelevantes Geheimnis vor.",
  lore: "Die KI analysiert historische Ereignisse, verwandte Orte und GM-Notizen dieses Lore-Eintrags und schlägt ein verborgenes Wissen vor.",
};

export function UniversalSecretModal({
  entityId,
  entityType,
  campaignId,
  entityName,
  isOpen,
  onClose,
  onCreated,
}: UniversalSecretModalProps) {
  const [isPending, startTransition] = useTransition();
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [relatedSecrets, setRelatedSecrets] = useState<
    Array<{
      id: string;
      entity_id: string;
      entity_type: string;
      entity_name: string;
      title: string | null;
      content: string;
    }>
  >([]);
  const [selectedContextSecrets, setSelectedContextSecrets] = useState<Set<string>>(new Set());
  const [prioritizedSecrets, setPrioritizedSecrets] = useState<Set<string>>(new Set());
  const [isLoadingRelatedSecrets, setIsLoadingRelatedSecrets] = useState(false);
  const [conspiracyRadius, setConspiracyRadius] = useState<"LOKAL" | "FRAKTION" | "STADT" | "REGION" | "WELT">("LOKAL");
  const [showConspiracyMode, setShowConspiracyMode] = useState(false);
  const [selectedConspiracySecrets, setSelectedConspiracySecrets] = useState<
    Array<{ id: string; entity_name: string; title: string | null; content: string }>
  >([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meaning, setMeaning] = useState("");
  const [secretType, setSecretType] = useState("");
  const [discoveryDc, setDiscoveryDc] = useState<number>(15);

  useEffect(() => {
    if (!isOpen) {
      setHasGenerated(false);
      setError(null);
      setShowContextSelector(false);
      setRelatedSecrets([]);
      setSelectedContextSecrets(new Set());
      setPrioritizedSecrets(new Set());
      setShowConspiracyMode(false);
      setConspiracyRadius("LOKAL");
      setSelectedConspiracySecrets([]);
      setTitle("");
      setContent("");
      setMeaning("");
      setSecretType("");
      setDiscoveryDc(15);
    }
  }, [isOpen]);

  const handleShowContextSelector = async () => {
    setIsLoadingRelatedSecrets(true);
    try {
      const secrets = await getRelatedSecrets(campaignId, entityId, entityType);
      setRelatedSecrets(secrets);
      setShowContextSelector(true);
    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Laden verwandter Geheimnisse: " + (err?.message || "Unbekannter Fehler"));
    } finally {
      setIsLoadingRelatedSecrets(false);
    }
  };

  const toggleSecretSelection = (secretId: string) => {
    const newSet = new Set(selectedContextSecrets);
    if (newSet.has(secretId)) {
      newSet.delete(secretId);
      // Wenn abgewählt, auch Priorität entfernen
      const newPrioritized = new Set(prioritizedSecrets);
      newPrioritized.delete(secretId);
      setPrioritizedSecrets(newPrioritized);
    } else {
      newSet.add(secretId);
    }
    setSelectedContextSecrets(newSet);
  };

  const togglePrioritization = (secretId: string) => {
    if (!selectedContextSecrets.has(secretId)) return; // Nur wenn ausgewählt
    const newSet = new Set(prioritizedSecrets);
    if (newSet.has(secretId)) {
      newSet.delete(secretId);
    } else {
      newSet.add(secretId);
    }
    setPrioritizedSecrets(newSet);
  };

  const handleGenerateConspiracy = () => {
    setError(null);
    startTransition(async () => {
      try {
        // Lade zuerst die ausgewählten Geheimnisse (ohne Generierung)
        // Dafür müssen wir die Logik in eine separate Funktion auslagern
        // Für jetzt: Generiere direkt, aber zeige die ausgewählten Geheimnisse
        const result = await generateConspiracy(
          campaignId,
          entityId,
          entityType,
          conspiracyRadius
        );
        
        // Zeige ausgewählte Geheimnisse kurz an
        if (result.selectedSecrets && result.selectedSecrets.length > 0) {
          setSelectedConspiracySecrets(result.selectedSecrets);
          // Warte kurz, damit der User die Auswahl sieht
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        setTitle(result.title);
        setContent(result.content);
        setMeaning(result.meaning);
        setSecretType(result.secret_type);

        const dc = Number(result.discovery_dc ?? 15);
        const clamped = Math.max(10, Math.min(25, Number.isNaN(dc) ? 15 : Math.round(dc)));
        setDiscoveryDc(clamped);

        setHasGenerated(true);
        setShowConspiracyMode(false);
        setSelectedConspiracySecrets([]);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ||
            "Fehler bei der Verschwörungs-Generierung. Bitte versuche es erneut."
        );
      }
    });
  };

  if (!isOpen) return null;

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        // Baue contextSecrets Array aus ausgewählten Geheimnissen
        const contextSecrets = Array.from(selectedContextSecrets).map((secretId) => ({
          id: secretId,
          isPrioritized: prioritizedSecrets.has(secretId),
        }));

        const result = await generateSecret(campaignId, entityId, entityType, contextSecrets);
        setTitle(result.title);
        setContent(result.content);
        setMeaning(result.meaning);
        setSecretType(result.secret_type);

        const dc = Number(result.discovery_dc ?? 15);
        const clamped = Math.max(10, Math.min(25, Number.isNaN(dc) ? 15 : Math.round(dc)));
        setDiscoveryDc(clamped);

        setHasGenerated(true);
        setShowContextSelector(false);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ||
            "Fehler bei der KI-Generierung. Bitte versuche es erneut oder passe den Kontext an."
        );
      }
    });
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      setError("Titel und Inhalt dürfen nicht leer sein.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const dc = Math.max(10, Math.min(25, Math.round(discoveryDc || 15)));
        await saveSecret(campaignId, entityId, entityType, {
          title: title.trim(),
          content: content.trim(),
          meaning: meaning.trim(),
          secret_type: secretType.trim() || "Wissen",
          discovery_dc: dc,
          is_ai_generated: hasGenerated, // Markiere als KI-generiert, wenn es generiert wurde
        });

        if (onCreated) {
          onCreated();
        }
        onClose();
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ||
            "Fehler beim Speichern des Geheimnisses. Bitte versuche es erneut."
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => {
          if (!isPending) onClose();
        }}
      />

      {/* Modal */}
      <div
        className="relative z-50 w-full max-w-3xl rounded-xl border-2 border-accent-gold/50 bg-background-card shadow-2xl overflow-hidden"
        style={{
          backgroundImage: "url('/images/scroll-paper.webp')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay for readability - KEINE Transparenz */}
        <div className="absolute inset-0 bg-zinc-950/95 pointer-events-none" />

        <div className="relative z-10 p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-accent-gold/40">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-hero-dark/80 p-2 border border-accent-gold/60">
                <ScrollText className="h-6 w-6 text-accent-gold" />
              </div>
              <div>
                <h2 className="font-barlow font-extrabold text-xl uppercase tracking-wide text-accent-gold">
                  AI Secret Architect
                </h2>
                <p className="font-libre text-sm text-gray-200">
                  Neues {ENTITY_TYPE_LABELS[entityType]}-Geheimnis für{" "}
                  <span className="font-semibold text-hero-vibrant">{entityName}</span>.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isPending}
              className="rounded-full p-1.5 text-gray-200 hover:text-accent-gold hover:bg-black/40 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded border border-red-700 bg-red-950/80 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
              <p className="font-libre text-xs text-red-100">{error}</p>
            </div>
          )}

          {/* Intro / Generate step */}
          {!hasGenerated && !showContextSelector && !showConspiracyMode && (
            <div className="space-y-4">
              <p className="font-libre text-sm text-gray-100 leading-relaxed">
                {ENTITY_TYPE_DESCRIPTIONS[entityType]}
              </p>
              <ul className="list-disc list-inside font-libre text-xs text-gray-200 space-y-1">
                <li>
                  Verknüpft mindestens{" "}
                  <span className="font-semibold">zwei Kontexte</span> aus den verfügbaren Informationen.
                </li>
                <li>
                  Liefert einen klaren <span className="font-semibold">Plot-Hook</span>{" "}
                  für zukünftige Szenen.
                </li>
                <li>
                  Legt einen passenden{" "}
                  <span className="font-semibold">Discovery DC (10–25)</span> fest.
                </li>
              </ul>

              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={handleShowContextSelector}
                  disabled={isPending || isLoadingRelatedSecrets}
                  className="inline-flex items-center gap-2 rounded bg-accent-gold px-4 py-2 font-barlow font-bold text-sm uppercase text-black hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingRelatedSecrets ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Lade Kontext...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      ✨ Plot-Geheimnis mit KI weben
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowConspiracyMode(true)}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded border-2 border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Dice6 className="h-4 w-4" />
                  🎲 Zufällige Verschwörung weben
                </button>
              </div>
            </div>
          )}

          {/* Conspiracy Mode */}
          {!hasGenerated && showConspiracyMode && (
            <div className="space-y-4">
              <div>
                <h3 className="font-barlow font-semibold text-lg text-accent-gold mb-2">
                  Verschwörungs-Engine
                </h3>
                <p className="font-libre text-sm text-gray-200 mb-4">
                  Die KI wählt zufällig 2-3 Geheimnisse aus dem gewählten Radius und spinnt daraus eine neue, verknüpfte Intrige.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block font-barlow font-bold text-xs uppercase text-gray-100">
                  Verschwörungs-Radius
                </label>
                <select
                  value={conspiracyRadius}
                  onChange={(e) => setConspiracyRadius(e.target.value as typeof conspiracyRadius)}
                  disabled={isPending}
                  className="w-full rounded border border-hero-border bg-zinc-900/90 px-3 py-2 font-libre text-sm text-gray-100 outline-none focus:border-accent-gold"
                >
                  <option value="LOKAL">LOKAL (Nur der NPC & seine direkten Beziehungen)</option>
                  <option value="FRAKTION">FRAKTION (Geheimnisse innerhalb der aktuellen Organisation)</option>
                  <option value="STADT">STADT / ORT (Geheimnisse von NPCs & Lore am gleichen Standort)</option>
                  <option value="REGION">REGION (Geheimnisse im gesamten geografischen Gebiet)</option>
                  <option value="WELT">WELT (Zufällige Auswahl aus der gesamten Kampagne)</option>
                </select>
              </div>

              {/* Visualisierung: Ausgewählte Geheimnisse */}
              {selectedConspiracySecrets.length > 0 && (
                <div className="space-y-2">
                  <p className="font-barlow font-bold text-xs uppercase text-accent-gold">
                    Ausgewählte Geheimnisse für die Verschwörung:
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedConspiracySecrets.map((secret, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-accent-gold/30 bg-background-card p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-barlow font-bold text-xs uppercase text-accent-gold">
                            {secret.entity_name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-accent-gold/20 text-xs font-barlow font-bold text-accent-gold">
                            #{idx + 1}
                          </span>
                        </div>
                        <h4 className="font-cinzel font-bold text-sm text-gray-100 mb-1">
                          {secret.title || "Unbenanntes Geheimnis"}
                        </h4>
                        <p className="font-libre text-xs text-gray-300 line-clamp-2">
                          {secret.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-accent-gold/20">
                <button
                  onClick={() => {
                    setShowConspiracyMode(false);
                    setSelectedConspiracySecrets([]);
                  }}
                  disabled={isPending}
                  className="rounded border border-hero-border/70 bg-black/40 px-4 py-1.5 font-barlow font-bold text-xs uppercase text-gray-200 hover:bg-black/70 transition-colors disabled:opacity-50"
                >
                  Zurück
                </button>
                <div className="flex items-center gap-2">
                  {isPending && (
                    <p className="text-xs font-libre italic text-accent-gold/80">
                      Webe Verschwörung aus zufälligen Fragmenten…
                    </p>
                  )}
                  <button
                    onClick={handleGenerateConspiracy}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded bg-accent-gold px-4 py-1.5 font-barlow font-bold text-xs uppercase text-black hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Webe Verschwörung...
                      </>
                    ) : (
                      <>
                        <Dice6 className="h-4 w-4" />
                        Verschwörung weben
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Context Selector */}
          {!hasGenerated && showContextSelector && (
            <div className="space-y-4">
              <div>
                <h3 className="font-barlow font-semibold text-lg text-accent-gold mb-2">
                  Kontext-Konfigurator
                </h3>
                <p className="font-libre text-sm text-gray-200 mb-4">
                  Wähle aus, welche bestehenden Geheimnisse aus dem Umfeld einbezogen werden sollen.
                  Priorisiere wichtige Geheimnisse mit dem Stern-Icon.
                </p>
              </div>

              {relatedSecrets.length === 0 ? (
                <div className="text-center py-8 rounded border border-hero-border/20 bg-background-dark">
                  <p className="font-libre text-sm text-gray-400">
                    Keine verwandten Geheimnisse gefunden.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {relatedSecrets.map((secret) => {
                    const isSelected = selectedContextSecrets.has(secret.id);
                    const isPrioritized = prioritizedSecrets.has(secret.id);
                    return (
                      <div
                        key={secret.id}
                        className="relative rounded-lg border-2 p-4 transition-all"
                        style={{
                          backgroundImage: "url('/images/scroll-paper.webp')",
                          backgroundSize: "cover",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                        }}
                      >
                        <div className="absolute inset-0 bg-background-dark rounded-lg pointer-events-none" />
                        <div className="relative z-10 flex items-start gap-3">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSecretSelection(secret.id)}
                            className="mt-1 h-4 w-4 rounded border-hero-border bg-slate-800 text-accent-gold focus:ring-2 focus:ring-accent-gold cursor-pointer"
                          />
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-barlow font-bold text-xs uppercase text-accent-gold">
                                    {secret.entity_name}
                                  </span>
                                  {secret.entity_type === "faction" && (
                                    <span className="px-2 py-0.5 rounded bg-hero-dark/50 border border-hero-border text-xs font-barlow font-bold uppercase text-gray-300">
                                      Fraktion
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-cinzel font-bold text-sm text-gray-100 mb-1">
                                  {secret.title || "Unbenanntes Geheimnis"}
                                </h4>
                              </div>
                              {/* Star Icon for Prioritization */}
                              <button
                                onClick={() => togglePrioritization(secret.id)}
                                disabled={!isSelected}
                                className={`p-1.5 rounded transition-colors ${
                                  isPrioritized
                                    ? "text-accent-gold"
                                    : "text-gray-500 hover:text-accent-gold/70"
                                } ${!isSelected ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                                title={isPrioritized ? "Priorität entfernen" : "Als Ankerpunkt priorisieren"}
                              >
                                <Star
                                  className={`h-5 w-5 ${isPrioritized ? "fill-current" : ""}`}
                                />
                              </button>
                            </div>
                            <p className="font-libre text-xs text-gray-300 leading-relaxed line-clamp-3">
                              {secret.content}
                            </p>
                            {isPrioritized && (
                              <div className="mt-2 px-2 py-1 rounded bg-accent-gold/20 border border-accent-gold/50">
                                <p className="font-barlow font-bold text-xs uppercase text-accent-gold">
                                  ⭐ Ankerpunkt
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-accent-gold/20">
                <button
                  onClick={() => {
                    setShowContextSelector(false);
                    setSelectedContextSecrets(new Set());
                    setPrioritizedSecrets(new Set());
                  }}
                  disabled={isPending}
                  className="rounded border border-hero-border/70 bg-black/40 px-4 py-1.5 font-barlow font-bold text-xs uppercase text-gray-200 hover:bg-black/70 transition-colors disabled:opacity-50"
                >
                  Zurück
                </button>
                <div className="flex items-center gap-2">
                  {isPending && (
                    <p className="text-xs font-libre italic text-accent-gold/80">
                      Analysiere verknüpfte Geheimnisse für maximalen Plot-Kontext…
                    </p>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded bg-accent-gold px-4 py-1.5 font-barlow font-bold text-xs uppercase text-black hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Webe Geheimnis...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generieren mit Kontext
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit / Review step */}
          {hasGenerated && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-100">
                    Titel des Geheimnisses
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded border border-hero-border bg-zinc-900/90 px-3 py-2 font-libre text-sm text-gray-100 outline-none focus:border-accent-gold"
                    placeholder="Kurzer, prägnanter Titel..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-100">
                    Kategorie
                  </label>
                  <input
                    type="text"
                    value={secretType}
                    onChange={(e) => setSecretType(e.target.value)}
                    className="w-full rounded border border-hero-border bg-zinc-900/90 px-3 py-2 font-libre text-sm text-gray-100 outline-none focus:border-accent-gold"
                    placeholder='z.B. "Dilemma", "Verrat", "Wissen"...'
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-100">
                    Discovery DC (10–25)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={25}
                    value={discoveryDc}
                    onChange={(e) =>
                      setDiscoveryDc(
                        Number.isNaN(Number(e.target.value))
                          ? 15
                          : Number(e.target.value)
                      )
                    }
                    className="w-full rounded border border-hero-border bg-zinc-900/90 px-3 py-2 font-libre text-sm text-gray-100 outline-none focus:border-accent-gold"
                  />
                  <p className="font-libre text-[11px] text-gray-300">
                    Wie schwer ist es, dieses Geheimnis durch Nachforschungen oder
                    scharfe Beobachtung zu entdecken?
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-100">
                    Bedeutung für den Plot
                  </label>
                  <textarea
                    value={meaning}
                    onChange={(e) => setMeaning(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-hero-border bg-zinc-900/90 px-3 py-2 font-libre text-sm text-gray-100 outline-none focus:border-accent-gold resize-none"
                    placeholder="Was verändert dieses Geheimnis konkret in deiner Kampagne?"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-barlow font-bold text-xs uppercase text-gray-100">
                  Geheimnis – Volltext
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full rounded border border-hero-border bg-zinc-900/90 px-3 py-2 font-libre text-sm text-gray-100 outline-none focus:border-accent-gold resize-y min-h-[160px]"
                  placeholder="Beschreibe das Geheimnis in 3–8 Sätzen..."
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-accent-gold/40">
                <p className="font-libre text-[11px] text-gray-200">
                  Beim Speichern wird das Geheimnis als{" "}
                  <span className="font-semibold text-accent-gold">
                    KI-generiert
                  </span>{" "}
                  markiert und automatisch in die Chronik eingebettet.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isPending}
                    className="rounded border border-hero-border/70 bg-black/40 px-4 py-1.5 font-barlow font-bold text-xs uppercase text-gray-200 hover:bg-black/70 transition-colors disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded bg-accent-gold px-4 py-1.5 font-barlow font-bold text-xs uppercase text-black hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Einbetten...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        In Chronik einbetten
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
