"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Edit2, Save, AlertCircle, ScrollText, Stamp, Eye, EyeOff, Loader2 } from "lucide-react";
import { updateSecret } from "@/src/app/dashboard/campaigns/[id]/secrets-actions";

type SecretDetailModalProps = {
  secret: {
    id: string;
    title: string | null;
    content: string;
    meaning: string | null;
    secret_type: string | null;
    discovery_dc: number | null;
    skill_check: string | null;
    is_revealed: boolean;
    is_ai_generated?: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  isGM: boolean;
};

export function SecretDetailModal({
  secret,
  isOpen,
  onClose,
  onUpdated,
  isGM,
}: SecretDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [title, setTitle] = useState(secret.title || "");
  const [content, setContent] = useState(secret.content || "");
  const [meaning, setMeaning] = useState(secret.meaning || "");
  const [secretType, setSecretType] = useState(secret.secret_type || "Wissen");
  const [discoveryDc, setDiscoveryDc] = useState(secret.discovery_dc || 15);

  // Reset form when secret changes
  useEffect(() => {
    if (secret) {
      setTitle(secret.title || "");
      setContent(secret.content || "");
      setMeaning(secret.meaning || "");
      setSecretType(secret.secret_type || "Wissen");
      setDiscoveryDc(secret.discovery_dc || 15);
      setIsEditing(false);
      setError(null);
    }
  }, [secret]);

  const handleSave = () => {
    if (!content.trim()) {
      setError("Der Inhalt darf nicht leer sein.");
      return;
    }

    const dc = Math.max(10, Math.min(25, Math.round(discoveryDc)));

    startTransition(async () => {
      try {
        setError(null);
        await updateSecret(secret.id, {
          title: title.trim() || null,
          content: content.trim(),
          meaning: meaning.trim() || null,
          secret_type: secretType.trim() || "Wissen",
          discovery_dc: dc,
        });

        if (onUpdated) {
          onUpdated();
        }
        setIsEditing(false);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message || "Fehler beim Speichern des Geheimnisses. Bitte versuche es erneut."
        );
      }
    });
  };

  const handleCancel = () => {
    // Reset to original values
    setTitle(secret.title || "");
    setContent(secret.content || "");
    setMeaning(secret.meaning || "");
    setSecretType(secret.secret_type || "Wissen");
    setDiscoveryDc(secret.discovery_dc || 15);
    setIsEditing(false);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={() => {
          if (!isPending && !isEditing) onClose();
        }}
      />

      {/* Modal */}
      <div
        className="relative z-50 w-full max-w-4xl max-h-[90vh] rounded-xl border-2 border-accent-gold/50 bg-background-card shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundImage: "url('/images/scroll-paper.png')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay for readability - KEINE Transparenz */}
        <div className="absolute inset-0 bg-background-dark pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 p-6 border-b border-accent-gold/40">
            <div className="flex items-center gap-3 flex-1">
              <div className="rounded-full bg-hero-dark/80 p-2 border border-accent-gold/60">
                <ScrollText className="h-6 w-6 text-accent-gold" />
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titel des Geheimnisses"
                    className="w-full bg-transparent border-b-2 border-accent-gold/50 font-cinzel font-bold text-2xl text-accent-gold outline-none focus:border-accent-gold"
                  />
                ) : (
                  <h2 className="font-cinzel font-bold text-2xl text-accent-gold">
                    {secret.title || "Unbenanntes Geheimnis"}
                  </h2>
                )}
              </div>
              {!isEditing && secret.secret_type && (
                <div className="px-3 py-1.5 bg-accent-gold/20 border border-accent-gold/50 rounded text-accent-gold text-xs font-barlow font-bold uppercase">
                  {secret.secret_type}
                </div>
              )}
              {isEditing && (
                <select
                  value={secretType}
                  onChange={(e) => setSecretType(e.target.value)}
                  className="px-3 py-1.5 bg-background-card border border-accent-gold/50 rounded text-accent-gold text-xs font-barlow font-bold uppercase outline-none focus:border-accent-gold"
                >
                  <option value="Wissen">Wissen</option>
                  <option value="Dilemma">Dilemma</option>
                  <option value="Verrat">Verrat</option>
                  <option value="Vergangenheit">Vergangenheit</option>
                  <option value="Motivation">Motivation</option>
                  <option value="Beziehung">Beziehung</option>
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isGM && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={isPending}
                        className="p-2 rounded border border-hero-border text-gray-300 hover:bg-hero-dark transition-colors disabled:opacity-50"
                        title="Abbrechen"
                      >
                        <X className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="p-2 rounded bg-accent-gold text-black hover:bg-yellow-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                        title="Speichern"
                      >
                        {isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-5 w-5" />
                            Speichern
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 rounded border border-accent-gold/50 text-accent-gold hover:bg-accent-gold/10 transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                disabled={isPending || isEditing}
                className="p-2 rounded border border-hero-border text-gray-300 hover:bg-hero-dark transition-colors disabled:opacity-50"
                title="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="font-libre text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Main Content */}
            <div className="space-y-4">
              <div>
                <label className="block font-barlow font-semibold text-sm uppercase text-gray-400 mb-2">
                  Inhalt
                </label>
                {isEditing ? (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="w-full bg-background-card border border-accent-gold/30 rounded p-4 font-libre text-gray-200 leading-relaxed outline-none focus:border-accent-gold resize-none"
                    placeholder="Beschreibe das Geheimnis..."
                  />
                ) : (
                  <div className="bg-background-card border border-accent-gold/20 rounded p-4 font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {secret.content}
                  </div>
                )}
              </div>

              {/* Meaning Section - GM Notes */}
              {(isGM || secret.meaning) && (
                <div className="relative border-t border-accent-gold/20 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Stamp className="h-5 w-5 text-accent-gold" />
                    <label className="font-barlow font-semibold text-sm uppercase text-accent-gold italic">
                      Bedeutung für den Plot
                    </label>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={meaning}
                      onChange={(e) => setMeaning(e.target.value)}
                      rows={4}
                      className="w-full bg-background-card border border-accent-gold/30 rounded p-4 font-libre text-gray-200 leading-relaxed italic outline-none focus:border-accent-gold resize-none"
                      placeholder="Was bedeutet dieses Geheimnis für die Handlung?"
                    />
                  ) : (
                    <div className="bg-background-card border border-accent-gold/20 rounded p-4 font-libre text-gray-200 leading-relaxed italic">
                      {secret.meaning || "Keine Notizen vorhanden."}
                    </div>
                  )}
                </div>
              )}

              {/* Mechanics Section */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-accent-gold/20">
                <div>
                  <label className="block font-barlow font-semibold text-sm uppercase text-gray-400 mb-2">
                    Schwierigkeit zum Entdecken
                  </label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="10"
                        max="25"
                        value={discoveryDc}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            setDiscoveryDc(Math.max(10, Math.min(25, val)));
                          }
                        }}
                        className="w-20 bg-background-card border border-accent-gold/30 rounded p-2 font-barlow font-bold text-accent-gold text-lg outline-none focus:border-accent-gold text-center"
                      />
                      <span className="font-libre text-gray-300">(10-25)</span>
                    </div>
                  ) : (
                    <div className="bg-background-card border border-accent-gold/20 rounded p-4">
                      <div className="font-cinzel font-bold text-2xl text-accent-gold">
                        DC {secret.discovery_dc || 15}
                      </div>
                      {secret.skill_check && (
                        <div className="font-libre text-sm text-gray-400 mt-1">
                          {secret.skill_check}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-barlow font-semibold text-sm uppercase text-gray-400 mb-2">
                    Status
                  </label>
                  <div className="bg-background-card border border-accent-gold/20 rounded p-4 flex items-center gap-2">
                    {secret.is_revealed ? (
                      <>
                        <Eye className="h-5 w-5 text-green-400" />
                        <span className="font-libre text-green-400">Öffentlich bekannt</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-5 w-5 text-gray-400" />
                        <span className="font-libre text-gray-400">Verborgen</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Generated Badge */}
              {secret.is_ai_generated && (
                <div className="flex items-center gap-2 text-xs text-accent-gold/70 font-barlow font-bold uppercase">
                  <ScrollText className="h-4 w-4" />
                  KI-generiert
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
