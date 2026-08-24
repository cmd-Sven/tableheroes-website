/**
 * GM notes, secrets, check results, and player notes sidebar.
 */
"use client";

import {
  AlertCircle,
  BookOpen,
  Edit2,
  Eye,
  HeartPulse,
  Loader2,
  Save,
  Scroll,
  X,
} from "lucide-react";
import type { NPCDetailController } from "./useNPCDetailPage";

export function NPCDetailNotesSidebar({ c }: { c: NPCDetailController }) {
  const {
    npc,
    isGM,
    isPending,
    isEditingGMNotes,
    setIsEditingGMNotes,
    isEditingPlayerNotes,
    setIsEditingPlayerNotes,
    gmNotes,
    setGmNotes,
    playerNotes,
    setPlayerNotes,
    initialCampaignPlayerNote,
    handleSaveGMNotes,
    handleSavePlayerNotes,
  } = c;

  return (
    <>
        {/* Sidebar - Notes */}
        <div className="space-y-6">
          {/* GM Notes */}
          {isGM && (
            <div className="rounded-lg border border-hero-border bg-background-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-barlow font-semibold text-xl text-accent-blood flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  GM-Notizen
                </h2>
                {!isEditingGMNotes ? (
                  <button
                    onClick={() => setIsEditingGMNotes(true)}
                    className="p-1.5 rounded text-gray-400 hover:text-blue-400 hover:bg-hero-dark transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveGMNotes}
                      disabled={isPending}
                      className="p-1.5 rounded text-green-400 hover:bg-green-900/30 transition-colors disabled:opacity-50"
                      title="Speichern"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingGMNotes(false);
                        setGmNotes(npc.gm_notes || "");
                      }}
                      className="p-1.5 rounded text-red-400 hover:bg-red-900/30 transition-colors"
                      title="Abbrechen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {isEditingGMNotes ? (
                <textarea
                  value={gmNotes}
                  onChange={(e) => setGmNotes(e.target.value)}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none focus:border-hero-vibrant resize-none min-h-[150px]"
                  placeholder="GM-Notizen hier eingeben..."
                />
              ) : (
                <p
                  className={`font-libre text-gray-200 leading-relaxed whitespace-pre-wrap ${
                    isPending ? "opacity-50" : ""
                  }`}
                >
                  {npc.gm_notes || "Keine GM-Notizen vorhanden."}
                </p>
              )}
            </div>
          )}

          {/* Spielleiter-Geheimnisse (nur für GM) */}
          {isGM &&
            (npc.is_secret_antagonist ||
              npc.hidden_agenda ||
              npc.true_nature) && (
              <div className="rounded-lg border-2 border-accent-blood/50 bg-slate-900/80 p-6 relative">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-accent-blood/30">
                  <AlertCircle className="h-5 w-5 text-accent-blood" />
                  <h2 className="font-barlow font-bold text-xl uppercase text-accent-blood">
                    🔒 Spielleiter-Geheimnisse
                  </h2>
                </div>

                {/* Secret Antagonist Badge */}
                {npc.is_secret_antagonist && (
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded border-2 border-accent-blood/50 bg-accent-blood/10">
                    <AlertCircle className="h-4 w-4 text-accent-blood" />
                    <span className="font-barlow font-bold text-sm uppercase text-accent-blood">
                      Geheimer Antagonist
                    </span>
                  </div>
                )}

                {/* Hidden Agenda */}
                {npc.hidden_agenda && (
                  <div className="mb-4">
                    <h3 className="font-barlow font-semibold text-sm uppercase text-accent-blood mb-2">
                      Versteckte Agenda
                    </h3>
                    <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {npc.hidden_agenda}
                    </p>
                  </div>
                )}

                {/* True Nature */}
                {npc.true_nature && (
                  <div>
                    <h3 className="font-barlow font-semibold text-sm uppercase text-accent-blood mb-2">
                      Wahre Natur (Interne Persönlichkeit)
                    </h3>
                    <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {npc.true_nature}
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Ergebnisse für Spielerproben (nur für GM) – was Spieler bei Würfen entdecken */}
          {isGM && npc.check_results && npc.check_results.length > 0 && (
            <div className="rounded-lg border-2 border-accent-gold/50 bg-slate-900/80 p-6 relative">
              <div className="flex items-center gap-2 mb-1 pb-3 border-b border-accent-gold/30">
                <Eye className="h-5 w-5 text-accent-gold" />
                <h2 className="font-barlow font-bold text-xl uppercase text-accent-gold">
                  Ergebnisse für Spielerproben
                </h2>
              </div>
              <p className="font-libre text-sm text-gray-400 mb-4">
                Was Spieler mit ihren Charakteren bei Würfen (z. B. Wahrnehmung, Motiv erkennen) über diesen NPC entdecken können – nutze diese Texte je nach Wurfergebnis.
              </p>

              <div className="space-y-6">
                {(() => {
                  // Gruppiere nach Typ
                  const grouped = npc.check_results.reduce((acc, result) => {
                    if (!acc[result.type]) {
                      acc[result.type] = [];
                    }
                    acc[result.type].push(result);
                    return acc;
                  }, {} as Record<string, typeof npc.check_results>);

                  // Sortiere innerhalb jeder Gruppe nach DC
                  Object.keys(grouped).forEach((type) => {
                    grouped[type].sort((a, b) => a.dc - b.dc);
                  });

                  const typeConfig = {
                    Wahrnehmung: {
                      icon: Eye,
                      color: "text-blue-400",
                      bgColor: "bg-blue-900/20",
                      borderColor: "border-blue-700/50",
                    },
                    "Motiv erkennen": {
                      icon: HeartPulse,
                      color: "text-red-400",
                      bgColor: "bg-red-900/20",
                      borderColor: "border-red-700/50",
                    },
                    Wissen: {
                      icon: Scroll,
                      color: "text-yellow-400",
                      bgColor: "bg-yellow-900/20",
                      borderColor: "border-yellow-700/50",
                    },
                  };

                  return Object.entries(grouped).map(([type, results]) => {
                    const config = typeConfig[type as keyof typeof typeConfig];
                    const Icon = config.icon;

                    return (
                      <div key={type} className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-hero-border/30">
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          <h3 className="font-barlow font-semibold text-lg text-accent-blood">
                            {type}
                          </h3>
                          <span className="ml-auto text-xs text-gray-400 font-barlow">
                            {results.length}{" "}
                            {results.length === 1 ? "Ergebnis" : "Ergebnisse"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {results.map((result, idx) => (
                            <div
                              key={idx}
                              className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <Icon className={`h-5 w-5 ${config.color}`} />
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 rounded bg-hero-dark/50 text-accent-gold font-barlow font-bold text-sm border border-accent-gold/50">
                                    DC {result.dc}
                                  </span>
                                  {result.is_critical && (
                                    <span className="px-3 py-1 rounded bg-accent-blood/20 text-accent-blood font-barlow font-bold text-xs border border-accent-blood/50">
                                      Kritisch
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                                {result.result}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Player Notes */}
          <div className="rounded-lg border border-hero-border bg-background-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Spieler-Notizen
              </h2>
              {!isEditingPlayerNotes ? (
                <button
                  onClick={() => setIsEditingPlayerNotes(true)}
                  className="p-1.5 rounded text-gray-400 hover:text-blue-400 hover:bg-hero-dark transition-colors"
                  title="Bearbeiten"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={handleSavePlayerNotes}
                    disabled={isPending}
                    className="p-1.5 rounded text-green-400 hover:bg-green-900/30 transition-colors disabled:opacity-50"
                    title="Speichern"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingPlayerNotes(false);
                      setPlayerNotes(initialCampaignPlayerNote ?? "");
                    }}
                    className="p-1.5 rounded text-red-400 hover:bg-red-900/30 transition-colors"
                    title="Abbrechen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 font-libre mb-2">
              Diese Notizen sind für die Gruppe und den GM sichtbar.
            </p>
            {isEditingPlayerNotes ? (
              <textarea
                value={playerNotes}
                onChange={(e) => setPlayerNotes(e.target.value)}
                className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none focus:border-hero-vibrant resize-none min-h-[150px]"
                placeholder="Spieler-Notizen hier eingeben..."
              />
            ) : (
              <p
                className={`font-libre text-gray-200 leading-relaxed whitespace-pre-wrap ${
                  isPending ? "opacity-50" : ""
                }`}
              >
                {playerNotes || "Keine Spieler-Notizen vorhanden."}
              </p>
            )}
          </div>
        </div>
    </>
  );
}
