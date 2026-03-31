"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";
import {
  LogOut,
  MapPin,
  Clock,
  Users,
  BookOpen,
  PenSquare,
  Search,
  X,
  Power,
  Flag,
  ScrollText,
  ExternalLink,
  PlusCircle,
  LayoutGrid,
} from "lucide-react";
import {
  endSession,
  ensureSessionPrepLiveState,
} from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { StageDeckHand } from "./StageDeckHand";
import {
  SessionWeatherControls,
  SessionWeatherPlayerHint,
} from "./SessionWeather";

type LiveState = {
  id: string;
  session_id: string;
  weather: string | null;
  weather_preset?: string | null;
  weather_intensity?: number | null;
  weather_temperature?: string | null;
  current_location: string | null;
  current_location_lore_id?: string | null;
  current_time: string | null;
  journal_text: string | null;
  scribe_id: string | null;
  visible_npc_ids: string[] | null;
  visible_faction_ids?: string[] | null;
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

type CampaignFaction = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
  description: string | null;
  is_revealed?: boolean;
};

type StagePortraitModal = {
  name: string;
  subtitle: string | null;
  imageUrl: string;
};

type LoreLocationOption = {
  id: string;
  name: string;
  type: string | null;
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
  sessionStatus: string;
  isGM: boolean;
  userId: string;
  initialLiveState: LiveState | null;
  partyCharacters: PartyCharacter[];
  allCampaignNpcs: CampaignNpc[];
  allCampaignFactions: CampaignFaction[];
  /** null = alle NPCs im Stage Manager */
  stageDeckNpcIds: string[] | null;
  /** null = alle Fraktionen im Stage Manager */
  stageDeckFactionIds: string[] | null;
  activeQuests: ActiveQuest[];
  /** Nur GM: Orte aus Lore (isLocationType) für Dropdown */
  loreLocationOptions?: LoreLocationOption[];
  /** Spieler dürfen Lore-Link nur sehen, wenn Eintrag für sie revealed ist */
  sessionLocationLoreReadable?: boolean;
};

export function LiveSessionBoard({
  sessionId,
  campaignId,
  sessionStatus,
  isGM,
  userId,
  initialLiveState,
  partyCharacters,
  allCampaignNpcs,
  allCampaignFactions,
  stageDeckNpcIds,
  stageDeckFactionIds,
  activeQuests,
  loreLocationOptions = [],
  sessionLocationLoreReadable = false,
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
  const [stageFactionSearch, setStageFactionSearch] = useState("");
  const [stageDropHighlight, setStageDropHighlight] = useState(false);
  const [stagePortrait, setStagePortrait] = useState<StagePortraitModal | null>(
    null,
  );
  const [locationDraft, setLocationDraft] = useState(
    () => initialLiveState?.current_location ?? "",
  );

  const isPrepMode = sessionStatus === "Scheduled";

  useEffect(() => {
    setBackgroundUrl(initialLiveState?.background_url || null);
  }, [initialLiveState?.background_url]);

  useEffect(() => {
    setLocationDraft(liveState?.current_location ?? "");
  }, [liveState?.current_location]);

  useEffect(() => {
    if (!stagePortrait) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setStagePortrait(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stagePortrait]);

  const canEditJournal =
    isGM || (liveState?.scribe_id != null && liveState.scribe_id === userId);

  // Fallback: Live-State-Zeile nachziehen (Scheduled + Live; z. B. RLS/SSR ohne Zeile)
  useEffect(() => {
    if (!isGM || liveState) return;
    let cancelled = false;
    (async () => {
      const row = await ensureSessionPrepLiveState(sessionId);
      if (!cancelled && row) {
        setLiveState(row as LiveState);
        setBackgroundUrl((row as LiveState).background_url || null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGM, sessionId, liveState]);

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
  /** `baseOverride`: z. B. direkt nach ensureSessionPrepLiveState, wenn React liveState noch null hat */
  function updateLiveState(patch: Partial<LiveState>, baseOverride?: LiveState) {
    const base = baseOverride ?? liveState;
    if (!base) return;

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

        setLiveState((prev) => {
          const mergeFrom = prev ?? base;
          const next = { ...mergeFrom, ...patch };
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
    return new Set((liveState?.visible_npc_ids || []).map(String));
  }, [liveState?.visible_npc_ids]);

  const activeNpcs = useMemo(
    () => allCampaignNpcs.filter((npc) => activeNpcIds.has(String(npc.id))),
    [allCampaignNpcs, activeNpcIds],
  );

  const npcStagePool = useMemo(() => {
    if (stageDeckNpcIds == null) {
      return allCampaignNpcs.map((n) => ({ ...n, id: String(n.id) }));
    }
    const deck = stageDeckNpcIds.map((id) => String(id)).filter(Boolean);
    if (deck.length === 0) {
      return allCampaignNpcs.map((n) => ({ ...n, id: String(n.id) }));
    }
    const allowed = new Set(deck);
    return allCampaignNpcs.filter((n) => allowed.has(String(n.id)));
  }, [allCampaignNpcs, stageDeckNpcIds]);

  const factionStagePool = useMemo(() => {
    if (stageDeckFactionIds == null) {
      return allCampaignFactions.map((f) => ({ ...f, id: String(f.id) }));
    }
    const deck = stageDeckFactionIds.map((id) => String(id)).filter(Boolean);
    if (deck.length === 0) {
      return allCampaignFactions.map((f) => ({ ...f, id: String(f.id) }));
    }
    const allowed = new Set(deck);
    return allCampaignFactions.filter((f) => allowed.has(String(f.id)));
  }, [allCampaignFactions, stageDeckFactionIds]);

  const activeFactionIds = useMemo(() => {
    return new Set((liveState?.visible_faction_ids || []).map(String));
  }, [liveState?.visible_faction_ids]);

  const activeFactions = useMemo(
    () => allCampaignFactions.filter((f) => activeFactionIds.has(String(f.id))),
    [allCampaignFactions, activeFactionIds],
  );

  const filteredNpcsForStageManager = useMemo(() => {
    const term = stageSearch.trim().toLowerCase();
    if (!term) return npcStagePool;
    return npcStagePool.filter((npc) =>
      `${npc.name} ${npc.title || ""}`.toLowerCase().includes(term),
    );
  }, [npcStagePool, stageSearch]);

  const filteredFactionsForStageManager = useMemo(() => {
    const term = stageFactionSearch.trim().toLowerCase();
    if (!term) return factionStagePool;
    return factionStagePool.filter((f) =>
      `${f.name} ${f.type || ""}`.toLowerCase().includes(term),
    );
  }, [factionStagePool, stageFactionSearch]);

  const inHandNpcs = useMemo(
    () => npcStagePool.filter((n) => !activeNpcIds.has(String(n.id))),
    [npcStagePool, activeNpcIds],
  );

  const inHandFactions = useMemo(
    () => factionStagePool.filter((f) => !activeFactionIds.has(String(f.id))),
    [factionStagePool, activeFactionIds],
  );

  const stagePrepHref = `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/stage-prep`;

  function placeOnStage(kind: "npc" | "faction", id: string) {
    void (async () => {
      let base: LiveState | null = liveState;
      if (!base && isGM) {
        try {
          const row = await ensureSessionPrepLiveState(sessionId);
          if (row) {
            base = row as LiveState;
            setLiveState(base);
            setBackgroundUrl(base.background_url || null);
          }
        } catch (e) {
          console.error("[placeOnStage] ensureSessionPrepLiveState", e);
        }
      }
      if (!base) {
        alert("Session-Zustand wird noch geladen – bitte kurz warten.");
        return;
      }
      const sid = String(id);
      if (kind === "npc") {
        const currentIds = new Set((base.visible_npc_ids || []).map(String));
        if (currentIds.has(sid)) return;
        currentIds.add(sid);
        updateLiveState({ visible_npc_ids: Array.from(currentIds) }, base);
      } else {
        const currentIds = new Set(
          (base.visible_faction_ids || []).map(String),
        );
        if (currentIds.has(sid)) return;
        currentIds.add(sid);
        updateLiveState({ visible_faction_ids: Array.from(currentIds) }, base);
      }
    })();
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <div className="relative min-h-screen bg-background-dark text-white flex flex-col overflow-hidden">
      {/* Atmospheric Background Layer */}
      {backgroundUrl && (
        <div
          className="pointer-events-none absolute inset-0 -z-20 animate-fadeInBg bg-cover bg-center opacity-0"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      )}
      {/* Dark overlay for readability */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/60" />
      {/* Top Bar: Exit Button */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hero-dark bg-background-card/80">
        <div className="flex flex-col gap-1">
          <div className="font-barlow text-sm uppercase text-gray-400">
            {isPrepMode ? "Session – Vorbereitung" : "Live Session Dashboard"}
          </div>
          {isPrepMode && (
            <p className="font-libre text-xs text-accent-gold/90 max-w-xl">
              Du gestaltest und testest den Tisch vor dem Start. Spieler sehen diese Ansicht erst,
              wenn die Session live geht – unabhängig von Zu- oder Absagen.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <a
            href={`/dashboard/campaigns/${campaignId}?tab=lore`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded border border-hero-border bg-background-dark px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
          >
            <ScrollText className="h-4 w-4" />
            Lore
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
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

          {/* Session beenden (GM Only, nicht in Vorbereitung) */}
          {isGM && !isPrepMode && (
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
            type="button"
            onClick={() =>
              router.push(
                isPrepMode
                  ? `/dashboard/campaigns/${campaignId}?tab=sessions`
                  : "/dashboard",
              )
            }
            className="inline-flex items-center gap-2 rounded border border-red-700 bg-red-900/40 px-3 py-1.5 font-barlow font-bold uppercase text-xs text-red-200 hover:bg-red-800/70 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {isPrepMode ? "Zur Kampagne" : "Session verlassen"}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 grid grid-rows-[auto_1fr_auto] gap-4 p-4 md:p-6">
        {/* Top HUD */}
        <div className="rounded-lg border border-hero-dark bg-background-card/80 px-4 py-3 flex flex-wrap items-center gap-4">
          {/* Location + Lore-Verknüpfung */}
          <div className="flex min-w-0 max-w-full flex-[1_1_260px] flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
            <MapPin className="mt-1 h-4 w-4 shrink-0 text-accent-gold" />
            {isGM ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[200px] flex-1 flex-col gap-1">
                    <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                      Ort aus Lore
                    </span>
                    <select
                      value={liveState?.current_location_lore_id || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          updateLiveState({
                            current_location_lore_id: null,
                          });
                          return;
                        }
                        const opt = loreLocationOptions.find((o) => o.id === v);
                        updateLiveState({
                          current_location_lore_id: v,
                          current_location: opt
                            ? opt.name
                            : liveState?.current_location ?? null,
                        });
                      }}
                      className="w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-sm text-white focus:border-hero-vibrant outline-none"
                    >
                      <option value="">— Kein Lore-Ort —</option>
                      {loreLocationOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                          {o.type ? ` (${o.type})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-[180px] flex-1 flex-col gap-1">
                    <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                      Anzeigename
                    </span>
                    <input
                      type="text"
                      value={locationDraft}
                      onChange={(e) => setLocationDraft(e.target.value)}
                      onBlur={() =>
                        updateLiveState({
                          current_location: locationDraft.trim() || null,
                        })
                      }
                      placeholder="z. B. Hinterraum der Taverne"
                      className="w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                    />
                  </label>
                </div>
                {liveState?.current_location_lore_id ? (
                  <a
                    href={`/dashboard/campaigns/${campaignId}/lore/${liveState.current_location_lore_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-accent-gold transition-colors"
                  >
                    <ScrollText className="h-3.5 w-3.5" />
                    Lore-Eintrag öffnen
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="font-libre text-sm text-gray-200 break-words">
                  {liveState?.current_location || "Unbekannter Ort"}
                </span>
                {sessionLocationLoreReadable &&
                liveState?.current_location_lore_id ? (
                  <a
                    href={`/dashboard/campaigns/${campaignId}/lore/${liveState.current_location_lore_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 rounded border border-hero-border/50 bg-background-dark/80 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:border-accent-gold hover:text-accent-gold transition-colors"
                  >
                    <ScrollText className="h-3.5 w-3.5" />
                    Ort in der Lore lesen
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </a>
                ) : null}
              </div>
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

          <SessionWeatherControls
            liveState={liveState}
            updateLiveState={updateLiveState}
            isGM={isGM}
          />

          {isUpdating && (
            <span className="ml-auto font-libre text-xs text-gray-500">
              Änderungen werden übertragen...
            </span>
          )}
        </div>

        <SessionWeatherPlayerHint liveState={liveState} />

        {/* Center: Stage + Journal */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_minmax(280px,1fr)] gap-4">
          {/* Center Stage (NPCs) */}
          <div className="relative rounded-lg border border-hero-dark bg-background-card/80 p-4 flex flex-col">
            <div className="mb-3 flex items-center justify-between border-b border-hero-dark pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent-gold" />
                <h2 className="font-barlow font-bold text-sm uppercase text-gray-200">
                  Bühne / Aktive Karten
                </h2>
              </div>
              {isGM && (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={stagePrepHref}
                    className="inline-flex items-center gap-1 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1 font-barlow font-bold uppercase text-[10px] text-accent-gold hover:bg-accent-gold/20 transition-colors"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Bühne vorbereiten
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsStageManagerOpen(true)}
                    className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-background-dark px-3 py-1 font-barlow font-bold uppercase text-[10px] text-gray-200 hover:border-hero-vibrant hover:text-white transition-colors"
                  >
                    Stage (live)
                  </button>
                </div>
              )}
            </div>

            <div
              className={`relative flex min-h-[min(40vh,280px)] flex-1 flex-col rounded-md transition-shadow duration-200 ${
                stageDropHighlight
                  ? "ring-2 ring-hero-vibrant ring-offset-2 ring-offset-background-card/90"
                  : ""
              }`}
              onDragOver={(e) => {
                if (!isGM) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setStageDropHighlight(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setStageDropHighlight(false);
                }
              }}
              onDrop={(e) => {
                if (!isGM) return;
                e.preventDefault();
                setStageDropHighlight(false);
                try {
                  const raw = e.dataTransfer.getData("application/json");
                  if (!raw) return;
                  const data = JSON.parse(raw) as { kind?: string; id?: string };
                  if (data.kind === "npc" && data.id) placeOnStage("npc", data.id);
                  if (data.kind === "faction" && data.id)
                    placeOnStage("faction", data.id);
                } catch {
                  /* ignore invalid payload */
                }
              }}
            >
            {activeNpcs.length === 0 && activeFactions.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-2 text-center">
                <p className="max-w-md font-libre text-sm text-gray-400">
                  {isGM ? (
                    <>
                      Noch nichts auf der Bühne. Ziehe Karten aus dem Deck unten
                      hierher oder nutze{" "}
                      <span className="text-gray-300">Stage (live)</span>.
                    </>
                  ) : (
                    <>
                      Noch nichts auf der Bühne. Der Spielleiter kann im Stage
                      Manager NPCs und Fraktionen aktivieren.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-8">
                {activeNpcs.length > 0 && (
                  <div
                    className={
                      activeNpcs.length === 1
                        ? "flex flex-1 items-center justify-center"
                        : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                    }
                  >
                    {activeNpcs.map((npc) => {
                      const cardTitle = [npc.name, npc.title]
                        .filter(Boolean)
                        .join(" — ");
                      return (
                        <button
                          key={npc.id}
                          type="button"
                          title={cardTitle}
                          aria-label={`Porträt: ${npc.name}`}
                          onClick={() => {
                            if (npc.image_url) {
                              setStagePortrait({
                                name: npc.name,
                                subtitle: npc.title,
                                imageUrl: npc.image_url,
                              });
                            }
                          }}
                          className={`group relative aspect-[3/4] w-full max-h-[min(52vh,420px)] overflow-hidden rounded-lg border-2 border-hero-border/50 bg-background-dark shadow-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] hover:border-hero-vibrant/90 focus:outline-none focus:ring-2 focus:ring-hero-vibrant ${
                            activeNpcs.length === 1 ? "max-w-xs" : ""
                          } ${npc.image_url ? "cursor-zoom-in" : "cursor-default"}`}
                        >
                          {npc.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Session-Bühnen-Karte
                            <img
                              src={npc.image_url}
                              alt=""
                              className="h-full w-full object-cover pointer-events-none"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-hero-dark/60">
                              <span className="font-cinzel text-5xl text-accent-gold">
                                {npc.name[0]?.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {activeFactions.length > 0 && (
                  <div>
                    <h3 className="font-barlow font-bold text-xs uppercase text-gray-500 mb-3 flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-accent-gold" />
                      Aktive Fraktionen
                    </h3>
                    <div
                      className={
                        activeFactions.length === 1
                          ? "flex justify-center"
                          : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                      }
                    >
                      {activeFactions.map((fac) => {
                        const cardTitle = [fac.name, fac.type]
                          .filter(Boolean)
                          .join(" — ");
                        return (
                          <button
                            key={fac.id}
                            type="button"
                            title={cardTitle}
                            aria-label={`Fraktion: ${fac.name}`}
                            onClick={() => {
                              if (fac.image_url) {
                                setStagePortrait({
                                  name: fac.name,
                                  subtitle: fac.type,
                                  imageUrl: fac.image_url,
                                });
                              }
                            }}
                            className={`group relative aspect-[3/4] w-full max-h-[min(52vh,420px)] overflow-hidden rounded-lg border-2 border-amber-800/60 bg-amber-950/30 shadow-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] hover:border-amber-500/80 focus:outline-none focus:ring-2 focus:ring-amber-500/80 ${
                              activeFactions.length === 1 ? "max-w-xs" : ""
                            } ${fac.image_url ? "cursor-zoom-in" : "cursor-default"}`}
                          >
                            {fac.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element -- Session-Bühnen-Karte
                              <img
                                src={fac.image_url}
                                alt=""
                                className="h-full w-full object-cover pointer-events-none"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-amber-950/40">
                                <Flag className="h-14 w-14 text-accent-gold/90" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
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

        {isGM && (inHandNpcs.length > 0 || inHandFactions.length > 0) && (
          <StageDeckHand
            npcs={inHandNpcs}
            factions={inHandFactions}
            onPlace={placeOnStage}
          />
        )}

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

      {/* Stage Manager: Schnellzugriff (breit, ein Scrollbereich) */}
      {isGM && isStageManagerOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
            aria-label="Stage Manager schließen"
            onClick={() => setIsStageManagerOpen(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-full flex-col border-l border-hero-border/40 min-h-0 sm:max-w-2xl lg:max-w-4xl"
            style={{
              background: `
              radial-gradient(ellipse 110% 55% at -5% 5%, rgba(58, 66, 72, 0.55) 0%, transparent 58%),
              radial-gradient(ellipse 90% 45% at 105% 25%, rgba(48, 56, 62, 0.5) 0%, transparent 52%),
              radial-gradient(ellipse 70% 50% at 40% 100%, rgba(42, 50, 56, 0.45) 0%, transparent 48%),
              radial-gradient(ellipse 50% 35% at 75% 60%, rgba(255, 255, 255, 0.06) 0%, transparent 45%),
              linear-gradient(158deg, #151a1d 0%, #0b0e11 38%, #0f1316 72%, #12161a 100%),
              repeating-linear-gradient(
                -18deg,
                transparent 0px,
                transparent 4px,
                rgba(255, 255, 255, 0.025) 4px,
                rgba(255, 255, 255, 0.025) 5px
              )
            `,
              boxShadow:
                "inset 0 0 72px rgba(0,0,0,0.42), -12px 0 48px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hero-dark px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-4 w-4 shrink-0 text-accent-gold" />
                <h2 className="font-barlow font-bold text-sm uppercase text-gray-200 truncate">
                  Stage (live)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsStageManagerOpen(false)}
                className="shrink-0 rounded p-1 text-gray-400 hover:text-white hover:bg-background-dark transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="shrink-0 space-y-2 border-b border-hero-dark px-4 py-3">
              <Link
                href={stagePrepHref}
                onClick={() => setIsStageManagerOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-2.5 font-barlow font-bold uppercase text-xs text-accent-gold hover:bg-accent-gold/20 transition-colors"
              >
                <LayoutGrid className="h-4 w-4" />
                Bühnendeck &amp; Vorbereitung (Vollansicht)
              </Link>
              <p className="font-libre text-[11px] text-gray-500">
                Deck einschränken, Hintergrund und weitere Einstellungen erledigst du in der
                Vollansicht. Hier nur schnell NPCs/Fraktionen auf die Bühne schalten.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="px-4 py-3 border-b border-hero-dark flex items-center gap-2 min-w-0">
                <Search className="h-4 w-4 shrink-0 text-gray-500" />
                <input
                  type="search"
                  value={stageSearch}
                  onChange={(e) => setStageSearch(e.target.value)}
                  placeholder="NPCs suchen…"
                  className="min-w-0 flex-1 rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                />
              </div>
              <div className="space-y-2 px-4 py-3">
                {filteredNpcsForStageManager.length === 0 ? (
                  <p className="font-libre text-xs text-gray-500">
                    Keine NPCs gefunden.
                  </p>
                ) : (
                  filteredNpcsForStageManager.map((npc) => {
                    const isOnStage = activeNpcIds.has(String(npc.id));
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
                          className="h-4 w-4 shrink-0 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-barlow font-bold text-xs text-white break-words">
                            {npc.name}
                          </p>
                          {npc.title && (
                            <p className="font-libre text-[10px] text-gray-400 break-words">
                              {npc.title}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2 border-y border-hero-dark flex items-center gap-2 min-w-0">
                <Flag className="h-4 w-4 shrink-0 text-gray-500" />
                <input
                  type="search"
                  value={stageFactionSearch}
                  onChange={(e) => setStageFactionSearch(e.target.value)}
                  placeholder="Fraktionen suchen…"
                  className="min-w-0 flex-1 rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                />
              </div>
              <div className="space-y-2 px-4 py-3 pb-6">
                {filteredFactionsForStageManager.length === 0 ? (
                  <p className="font-libre text-xs text-gray-500">
                    Keine Fraktionen im Deck oder keine Treffer.
                  </p>
                ) : (
                  filteredFactionsForStageManager.map((fac) => {
                    const isOnStage = activeFactionIds.has(String(fac.id));
                    return (
                      <label
                        key={fac.id}
                        className="flex items-center gap-3 rounded border border-amber-900/30 bg-background-dark px-3 py-2 cursor-pointer hover:border-amber-700/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isOnStage}
                          onChange={(e) => {
                            const currentIds = new Set(
                              liveState?.visible_faction_ids || [],
                            );
                            if (e.target.checked) {
                              currentIds.add(fac.id);
                            } else {
                              currentIds.delete(fac.id);
                            }
                            updateLiveState({
                              visible_faction_ids: Array.from(currentIds),
                            });
                          }}
                          className="h-4 w-4 shrink-0 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-barlow font-bold text-xs text-white break-words">
                            {fac.name}
                          </p>
                          {fac.type && (
                            <p className="font-libre text-[10px] text-gray-400 break-words">
                              {fac.type}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="border-t border-hero-dark px-4 py-3 space-y-2">
                <a
                  href={`/dashboard/campaigns/${campaignId}/npcs/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-barlow font-bold uppercase text-[10px] text-hero-vibrant hover:border-hero-vibrant transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  Neuen NPC anlegen
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
              </div>

              <div className="border-t border-hero-dark px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4 text-accent-gold" />
                  <p className="font-barlow font-bold text-xs uppercase text-gray-300">
                    Hintergrund (Kurz)
                  </p>
                </div>
                <p className="font-libre text-[10px] text-gray-500">
                  Ausführliche Vorschau und Pflege: Vollansicht „Bühne vorbereiten“.
                </p>
                <input
                  type="url"
                  defaultValue={liveState?.background_url || ""}
                  placeholder="https://…"
                  onBlur={(e) =>
                    updateLiveState({
                      background_url: e.target.value.trim() || null,
                    })
                  }
                  className="w-full rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                />
              </div>
            </div>
          </div>
        </>
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

      {stagePortrait && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stage-portrait-title"
          onClick={() => setStagePortrait(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-[min(96vw,52rem)] rounded-lg border border-hero-border bg-background-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setStagePortrait(null)}
              className="absolute right-2 top-2 z-10 rounded-full border border-hero-border bg-background-dark/95 p-2 text-gray-300 hover:border-accent-gold hover:text-white transition-colors"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center gap-3 p-4 pt-12 sm:p-6 sm:pt-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stagePortrait.imageUrl}
                alt={stagePortrait.name}
                className="max-h-[min(78vh,720px)] w-auto max-w-full rounded-md object-contain shadow-lg"
              />
              <div className="max-w-full px-2 text-center">
                <p
                  id="stage-portrait-title"
                  className="font-cinzel text-lg font-bold text-white"
                >
                  {stagePortrait.name}
                </p>
                {stagePortrait.subtitle ? (
                  <p className="mt-1 font-libre text-sm text-accent-gold">
                    {stagePortrait.subtitle}
                  </p>
                ) : null}
                <p className="mt-2 font-libre text-xs text-gray-500">
                  Klick außerhalb oder Esc zum Schließen
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


