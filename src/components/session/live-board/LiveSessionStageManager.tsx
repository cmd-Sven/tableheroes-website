/**
 * LiveSessionStageManager — GM slide-over to toggle NPCs/factions on stage and set background URL.
 */
"use client";

import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  Flag,
  LayoutGrid,
  PlusCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import type { CampaignNpc, CampaignFaction, LiveState } from "./live-session-types";

type StageManagerNpc = Pick<CampaignNpc, "id" | "name" | "title">;
type StageManagerFaction = Pick<CampaignFaction, "id" | "name" | "type">;

type Props = {
  open: boolean;
  campaignId: string;
  stagePrepHref: string;
  liveState: LiveState | null;
  stageSearch: string;
  stageFactionSearch: string;
  filteredNpcs: StageManagerNpc[];
  filteredFactions: StageManagerFaction[];
  activeNpcIds: Set<string>;
  activeFactionIds: Set<string>;
  onClose: () => void;
  onStageSearchChange: (value: string) => void;
  onStageFactionSearchChange: (value: string) => void;
  onOpenNpcSearch: () => void;
  onToggleNpcOnStage: (npcId: string, onStage: boolean) => void;
  onToggleFactionOnStage: (factionId: string, onStage: boolean) => void;
  onBackgroundUrlBlur: (url: string | null) => void;
  onResetBackground: () => void;
};

export function LiveSessionStageManager({
  open,
  campaignId,
  stagePrepHref,
  liveState,
  stageSearch,
  stageFactionSearch,
  filteredNpcs,
  filteredFactions,
  activeNpcIds,
  activeFactionIds,
  onClose,
  onStageSearchChange,
  onStageFactionSearchChange,
  onOpenNpcSearch,
  onToggleNpcOnStage,
  onToggleFactionOnStage,
  onBackgroundUrlBlur,
  onResetBackground,
}: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
        aria-label="Stage Manager schließen"
        onClick={onClose}
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
          boxShadow: "inset 0 0 72px rgba(0,0,0,0.42), -12px 0 48px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hero-dark px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 shrink-0 text-accent-gold" />
            <h2 className="font-barlow font-bold text-sm uppercase text-gray-200 truncate">
              Stage (live)
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onOpenNpcSearch}
              className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-background-dark px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:border-accent-gold transition-colors"
              title="NPCs suchen und auf die Bühne legen"
            >
              <Search className="h-3.5 w-3.5" />
              NPCs
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:text-white hover:bg-background-dark transition-colors"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-b border-hero-dark px-4 py-3">
          <Link
            href={stagePrepHref}
            onClick={onClose}
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
              onChange={(e) => onStageSearchChange(e.target.value)}
              placeholder="NPCs suchen…"
              className="min-w-0 flex-1 rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
            />
          </div>
          <div className="space-y-2 px-4 py-3">
            {filteredNpcs.length === 0 ? (
              <p className="font-libre text-xs text-gray-500">Keine NPCs gefunden.</p>
            ) : (
              filteredNpcs.map((npc) => {
                const isOnStage = activeNpcIds.has(String(npc.id));
                return (
                  <label
                    key={npc.id}
                    className="flex items-center gap-3 rounded border border-hero-border/30 bg-background-dark px-3 py-2 cursor-pointer hover:border-hero-vibrant transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isOnStage}
                      onChange={(e) => onToggleNpcOnStage(String(npc.id), e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-barlow font-bold text-xs text-white wrap-break-word">
                        {npc.name}
                      </p>
                      {npc.title && (
                        <p className="font-libre text-[10px] text-gray-400 wrap-break-word">
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
              onChange={(e) => onStageFactionSearchChange(e.target.value)}
              placeholder="Fraktionen suchen…"
              className="min-w-0 flex-1 rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
            />
          </div>
          <div className="space-y-2 px-4 py-3 pb-6">
            {filteredFactions.length === 0 ? (
              <p className="font-libre text-xs text-gray-500">
                Keine Fraktionen im Deck oder keine Treffer.
              </p>
            ) : (
              filteredFactions.map((fac) => {
                const isOnStage = activeFactionIds.has(String(fac.id));
                return (
                  <label
                    key={fac.id}
                    className="flex items-center gap-3 rounded border border-amber-900/30 bg-background-dark px-3 py-2 cursor-pointer hover:border-amber-700/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isOnStage}
                      onChange={(e) => onToggleFactionOnStage(String(fac.id), e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-barlow font-bold text-xs text-white wrap-break-word">
                        {fac.name}
                      </p>
                      {fac.type && (
                        <p className="font-libre text-[10px] text-gray-400 wrap-break-word">
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
              onBlur={(e) => onBackgroundUrlBlur(e.target.value.trim() || null)}
              className="w-full rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
            />
            <button
              type="button"
              onClick={onResetBackground}
              className="w-full rounded border border-amber-900/60 bg-background-dark px-3 py-2 font-barlow text-[10px] font-bold uppercase text-gray-300 transition-colors hover:border-accent-gold hover:text-accent-gold"
            >
              Hintergrund auf Orts-Standard zurücksetzen
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
