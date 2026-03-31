"use client";

import type { CSSProperties } from "react";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, ScrollText } from "lucide-react";
import {
  updateSessionBackgroundUrl,
  updateSessionStageDeck,
} from "@/src/app/dashboard/campaigns/[id]/session-actions";

type CampaignNpc = {
  id: string;
  name: string;
  title: string | null;
};

type CampaignFaction = {
  id: string;
  name: string;
  type: string | null;
};

type Props = {
  sessionId: string;
  campaignId: string;
  sessionTitle: string | null;
  sessionStatus: string;
  allCampaignNpcs: CampaignNpc[];
  allCampaignFactions: CampaignFaction[];
  stageDeckNpcIds: string[] | null;
  stageDeckFactionIds: string[] | null;
  initialBackgroundUrl: string | null;
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
  stageDeckNpcIds,
  stageDeckFactionIds,
  initialBackgroundUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [npcDeckAll, setNpcDeckAll] = useState(stageDeckNpcIds == null);
  const [factionDeckAll, setFactionDeckAll] = useState(stageDeckFactionIds == null);
  const [npcDeckPick, setNpcDeckPick] = useState<Set<string>>(() => {
    if (stageDeckNpcIds?.length) return new Set(stageDeckNpcIds);
    return new Set(allCampaignNpcs.map((n) => n.id));
  });
  const [factionDeckPick, setFactionDeckPick] = useState<Set<string>>(() => {
    if (stageDeckFactionIds?.length) return new Set(stageDeckFactionIds);
    return new Set(allCampaignFactions.map((f) => f.id));
  });
  const [bgUrl, setBgUrl] = useState(initialBackgroundUrl || "");
  const [npcSearch, setNpcSearch] = useState("");
  const [facSearch, setFacSearch] = useState("");

  useEffect(() => {
    setNpcDeckAll(stageDeckNpcIds == null);
    setFactionDeckAll(stageDeckFactionIds == null);
    setNpcDeckPick(
      new Set(
        stageDeckNpcIds?.length ? stageDeckNpcIds : allCampaignNpcs.map((n) => n.id),
      ),
    );
    setFactionDeckPick(
      new Set(
        stageDeckFactionIds?.length
          ? stageDeckFactionIds
          : allCampaignFactions.map((f) => f.id),
      ),
    );
  }, [stageDeckNpcIds, stageDeckFactionIds, allCampaignNpcs, allCampaignFactions]);

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
    startTransition(async () => {
      try {
        await updateSessionStageDeck(sessionId, {
          stage_deck_npc_ids: npcDeckAll ? null : Array.from(npcDeckPick),
          stage_deck_faction_ids: factionDeckAll ? null : Array.from(factionDeckPick),
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
        await updateSessionBackgroundUrl(sessionId, bgUrl.trim() || null);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Fehler beim Speichern.");
      }
    });
  }

  const npcFiltered = allCampaignNpcs.filter((n) =>
    `${n.name} ${n.title || ""}`.toLowerCase().includes(npcSearch.trim().toLowerCase()),
  );
  const facFiltered = allCampaignFactions.filter((f) =>
    `${f.name} ${f.type || ""}`.toLowerCase().includes(facSearch.trim().toLowerCase()),
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
          <div>
            <h1 className="font-barlow font-extrabold text-xl uppercase tracking-wide text-hero-vibrant">
              Bühnenvorbereitung
            </h1>
            <p className="font-libre text-sm text-gray-400 mt-0.5">
              {sessionTitle?.trim() || "Session"} · {sessionStatus}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-8">
        <p className="font-libre text-sm text-gray-300 leading-relaxed max-w-3xl">
          Hier stellst du das <strong className="text-gray-200">Bühnendeck</strong> ein (welche
          NPCs und Fraktionen im Stage Manager erscheinen) und den{" "}
          <strong className="text-gray-200">Session-Hintergrund</strong>. In der laufenden Session
          nutzt du den Stage Manager nur noch für schnelle Zu- und Abschaltungen auf der Bühne.
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          <section
            className="rounded-lg border border-hero-dark p-6 shadow-lg"
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
                    onChange={() => {
                      setNpcDeckAll(false);
                      setNpcDeckPick(new Set(allCampaignNpcs.map((n) => n.id)));
                    }}
                    className="border-hero-border text-hero-vibrant"
                  />
                  Nur ausgewählte
                </label>
                {!npcDeckAll && (
                  <>
                    <input
                      type="search"
                      value={npcSearch}
                      onChange={(e) => setNpcSearch(e.target.value)}
                      placeholder="NPCs filtern…"
                      className="mt-3 w-full rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white focus:border-hero-vibrant outline-none"
                    />
                    <div className="mt-2 max-h-[min(50vh,28rem)] overflow-y-auto rounded border border-hero-border/40 bg-background-dark/90 p-3 space-y-2">
                      {npcFiltered.map((npc) => (
                        <label
                          key={npc.id}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={npcDeckPick.has(npc.id)}
                            onChange={(e) => {
                              setNpcDeckPick((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(npc.id);
                                else next.delete(npc.id);
                                return next;
                              });
                            }}
                            className="rounded border-hero-border"
                          />
                          <span>
                            {npc.name}
                            {npc.title ? (
                              <span className="text-gray-500 text-xs"> · {npc.title}</span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
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
                    onChange={() => {
                      setFactionDeckAll(false);
                      setFactionDeckPick(new Set(allCampaignFactions.map((f) => f.id)));
                    }}
                    className="border-hero-border text-hero-vibrant"
                  />
                  Nur ausgewählte
                </label>
                {!factionDeckAll && (
                  <>
                    <input
                      type="search"
                      value={facSearch}
                      onChange={(e) => setFacSearch(e.target.value)}
                      placeholder="Fraktionen filtern…"
                      className="mt-3 w-full rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white focus:border-hero-vibrant outline-none"
                    />
                    <div className="mt-2 max-h-[min(40vh,22rem)] overflow-y-auto rounded border border-hero-border/40 bg-background-dark/90 p-3 space-y-2">
                      {facFiltered.map((fac) => (
                        <label
                          key={fac.id}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={factionDeckPick.has(fac.id)}
                            onChange={(e) => {
                              setFactionDeckPick((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(fac.id);
                                else next.delete(fac.id);
                                return next;
                              });
                            }}
                            className="rounded border-hero-border"
                          />
                          <span>
                            {fac.name}
                            {fac.type ? (
                              <span className="text-gray-500 text-xs"> · {fac.type}</span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
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
        </div>
      </main>
    </div>
  );
}
