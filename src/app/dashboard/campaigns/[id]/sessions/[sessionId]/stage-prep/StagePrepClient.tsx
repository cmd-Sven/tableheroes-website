"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2, Save, ScrollText } from "lucide-react";
import { updateSessionStageDeck } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { SessionChronistModeControl } from "@/src/components/session/SessionChronistModeControl";
import { GmQuickRulebookModal } from "@/src/components/session/GmQuickRulebookModal";
import { StagePrepSceneMedia } from "@/src/components/session/StagePrepSceneMedia";
import { StagePrepBattlemaps } from "@/src/components/session/battlemap/StagePrepBattlemaps";
import type { CampaignSceneMedia } from "@/src/lib/scene-media-types";
import type { SessionBattlemap } from "@/src/lib/session/battlemap-types";
import type { SessionWorldMap, WorldMap } from "@/src/lib/world-maps/types";
import type { TranscriptionMode } from "@/src/lib/session-chronicle/constants";
import { SessionWorldMapsPanel } from "@/src/components/world-maps/SessionWorldMapsPanel";
import { StagePrepDeckPicker } from "@/src/components/session/StagePrepDeckPicker";

type CampaignNpc = {
  id: string;
  name: string;
  title: string | null;
  image_url?: string | null;
};

type CampaignFaction = {
  id: string;
  name: string;
  type: string | null;
  image_url?: string | null;
  banner_url?: string | null;
};

type CampaignCreature = {
  id: string;
  name: string;
  creature_type: string | null;
  is_revealed: boolean;
  image_url?: string | null;
};

type Props = {
  sessionId: string;
  campaignId: string;
  sessionTitle: string | null;
  sessionStatus: string;
  allCampaignNpcs: CampaignNpc[];
  allCampaignFactions: CampaignFaction[];
  allCampaignCreatures: CampaignCreature[];
  stageDeckNpcIds: string[] | null;
  stageDeckFactionIds: string[] | null;
  stageDeckCreatureIds: string[] | null;
  initialBackgroundUrl: string | null;
  initialTranscriptionMode: TranscriptionMode | null;
  sceneMediaItems: CampaignSceneMedia[];
  stageDeckSceneMediaIds: string[] | null;
  initialBattlemaps: SessionBattlemap[];
  availableWorldMaps?: WorldMap[];
  sessionWorldMaps?: SessionWorldMap[];
  showDnd5eSheet?: boolean;
};

const marblePanelStyle: CSSProperties = {
  background: `
    radial-gradient(ellipse 110% 55% at -5% 5%, rgba(58, 66, 72, 0.55) 0%, transparent 58%),
    radial-gradient(ellipse 90% 45% at 105% 25%, rgba(48, 56, 62, 0.5) 0%, transparent 52%),
    radial-gradient(ellipse 70% 50% at 40% 100%, rgba(42, 50, 56, 0.45) 0%, transparent 48%),
    linear-gradient(158deg, #151a1d 0%, #0b0e11 38%, #0f1316 72%, #12161a 100%),
    repeating-linear-gradient(
      -18deg,
      transparent 0px,
      transparent 4px,
      rgba(255, 255, 255, 0.025) 4px,
      rgba(255, 255, 255, 0.025) 5px
    )
  `,
  boxShadow: "inset 0 0 48px rgba(0,0,0,0.35)",
};

export function StagePrepClient({
  sessionId,
  campaignId,
  sessionTitle,
  sessionStatus,
  allCampaignNpcs,
  allCampaignFactions,
  allCampaignCreatures,
  stageDeckNpcIds,
  stageDeckFactionIds,
  stageDeckCreatureIds,
  initialBackgroundUrl,
  initialTranscriptionMode,
  sceneMediaItems,
  stageDeckSceneMediaIds,
  initialBattlemaps,
  availableWorldMaps = [],
  sessionWorldMaps = [],
  showDnd5eSheet = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quickRulebookOpen, setQuickRulebookOpen] = useState(false);
  const [npcDeckAll, setNpcDeckAll] = useState(stageDeckNpcIds == null);
  const [factionDeckAll, setFactionDeckAll] = useState(stageDeckFactionIds == null);
  const [creatureDeckAll, setCreatureDeckAll] = useState(stageDeckCreatureIds == null);
  const [npcDeckPick, setNpcDeckPick] = useState<Set<string>>(() => {
    if (stageDeckNpcIds?.length) return new Set(stageDeckNpcIds);
    return new Set();
  });
  const [factionDeckPick, setFactionDeckPick] = useState<Set<string>>(() => {
    if (stageDeckFactionIds?.length) return new Set(stageDeckFactionIds);
    return new Set();
  });
  const [creatureDeckPick, setCreatureDeckPick] = useState<Set<string>>(() => {
    if (stageDeckCreatureIds?.length) return new Set(stageDeckCreatureIds);
    return new Set();
  });
  const [bgUrl, setBgUrl] = useState(initialBackgroundUrl || "");

  useEffect(() => {
    setBgUrl(initialBackgroundUrl || "");
  }, [initialBackgroundUrl]);

  useEffect(() => {
    setNpcDeckAll(stageDeckNpcIds == null);
    setFactionDeckAll(stageDeckFactionIds == null);
    setCreatureDeckAll(stageDeckCreatureIds == null);
    setNpcDeckPick(new Set(stageDeckNpcIds?.length ? stageDeckNpcIds : []));
    setFactionDeckPick(
      new Set(stageDeckFactionIds?.length ? stageDeckFactionIds : []),
    );
    setCreatureDeckPick(
      new Set(stageDeckCreatureIds?.length ? stageDeckCreatureIds : []),
    );
  }, [
    stageDeckNpcIds,
    stageDeckFactionIds,
    stageDeckCreatureIds,
  ]);

  function saveDeck() {
    if (!npcDeckAll && npcDeckPick.size === 0) {
      alert(
        'Bitte mindestens einen NPC auswählen oder „Alle Kampagnen-NPCs“ aktivieren.',
      );
      return;
    }
    if (!factionDeckAll && factionDeckPick.size === 0) {
      alert('Bitte mindestens eine Fraktion auswählen oder „Alle Fraktionen“ aktivieren.');
      return;
    }
    if (!creatureDeckAll && creatureDeckPick.size === 0) {
      alert(
        "Bitte mindestens eine Kreatur auswählen oder „Alle Bestarium-Kreaturen“ aktivieren.",
      );
      return;
    }
    startTransition(async () => {
      try {
        await updateSessionStageDeck(sessionId, {
          stage_deck_npc_ids: npcDeckAll ? null : Array.from(npcDeckPick),
          stage_deck_faction_ids: factionDeckAll ? null : Array.from(factionDeckPick),
          stage_deck_creature_ids: creatureDeckAll ? null : Array.from(creatureDeckPick),
        });
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Deck konnte nicht gespeichert werden.");
      }
    });
  }

  function saveBackground() {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/live-background`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ backgroundUrl: bgUrl.trim() || null }),
            credentials: "same-origin",
          },
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          backgroundUrl?: string | null;
        };
        if (!res.ok) {
          alert(typeof data.error === "string" ? data.error : "Fehler beim Speichern.");
          return;
        }
        setBgUrl(data.backgroundUrl ?? "");
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Fehler beim Speichern.");
      }
    });
  }

  const npcPickerItems = useMemo(
    () =>
      allCampaignNpcs.map((npc) => ({
        id: npc.id,
        name: npc.name,
        subtitle: npc.title,
        imageUrl: npc.image_url,
      })),
    [allCampaignNpcs],
  );
  const factionPickerItems = useMemo(
    () =>
      allCampaignFactions.map((fac) => ({
        id: fac.id,
        name: fac.name,
        subtitle: fac.type,
        imageUrl: fac.image_url || fac.banner_url,
      })),
    [allCampaignFactions],
  );
  const creaturePickerItems = useMemo(
    () =>
      allCampaignCreatures.map((creature) => ({
        id: creature.id,
        name: creature.name,
        subtitle: creature.creature_type,
        imageUrl: creature.image_url,
        badge: creature.is_revealed ? null : "verborgen",
      })),
    [allCampaignCreatures],
  );

  const sessionPath = `/session/${sessionId}`;
  const campaignPath = `/dashboard/campaigns/${campaignId}`;

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <header
        className="border-b border-hero-border/40 px-4 py-4 md:px-8"
        style={marblePanelStyle}
      >
        <div className="mx-auto max-w-6xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={sessionPath}
              className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Zur Session
            </Link>
            <span className="text-gray-600 hidden sm:inline">|</span>
            <Link
              href={`${campaignPath}?tab=sessions`}
              className="font-barlow text-xs uppercase text-gray-400 hover:text-accent-gold"
            >
              Kampagne
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-barlow font-extrabold text-xl uppercase tracking-wide text-hero-vibrant">
                Bühnenvorbereitung
              </h1>
              <p className="font-libre text-sm text-gray-400 mt-0.5">
                {sessionTitle?.trim() || "Session"} · {sessionStatus}
              </p>
            </div>
            {showDnd5eSheet ? (
              <button
                type="button"
                onClick={() => setQuickRulebookOpen(true)}
                title="Schnell-Regelwerk (D&D 2024)"
                aria-label="Schnell-Regelwerk (D&D 2024)"
                className="relative grid h-11 w-11 shrink-0 place-items-center border border-accent-gold/50 text-accent-gold transition-colors hover:bg-accent-gold/15"
              >
                <BookOpen className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-8">
        <p className="font-libre text-sm text-gray-300 leading-relaxed max-w-3xl">
          Hier stellst du das <strong className="text-gray-200">Bühnendeck</strong> ein (welche
          NPCs, Fraktionen und <strong className="text-gray-200">Bestarium-Kreaturen</strong> im
          Stage Manager erscheinen), den{" "}
          <strong className="text-gray-200">Session-Hintergrund</strong> und unten die{" "}
          <a href="#szenen-mediathek" className="text-hero-vibrant hover:underline">
            Szenen-Mediathek
          </a>{" "}
          (Karten, Orte, Kampfszenen). In der laufenden Session legst du Szenen aus dem Deck auf
          die Bühne; der Stage Manager dient dort für schnelle Zu- und Abschaltungen.
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          <section
            className="rounded-lg border border-hero-dark p-6 shadow-lg lg:col-span-2"
            style={marblePanelStyle}
          >
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Bühnendeck
            </h2>
            <div className="space-y-6 font-libre text-sm text-gray-200">
              <div>
                <p className="font-barlow font-bold uppercase text-[10px] text-gray-500 mb-2">
                  NPCs im Stage Manager
                </p>
                <label className="flex items-center gap-2 cursor-pointer mb-1">
                  <input
                    type="radio"
                    name="npc-deck-full"
                    checked={npcDeckAll}
                    onChange={() => setNpcDeckAll(true)}
                    className="border-hero-border text-hero-vibrant"
                  />
                  Alle Kampagnen-NPCs
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="npc-deck-full"
                    checked={!npcDeckAll}
                    onChange={() => setNpcDeckAll(false)}
                    className="border-hero-border text-hero-vibrant"
                  />
                  Nur ausgewählte
                </label>
                <p className="mt-1 mb-1 font-libre text-xs text-gray-500">
                  „Nur ausgewählte“ startet leer. Dann Kacheln antippen oder Alle anwählen / abwählen.
                </p>
                {!npcDeckAll && (
                  <StagePrepDeckPicker
                    items={npcPickerItems}
                    selectedIds={npcDeckPick}
                    onChange={setNpcDeckPick}
                    searchPlaceholder="NPCs suchen…"
                    emptyLabel="Noch keine NPCs in dieser Kampagne."
                    entityLabel="NPCs"
                  />
                )}
              </div>

              <div>
                <p className="font-barlow font-bold uppercase text-[10px] text-gray-500 mb-2">
                  Fraktionen im Stage Manager
                </p>
                <label className="flex items-center gap-2 cursor-pointer mb-1">
                  <input
                    type="radio"
                    name="fac-deck-full"
                    checked={factionDeckAll}
                    onChange={() => setFactionDeckAll(true)}
                    className="border-hero-border text-hero-vibrant"
                  />
                  Alle Fraktionen
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fac-deck-full"
                    checked={!factionDeckAll}
                    onChange={() => setFactionDeckAll(false)}
                    className="border-hero-border text-hero-vibrant"
                  />
                  Nur ausgewählte
                </label>
                {!factionDeckAll && (
                  <StagePrepDeckPicker
                    items={factionPickerItems}
                    selectedIds={factionDeckPick}
                    onChange={setFactionDeckPick}
                    searchPlaceholder="Fraktionen suchen…"
                    emptyLabel="Noch keine Fraktionen in dieser Kampagne."
                    entityLabel="Fraktionen"
                  />
                )}
              </div>

              <div id="kreaturen-deck">
                <p className="font-barlow font-bold uppercase text-[10px] text-gray-500 mb-2">
                  Kreaturen im Stage Manager (Bestarium)
                </p>
                {allCampaignCreatures.length === 0 ? (
                  <p className="font-libre text-xs text-gray-500 mb-2">
                    Noch keine Kreaturen in dieser Welt. Lege sie im{" "}
                    <a
                      href={`${campaignPath}/bestarium`}
                      className="text-hero-vibrant hover:underline"
                    >
                      Kampagnen-Bestarium
                    </a>{" "}
                    bzw. in der Welt an.
                  </p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer mb-1">
                      <input
                        type="radio"
                        name="creature-deck-full"
                        checked={creatureDeckAll}
                        onChange={() => setCreatureDeckAll(true)}
                        className="border-hero-border text-hero-vibrant"
                      />
                      Alle Bestarium-Kreaturen
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="creature-deck-full"
                        checked={!creatureDeckAll}
                        onChange={() => setCreatureDeckAll(false)}
                        className="border-hero-border text-hero-vibrant"
                      />
                      Nur ausgewählte
                    </label>
                    {!creatureDeckAll && (
                      <StagePrepDeckPicker
                        items={creaturePickerItems}
                        selectedIds={creatureDeckPick}
                        onChange={setCreatureDeckPick}
                        searchPlaceholder="Kreaturen suchen…"
                        emptyLabel="Noch keine Kreaturen im Bestarium."
                        entityLabel="Kreaturen"
                      />
                    )}
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={saveDeck}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-6 py-3 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50 w-full sm:w-auto"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Deck speichern
              </button>
            </div>
          </section>

          <section
            className="rounded-lg border border-hero-dark p-6 shadow-lg space-y-4"
            style={marblePanelStyle}
          >
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-2">
              Atmosphäre
            </h2>
            <p className="font-libre text-sm text-gray-400">
              Hintergrundbild für die Session-Oberfläche (wird live übernommen).
            </p>
            <label className="block font-barlow font-bold uppercase text-[10px] text-gray-500">
              Bild-URL
            </label>
            <input
              type="url"
              value={bgUrl}
              onChange={(e) => setBgUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white focus:border-hero-vibrant outline-none"
            />
            <button
              type="button"
              onClick={saveBackground}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark/50 px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant disabled:opacity-50"
            >
              Hintergrund übernehmen
            </button>
            {bgUrl ? (
              <div
                className="mt-4 h-36 rounded border border-hero-border bg-cover bg-center opacity-90"
                style={{ backgroundImage: `url(${bgUrl})` }}
              />
            ) : null}
          </section>

          <section
            className="rounded-lg border border-hero-dark p-6 shadow-lg lg:col-span-2"
            style={marblePanelStyle}
          >
            <SessionChronistModeControl
              sessionId={sessionId}
              initialMode={initialTranscriptionMode}
              variant="full"
              onModeChange={() => router.refresh()}
            />
          </section>
        </div>

        <div id="szenen-mediathek" className="scroll-mt-24">
          <StagePrepSceneMedia
            campaignId={campaignId}
            sessionId={sessionId}
            initialItems={sceneMediaItems}
            stageDeckSceneMediaIds={stageDeckSceneMediaIds}
            onRefresh={() => router.refresh()}
          />
        </div>

        <div id="battlemaps" className="scroll-mt-24">
          <StagePrepBattlemaps
            sessionId={sessionId}
            campaignId={campaignId}
            initialBattlemaps={initialBattlemaps}
            onRefresh={() => router.refresh()}
          />
        </div>

        <div
          id="weltkarten"
          className="scroll-mt-24 rounded-lg border border-hero-dark bg-background-card/80 p-6"
        >
          <h2 className="mb-3 font-barlow text-lg font-bold uppercase text-hero-vibrant">
            Weltkarten für diese Session
          </h2>
          <p className="mb-4 font-libre text-sm text-gray-400">
            Land-, Regions- oder Stadtkarten aus der Welt anhängen. In der Live-Session
            kannst du alle Spieler auf eine Kartenansicht schieben.
          </p>
          <SessionWorldMapsPanel
            sessionId={sessionId}
            availableMaps={availableWorldMaps}
            attached={sessionWorldMaps}
          />
        </div>

        <div className="rounded-lg border border-hero-dark bg-background-card/80 p-4 flex flex-wrap gap-4 items-center">
          <a
            href={`${campaignPath}?tab=lore`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-xs text-accent-gold hover:text-white"
          >
            <ScrollText className="h-4 w-4" />
            Lore in neuem Tab
          </a>
          <a
            href={`${campaignPath}/npcs/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-xs text-hero-vibrant hover:text-white"
          >
            Neuen NPC anlegen (neuer Tab)
          </a>
          <a
            href={`${campaignPath}/bestarium`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-xs text-emerald-400 hover:text-white"
          >
            Bestarium öffnen (neuer Tab)
          </a>
        </div>
      </main>

      {showDnd5eSheet ? (
        <GmQuickRulebookModal
          open={quickRulebookOpen}
          onClose={() => setQuickRulebookOpen(false)}
        />
      ) : null}
    </div>
  );
}
