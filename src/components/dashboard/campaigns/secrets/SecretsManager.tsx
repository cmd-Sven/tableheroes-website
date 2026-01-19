"use client";

import { useState, useTransition, useEffect } from "react";
import { Eye, EyeOff, Users, Trash2, Plus, Lock, Loader2 } from "lucide-react";
import {
  getSecrets,
  createSecret,
  deleteSecret,
  toggleSecretGlobal,
  toggleSecretForCharacter,
  getCampaignCharacters,
} from "@/src/app/dashboard/campaigns/[id]/secrets-actions";

type Secret = {
  id: string;
  title: string | null;
  content: string;
  skill_check: string | null;
  is_revealed: boolean;
  character_ids: string[];
  created_at?: string;
  updated_at?: string;
};

type Character = {
  id: string;
  name: string;
  user_id: string;
};

type Props = {
  entityId: string;
  entityType: string;
  campaignId: string;
  isGM: boolean;
};

export function SecretsManager({ entityId, entityType, campaignId, isGM }: Props) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [showNewSecretForm, setShowNewSecretForm] = useState(false);
  const [newSecretTitle, setNewSecretTitle] = useState("");
  const [newSecretContent, setNewSecretContent] = useState("");
  const [newSecretSkillCheck, setNewSecretSkillCheck] = useState("");
  const [openShareMenu, setOpenShareMenu] = useState<string | null>(null);

  // Load secrets and characters on mount
  useEffect(() => {
    loadData();
  }, [entityId, entityType]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [secretsData, charactersData] = await Promise.all([
        getSecrets(entityId, entityType),
        isGM ? getCampaignCharacters(campaignId) : Promise.resolve([]),
      ]);
      setSecrets(secretsData as Secret[]);
      setCharacters(charactersData as Character[]);
    } catch (error: any) {
      console.error("Error loading secrets:", error);
      alert(error.message || "Fehler beim Laden der Secrets.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSecret = () => {
    if (!newSecretContent.trim()) {
      alert("Bitte gib einen Inhalt für das Secret ein.");
      return;
    }

    startTransition(async () => {
      try {
        await createSecret(
          campaignId,
          entityId,
          entityType,
          newSecretContent,
          newSecretTitle || undefined,
          newSecretSkillCheck || undefined
        );
        setNewSecretTitle("");
        setNewSecretContent("");
        setNewSecretSkillCheck("");
        setShowNewSecretForm(false);
        await loadData();
      } catch (error: any) {
        alert(error.message || "Fehler beim Erstellen des Secrets.");
      }
    });
  };

  const handleDeleteSecret = (secretId: string) => {
    if (!confirm("Möchtest du dieses Secret wirklich löschen?")) return;

    startTransition(async () => {
      try {
        await deleteSecret(secretId);
        await loadData();
      } catch (error: any) {
        alert(error.message || "Fehler beim Löschen des Secrets.");
      }
    });
  };

  const handleToggleGlobal = (secretId: string, currentState: boolean) => {
    startTransition(async () => {
      try {
        await toggleSecretGlobal(secretId, !currentState);
        await loadData();
      } catch (error: any) {
        alert(error.message || "Fehler beim Ändern des Global-Status.");
      }
    });
  };

  const handleToggleCharacter = (secretId: string, characterId: string, currentState: boolean) => {
    startTransition(async () => {
      try {
        await toggleSecretForCharacter(secretId, characterId, !currentState);
        await loadData();
      } catch (error: any) {
        alert(error.message || "Fehler beim Ändern des Charakter-Zugriffs.");
      }
    });
  };

  // Filter secrets for players (RLS should handle this, but we filter client-side too)
  const visibleSecrets = isGM
    ? secrets
    : secrets.filter((secret) => secret.is_revealed || secret.character_ids.length > 0);

  // Helper function to check if a secret is "new" (created within last 24 hours)
  const isSecretNew = (secret: Secret) => {
    if (!secret.created_at) return false;
    const createdAt = new Date(secret.created_at);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation < 24;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent-gold" />
      </div>
    );
  }

  // For players: Show nothing if no secrets
  if (!isGM && visibleSecrets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2">
          Geheimnisse & Wissen
        </h2>
        {isGM && (
          <button
            onClick={() => setShowNewSecretForm(!showNewSecretForm)}
            className="flex items-center gap-2 rounded border border-hero-vibrant/50 bg-hero-vibrant/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neues Secret
          </button>
        )}
      </div>

      {/* New Secret Form (GM Only) */}
      {isGM && showNewSecretForm && (
        <div className="rounded-lg border border-hero-border bg-background-card p-4">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                Titel (Optional)
              </label>
              <input
                type="text"
                value={newSecretTitle}
                onChange={(e) => setNewSecretTitle(e.target.value)}
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none transition-all focus:border-accent-gold"
                placeholder="z.B. Versteckte Identität"
              />
            </div>
            <div>
              <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                Probencheck auf (Optional)
              </label>
              <input
                type="text"
                value={newSecretSkillCheck}
                onChange={(e) => setNewSecretSkillCheck(e.target.value)}
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none transition-all focus:border-accent-gold"
                placeholder="z.B. Wahrnehmung (DC 15) oder Geschichte"
              />
            </div>
            <div>
              <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
                Inhalt *
              </label>
              <textarea
                value={newSecretContent}
                onChange={(e) => setNewSecretContent(e.target.value)}
                rows={4}
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
                placeholder="Beschreibe das Geheimnis..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewSecretForm(false);
                  setNewSecretTitle("");
                  setNewSecretContent("");
                  setNewSecretSkillCheck("");
                }}
                className="rounded border border-hero-border px-4 py-2 font-barlow font-bold text-xs uppercase text-gray-300 transition-colors hover:bg-hero-dark"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateSecret}
                disabled={isPending}
                className="rounded bg-hero-gold px-4 py-2 font-barlow font-bold text-xs uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50"
              >
                {isPending ? "Erstelle..." : "Hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secrets List */}
      {visibleSecrets.length === 0 ? (
        <div className="text-center py-8 rounded border border-hero-border/20 bg-background-dark">
          <Lock className="h-10 w-10 text-gray-600 mx-auto mb-2" />
          <p className="font-libre text-sm text-gray-400">
            {isGM ? "Noch keine Secrets vorhanden." : "Kein spezielles Wissen verfügbar."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleSecrets.map((secret) => {
            const isPrivate = !secret.is_revealed && secret.character_ids.length > 0;
            const isGlobal = secret.is_revealed;

            return (
              <div
                key={secret.id}
                className="group"
                style={{ perspective: "1000px" }}
              >
                {/* 3D Flip Card Container */}
                <div className="relative w-full h-0 pb-[140%] flip-card-container">
                  {/* Front Side - Title Only */}
                  <div className={`absolute inset-0 rounded-lg border-2 p-4 bg-white flip-card-front flex flex-col items-center justify-center ${
                    isPrivate
                      ? "border-purple-500/50"
                      : isGlobal
                      ? "border-hero-border"
                      : "border-hero-border"
                  }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {secret.title ? (
                        <h3 className="font-cinzel font-bold text-xl text-gray-900 text-center">
                          {secret.title}
                        </h3>
                      ) : (
                        <h3 className="font-cinzel font-bold text-lg text-gray-600 text-center">
                          Geheimnis
                        </h3>
                      )}
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        {isSecretNew(secret) && (
                          <span className="px-2 py-0.5 rounded bg-green-500 text-white text-xs font-barlow font-bold uppercase animate-pulse">
                            [NEU]
                          </span>
                        )}
                        {secret.skill_check && (
                          <div className="px-3 py-1 bg-accent-gold/20 border border-accent-gold/50 rounded text-gray-700 text-xs font-barlow font-bold uppercase">
                            {secret.skill_check}
                          </div>
                        )}
                      </div>
                    </div>
                    {isPrivate && (
                      <div className="flex items-center gap-1 text-purple-600 text-xs font-barlow font-bold uppercase mt-2">
                        <Lock className="h-3 w-3" />
                        Exklusiv
                      </div>
                    )}
                    {isGlobal && (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-barlow font-bold uppercase mt-2">
                        <Eye className="h-3 w-3" />
                        Öffentlich
                      </div>
                    )}
                  </div>

                  {/* Back Side - Description */}
                  <div 
                    className={`absolute inset-0 rounded-lg border-2 p-4 flip-card-back flex flex-col ${
                      isPrivate
                        ? "border-purple-500/50"
                        : isGlobal
                        ? "border-hero-border"
                        : "border-hero-border"
                    }`}
                    style={{
                      backgroundImage: "url('/images/grunge-paper-background.jpg')",
                      backgroundSize: "cover",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  >
                    {/* Subtle overlay for text readability */}
                    <div className="absolute inset-0 bg-white/85 rounded-lg pointer-events-none" />
                    <div className="relative z-10 flex flex-col flex-1">
                    {/* GM Toolbar on Back */}
                    {isGM && (
                      <div className="flex items-center justify-end gap-1 mb-2">
                        {/* Global Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleGlobal(secret.id, secret.is_revealed);
                          }}
                          disabled={isPending}
                          className={`p-1.5 rounded transition-colors ${
                            secret.is_revealed
                              ? "text-green-600 hover:text-green-700 hover:bg-green-100"
                              : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                          } disabled:opacity-50`}
                          title={secret.is_revealed ? "Öffentlich bekannt" : "Verborgen"}
                        >
                          {secret.is_revealed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>

                        {/* Share Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenShareMenu(openShareMenu === secret.id ? null : secret.id);
                            }}
                            disabled={isPending}
                            className="p-1.5 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                            title="Für Charaktere freigeben"
                          >
                            <Users className="h-3.5 w-3.5" />
                          </button>

                          {/* Share Dropdown */}
                          {openShareMenu === secret.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenShareMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-lg border border-hero-border bg-background-card shadow-xl p-2">
                                <div className="font-barlow font-bold text-xs uppercase text-gray-400 mb-2 px-2">
                                  Für Charaktere freigeben:
                                </div>
                                {characters.length === 0 ? (
                                  <p className="text-xs text-gray-500 px-2 py-1">
                                    Keine Charaktere verfügbar
                                  </p>
                                ) : (
                                  <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {characters.map((char) => {
                                      const hasAccess = secret.character_ids.includes(char.id);
                                      return (
                                        <label
                                          key={char.id}
                                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-hero-dark cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={hasAccess}
                                            onChange={() =>
                                              handleToggleCharacter(secret.id, char.id, hasAccess)
                                            }
                                            disabled={isPending}
                                            className="h-4 w-4 rounded border-hero-dark bg-slate-800 text-hero-vibrant focus:ring-2 focus:ring-hero-vibrant cursor-pointer"
                                          />
                                          <span className="font-libre text-sm text-gray-300">{char.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSecret(secret.id);
                          }}
                          disabled={isPending}
                          className="p-1.5 rounded text-red-600 hover:text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                          title="Löschen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Skill Check Badge */}
                    {secret.skill_check && (
                      <div className="mb-3 px-3 py-1.5 bg-accent-gold/20 border border-accent-gold/50 rounded text-gray-700 text-xs font-barlow font-bold uppercase inline-block">
                        Probencheck: {secret.skill_check}
                      </div>
                    )}

                    {/* Secret Content */}
                      <div className="font-libre text-gray-900 leading-relaxed whitespace-pre-wrap text-sm flex-1 overflow-y-auto">
                        {secret.content}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


