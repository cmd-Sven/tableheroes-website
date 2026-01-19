"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";
import {
  LogOut,
  Cloud,
  MapPin,
  Clock,
  Users,
  BookOpen,
  PenSquare,
  Search,
  X,
  Power,
} from "lucide-react";
import { endSession } from "@/src/app/dashboard/campaigns/[id]/session-actions";

type LiveState = {
  id: string;
  session_id: string;
  weather: string | null;
  current_location: string | null;
  current_time: string | null;
  journal_text: string | null;
  scribe_id: string | null;
  visible_npc_ids: string[] | null;
  background_url?: string | null;
};

type PartyCharacter = {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number | null;
  avatar_url: string | null;
};

type CampaignNpc = {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  is_revealed?: boolean | null;
};

type ActiveQuest = {
  id: string;
  title: string;
  description: string | null;
  rewards: string | null;
  type: string | null;
  quest_giver?: { id: string; name: string | null } | null;
  location?: { id: string; name: string | null } | null;
};

type Props = {
  sessionId: string;
  campaignId: string;
  isGM: boolean;
  userId: string;
  initialLiveState: LiveState | null;
  partyCharacters: PartyCharacter[];
  allCampaignNpcs: CampaignNpc[];
  activeQuests: ActiveQuest[];
};

export function LiveSessionBoard({
  sessionId,
  campaignId,
  isGM,
  userId,
  initialLiveState,
  partyCharacters,
  allCampaignNpcs,
  activeQuests,
}: Props) {
  const router = useRouter();
  const [liveState, setLiveState] = useState<LiveState | null>(initialLiveState);
  const [isUpdating, startTransition] = useTransition();
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);
  const [stageSearch, setStageSearch] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(
    initialLiveState?.background_url || null,
  );
  const [showQuests, setShowQuests] = useState(false);
  const [isEnding, startEndTransition] = useTransition();

  const canEditJournal =
    isGM || (liveState?.scribe_id != null && liveState.scribe_id === userId);

  // ---------------------------------------------------------------------------
  // Realtime Subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel(`session_live_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_live_states",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // We gehen davon aus, dass payload.new den aktuellen Zustand enthält
          if (payload.new) {
          const next = payload.new as LiveState;
          setLiveState(next);
          setBackgroundUrl(next.background_url || null);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // ---------------------------------------------------------------------------
  // Helper: Update Live State (environment / journal)
  // ---------------------------------------------------------------------------
  function updateLiveState(patch: Partial<LiveState>) {
    if (!liveState) return;

    startTransition(async () => {
      try {
        const { error } = await (supabase.from("session_live_states") as any)
          .update(patch)
          .eq("session_id", sessionId);

        if (error) {
          console.error("Update Live State Error:", error);
          alert(error.message);
          return;
        }

        // Optimistisches Update – Realtime wird das ohnehin bestätigen
        setLiveState((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...patch };
          if (Object.prototype.hasOwnProperty.call(patch, "background_url")) {
            setBackgroundUrl(next.background_url || null);
          }
          return next;
        });
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Fehler beim Aktualisieren des Session-Zustands.");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Derived Data: Active NPCs & Party
  // ---------------------------------------------------------------------------
  const activeNpcIds = useMemo(() => {
    return new Set(liveState?.visible_npc_ids || []);
  }, [liveState?.visible_npc_ids]);

  const activeNpcs = useMemo(
    () => allCampaignNpcs.filter((npc) => activeNpcIds.has(npc.id)),
    [allCampaignNpcs, activeNpcIds],
  );

  const filteredNpcsForStageManager = useMemo(() => {
    const term = stageSearch.trim().toLowerCase();
    if (!term) return allCampaignNpcs;
    return allCampaignNpcs.filter((npc) =>
      `${npc.name} ${npc.title || ""}`.toLowerCase().includes(term),
    );
  }, [allCampaignNpcs, stageSearch]);

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <div className="relative min-h-screen bg-background-dark text-white flex flex-col overflow-hidden">
      {/* Atmospheric Background Layer */}
      {backgroundUrl && (
        <div
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center opacity-0 animate-[fadeInBg_0.8s_ease-out_forwards]"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      )}
      {/* Dark overlay for readability */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/60" />
      {/* Top Bar: Exit Button */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hero-dark bg-background-card/80">
        <div className="font-barlow text-sm uppercase text-gray-400">
          Live Session Dashboard
        </div>
        <div className="flex items-center gap-2">
          {/* Quest Journal Toggle */}
          {activeQuests.length > 0 && (
            <button
              type="button"
              onClick={() => setShowQuests((prev) => !prev)}
              className={`hidden sm:inline-flex items-center gap-1 rounded border px-3 py-1.5 font-barlow font-bold uppercase text-[10px] transition-colors ${
                showQuests
                  ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                  : "border-hero-border bg-background-dark text-gray-200 hover:border-accent-gold hover:text-accent-gold"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Quests
            </button>
          )}

          {/* Session beenden (GM Only) */}
          {isGM && (
            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    "Session wirklich beenden? Das Journal wird gespeichert.",
                  )
                ) {
                  return;
                }
                if (isEnding) return;
                startEndTransition(async () => {
                  try {
                    const result = await endSession(sessionId);
                    const targetCampaignId =
                      (result as any)?.campaignId || campaignId;
                    router.push(`/dashboard/campaigns/${targetCampaignId}`);
                  } catch (err: any) {
                    alert(
                      err?.message ||
                        "Fehler beim Beenden der Session. Bitte erneut versuchen.",
                    );
                  }
                });
              }}
              disabled={isEnding}
              className="inline-flex items-center gap-1 rounded border border-red-700 bg-red-900/60 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-red-200 hover:bg-red-800/80 transition-colors disabled:opacity-50"
            >
              <Power className="h-4 w-4" />
              Session beenden
            </button>
          )}

          {/* Exit Button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded border border-red-700 bg-red-900/40 px-3 py-1.5 font-barlow font-bold uppercase text-xs text-red-200 hover:bg-red-800/70 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Session verlassen
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 grid grid-rows-[auto_1fr_auto] gap-4 p-4 md:p-6">
        {/* Top HUD */}
        <div className="rounded-lg border border-hero-dark bg-background-card/80 px-4 py-3 flex flex-wrap items-center gap-4">
          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent-gold" />
            {isGM ? (
              <input
                type="text"
                defaultValue={liveState?.current_location || ""}
                placeholder="Ort (z.B. Taverne zum Goldenen Griffon)"
                onBlur={(e) =>
                  updateLiveState({ current_location: e.target.value || null })
                }
                className="min-w-[200px] rounded bg-slate-900 border border-hero-dark px-2 py-1 text-sm text-white focus:border-hero-vibrant outline-none"
              />
            ) : (
              <span className="font-libre text-sm text-gray-200">
                {liveState?.current_location || "Unbekannter Ort"}
              </span>
            )}
          </div>

          {/* Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-gold" />
            {isGM ? (
              <input
                type="text"
                defaultValue={liveState?.current_time || ""}
                placeholder="Zeit (z.B. Später Abend)"
                onBlur={(e) =>
                  updateLiveState({ current_time: e.target.value || null })
                }
                className="min-w-[140px] rounded bg-slate-900 border border-hero-dark px-2 py-1 text-sm text-white focus:border-hero-vibrant outline-none"
              />
            ) : (
              <span className="font-libre text-sm text-gray-200">
                {liveState?.current_time || "Zeit unbekannt"}
              </span>
            )}
          </div>

          {/* Weather */}
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-accent-gold" />
            {isGM ? (
              <input
                type="text"
                defaultValue={liveState?.weather || ""}
                placeholder="Wetter (z.B. Sturm, Nebel, Sonnig)"
                onBlur={(e) =>
                  updateLiveState({ weather: e.target.value || null })
                }
                className="min-w-[180px] rounded bg-slate-900 border border-hero-dark px-2 py-1 text-sm text-white focus:border-hero-vibrant outline-none"
              />
            ) : (
              <span className="font-libre text-sm text-gray-200">
                {liveState?.weather || "Wetter unbekannt"}
              </span>
            )}
          </div>

          {isUpdating && (
            <span className="ml-auto font-libre text-xs text-gray-500">
              Änderungen werden übertragen...
            </span>
          )}
        </div>

        {/* Center: Stage + Journal */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_minmax(280px,1fr)] gap-4">
          {/* Center Stage (NPCs) */}
          <div className="relative rounded-lg border border-hero-dark bg-background-card/80 p-4 flex flex-col">
            <div className="mb-3 flex items-center justify-between border-b border-hero-dark pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent-gold" />
                <h2 className="font-barlow font-bold text-sm uppercase text-gray-200">
                  Bühne / Aktive NPCs
                </h2>
              </div>
              {isGM && (
                <button
                  type="button"
                  onClick={() => setIsStageManagerOpen(true)}
                  className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-background-dark px-3 py-1 font-barlow font-bold uppercase text-[10px] text-gray-200 hover:border-hero-vibrant hover:text-white transition-colors"
                >
                  Stage verwalten
                </button>
              )}
            </div>

            {activeNpcs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <p className="max-w-md font-libre text-sm text-gray-400">
                  Aktuell steht niemand auf der Bühne. Der Spielleiter kann im
                  Stage Manager NPCs hinzufügen.
                </p>
              </div>
            ) : (
              <div
                className={`flex-1 ${
                  activeNpcs.length === 1
                    ? "flex items-center justify-center"
                    : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                }`}
              >
                {activeNpcs.map((npc) => (
                  <div
                    key={npc.id}
                    className={`rounded-lg border border-hero-border/40 bg-background-dark/80 p-4 shadow-lg flex flex-col ${
                      activeNpcs.length === 1 ? "max-w-lg w-full" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-14 w-14 rounded-full bg-hero-dark border border-hero-border overflow-hidden flex items-center justify-center">
                        {npc.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={npc.image_url}
                            alt={npc.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-cinzel text-lg text-accent-gold">
                            {npc.name[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-cinzel font-bold text-lg text-white">
                          {npc.name}
                        </p>
                        {npc.title && (
                          <p className="font-libre text-xs text-accent-gold">
                            {npc.title}
                          </p>
                        )}
                      </div>
                    </div>
                    {npc.description && (
                      <p className="font-libre text-sm text-gray-300 leading-relaxed">
                        {npc.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Journal / Scribe */}
          <div className="rounded-lg border border-hero-dark bg-background-card/80 p-4 flex flex-col">
            <div className="mb-3 flex items-center justify-between border-b border-hero-dark pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent-gold" />
                <h2 className="font-barlow font-bold text-sm uppercase text-gray-200">
                  Journal der Session
                </h2>
              </div>
              {canEditJournal ? (
                <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 border border-hero-border/50 bg-hero-dark/60 font-barlow text-[10px] uppercase text-hero-vibrant">
                  <PenSquare className="h-3 w-3" />
                  Schreiber
                </span>
              ) : (
                <span className="font-libre text-xs text-gray-500">
                  Nur GM / Schreiber kann bearbeiten
                </span>
              )}
            </div>

            {canEditJournal ? (
              <textarea
                defaultValue={liveState?.journal_text || ""}
                onBlur={(e) =>
                  updateLiveState({ journal_text: e.target.value || null })
                }
                placeholder="Notizen zur aktuellen Szene, wichtige Ereignisse, Zitate..."
                className="flex-1 rounded bg-slate-900 border border-hero-dark p-3 text-sm text-white font-libre leading-relaxed focus:border-hero-vibrant outline-none resize-none"
              />
            ) : (
              <div className="flex-1 rounded bg-slate-900/60 border border-hero-dark p-3 text-sm text-gray-200 font-libre leading-relaxed overflow-y-auto">
                {liveState?.journal_text ? (
                  <pre className="whitespace-pre-wrap font-libre text-sm">
                    {liveState.journal_text}
                  </pre>
                ) : (
                  <p className="text-gray-500">
                    Noch keine Notizen vorhanden. Warte auf den Schreiber...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Party Tray */}
        <div className="rounded-lg border border-hero-dark bg-background-card/80 px-4 py-3 overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-accent-gold" />
            <h2 className="font-barlow font-bold text-sm uppercase text-gray-200">
              Party Tray (Charaktere)
            </h2>
          </div>
          {partyCharacters.length === 0 ? (
            <p className="font-libre text-xs text-gray-400">
              Noch keine aktiven Charaktere in dieser Session verknüpft.
            </p>
          ) : (
            <div className="flex gap-3">
              {partyCharacters.map((pc) => (
                <div
                  key={pc.id}
                  className="min-w-[160px] rounded border border-hero-border/40 bg-background-dark/80 px-3 py-2 flex items-center gap-3 shadow-md"
                >
                  <div className="h-10 w-10 rounded-full bg-hero-dark border border-hero-border overflow-hidden flex items-center justify-center">
                    {pc.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pc.avatar_url}
                        alt={pc.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-barlow text-sm text-accent-gold">
                        {pc.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-barlow font-bold text-xs text-white truncate">
                      {pc.name}
                    </p>
                    <p className="font-libre text-[10px] text-gray-400 truncate">
                      Lvl {pc.level || 1} · {pc.class || "Unbekannt"}
                    </p>
                    {pc.race && (
                      <p className="font-libre text-[10px] text-gray-500 truncate">
                        {pc.race}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stage Manager Drawer (GM Only) */}
      {isGM && isStageManagerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background-card border-l border-hero-dark shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hero-dark">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-gold" />
              <h2 className="font-barlow font-bold text-sm uppercase text-gray-200">
                Stage Manager
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsStageManagerOpen(false)}
              className="rounded p-1 text-gray-400 hover:text-white hover:bg-background-dark transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-hero-dark flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={stageSearch}
              onChange={(e) => setStageSearch(e.target.value)}
              placeholder="NPCs suchen..."
              className="flex-1 rounded bg-slate-900 border border-hero-dark px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
            />
          </div>

          {/* NPC List with Toggles */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {filteredNpcsForStageManager.length === 0 ? (
              <p className="font-libre text-xs text-gray-500">
                Keine NPCs gefunden.
              </p>
            ) : (
              filteredNpcsForStageManager.map((npc) => {
                const isOnStage = activeNpcIds.has(npc.id);
                return (
                  <label
                    key={npc.id}
                    className="flex items-center gap-3 rounded border border-hero-border/30 bg-background-dark px-3 py-2 cursor-pointer hover:border-hero-vibrant transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isOnStage}
                      onChange={(e) => {
                        const currentIds = new Set(
                          liveState?.visible_npc_ids || [],
                        );
                        if (e.target.checked) {
                          currentIds.add(npc.id);
                        } else {
                          currentIds.delete(npc.id);
                        }
                        updateLiveState({
                          visible_npc_ids: Array.from(currentIds),
                        });
                      }}
                      className="h-4 w-4 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-barlow font-bold text-xs text-white truncate">
                        {npc.name}
                      </p>
                      {npc.title && (
                        <p className="font-libre text-[10px] text-gray-400 truncate">
                          {npc.title}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Background Image Settings */}
          <div className="border-t border-hero-dark px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-accent-gold" />
              <p className="font-barlow font-bold text-xs uppercase text-gray-300">
                Hintergrund Bild-URL
              </p>
            </div>
            <input
              type="url"
              defaultValue={liveState?.background_url || ""}
              placeholder="https://... (Atmosphärisches Hintergrundbild)"
              onBlur={(e) =>
                updateLiveState({
                  background_url: e.target.value.trim() || null,
                })
              }
              className="w-full rounded bg-slate-900 border border-hero-dark px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
            />
            <p className="font-libre text-[11px] text-gray-500">
              Tipp: Nutze stimmungsvolle Bilder (z.B. Taverne, Wald, Dungeon). Das
              Bild wird als atmosphärischer Hintergrund angezeigt.
            </p>
          </div>
        </div>
      )}

      {/* Quest Journal Overlay (Player-Toggleable) */}
      {showQuests && activeQuests.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-40 flex justify-end">
          <div className="pointer-events-auto mt-[64px] mb-4 mr-4 w-full max-w-md rounded-xl bg-black/80 backdrop-blur-md border border-hero-dark shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-hero-dark">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent-gold" />
                <h2 className="font-barlow font-bold text-sm uppercase text-gray-200">
                  Aktive Aufgaben
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQuests(false)}
                className="rounded p-1 text-gray-400 hover:text-white hover:bg-background-dark transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quest List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {activeQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="rounded border border-hero-border/40 bg-background-dark/80 p-3"
                >
                  <h3 className="font-cinzel font-bold text-sm text-accent-gold mb-1">
                    {quest.title}
                  </h3>
                  <div className="space-y-1 mb-2">
                    {quest.quest_giver?.name && (
                      <p className="font-libre text-[11px] text-gray-300">
                        <span className="font-barlow font-bold uppercase text-[10px] text-gray-400">
                          Auftraggeber:
                        </span>{" "}
                        {quest.quest_giver.name}
                      </p>
                    )}
                    {quest.location?.name && (
                      <p className="font-libre text-[11px] text-gray-300">
                        <span className="font-barlow font-bold uppercase text-[10px] text-gray-400">
                          Ort:
                        </span>{" "}
                        {quest.location.name}
                      </p>
                    )}
                    {quest.type && (
                      <p className="font-libre text-[11px] text-gray-400">
                        <span className="font-barlow font-bold uppercase text-[10px] text-gray-500">
                          Typ:
                        </span>{" "}
                        {quest.type}
                      </p>
                    )}
                  </div>
                  {quest.description && (
                    <div className="max-h-24 overflow-y-auto mb-2">
                      <p className="font-libre text-xs text-gray-200 whitespace-pre-wrap">
                        {quest.description}
                      </p>
                    </div>
                  )}
                  {quest.rewards && (
                    <div className="rounded border border-hero-border/40 bg-hero-dark/40 px-2 py-1">
                      <p className="font-barlow font-bold text-[10px] uppercase text-accent-gold mb-0.5">
                        Belohnung
                      </p>
                      <p className="font-libre text-[11px] text-gray-200">
                        {quest.rewards}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


