"use client";

import { CircleDot, Skull, User, Users, X } from "lucide-react";
import {
  NPC_SIZE_CELLS,
  parseNpcTokenSizeCategory,
  type NpcTokenSizeCategory,
} from "@/src/lib/npcs/npc-sheet-types";
import type { BattlemapTokenSide } from "@/src/lib/session/battlemap-types";

export type TokensPanelPlayer = {
  id: string;
  name: string;
  imageUrl: string | null;
  tokenUrl?: string | null;
  /** Nur dieser Spieler (oder SL) darf platzieren */
  canPlace: boolean;
  sizeCategory?: NpcTokenSizeCategory;
  showHpBar?: boolean;
};

export type TokensPanelNpc = {
  id: string;
  name: string;
  title?: string | null;
  imageUrl: string | null;
  tokenUrl?: string | null;
  sizeCategory?: NpcTokenSizeCategory | string | null;
};

export type TokensPanelCreature = {
  id: string;
  name: string;
  creatureType?: string | null;
  imageUrl: string | null;
};

type Props = {
  onClose: () => void;
  isGM: boolean;
  battlemapActive: boolean;
  players: TokensPanelPlayer[];
  npcs: TokensPanelNpc[];
  creatures: TokensPanelCreature[];
  onStartPlayerPlacement: (player: TokensPanelPlayer) => void;
  onStartNpcPlacement: (npc: TokensPanelNpc) => void;
  onStartCreaturePlacement: (creature: TokensPanelCreature) => void;
};

function TokenThumb({
  imageUrl,
  label,
  disabled,
  onClick,
  accentClass,
}: {
  imageUrl: string | null;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  accentClass: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${accentClass}`}
    >
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-hero-border/50 bg-black/50">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center font-barlow text-xs font-bold text-accent-gold">
            {label[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-cinzel text-xs font-bold text-white">
          {label}
        </span>
        <span className="font-libre text-[10px] text-gray-500">
          {disabled ? "Nicht verfügbar" : "Klicken → Zelle wählen"}
        </span>
      </span>
    </button>
  );
}

export function LiveSessionTokensPanel({
  onClose,
  isGM,
  battlemapActive,
  players,
  npcs,
  creatures,
  onStartPlayerPlacement,
  onStartNpcPlacement,
  onStartCreaturePlacement,
}: Props) {
  const placeDisabled = !battlemapActive;

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
        <div className="min-w-0 flex items-center gap-2">
          <CircleDot className="h-4 w-4 shrink-0 text-hero-vibrant" />
          <div>
            <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
              Tokens
            </h2>
            <p className="font-libre text-[10px] text-gray-500">
              {battlemapActive
                ? "Auf die aktive Battlemap setzen"
                : "Zuerst eine Battlemap aktivieren"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-hero-border/40 p-1 text-gray-400 hover:text-white"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <section>
          <p className="mb-2 flex items-center gap-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
            <User className="h-3.5 w-3.5" />
            Spieler-Tokens
          </p>
          {players.length === 0 ? (
            <p className="font-libre text-xs text-gray-500 italic">Keine Spieler</p>
          ) : (
            <ul className="space-y-1.5">
              {players.map((p) => (
                <li key={p.id}>
                  <TokenThumb
                    imageUrl={p.tokenUrl || p.imageUrl}
                    label={p.name}
                    disabled={placeDisabled || !p.canPlace}
                    accentClass="border-hero-border/50 bg-black/25 hover:border-hero-vibrant/70"
                    onClick={() => onStartPlayerPlacement(p)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {isGM ? (
          <>
            <section>
              <p className="mb-2 flex items-center gap-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                <Users className="h-3.5 w-3.5" />
                NPC-Tokens
              </p>
              {npcs.length === 0 ? (
                <p className="font-libre text-xs text-gray-500 italic">Keine NPCs</p>
              ) : (
                <ul className="space-y-1.5">
                  {npcs.map((n) => (
                    <li key={n.id}>
                      <TokenThumb
                        imageUrl={n.tokenUrl || n.imageUrl}
                        label={n.title ? `${n.name} — ${n.title}` : n.name}
                        disabled={placeDisabled}
                        accentClass="border-hero-border/50 bg-black/25 hover:border-sky-400/70"
                        onClick={() => onStartNpcPlacement(n)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <p className="mb-2 flex items-center gap-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                <Skull className="h-3.5 w-3.5" />
                Monster / Gegner
              </p>
              {creatures.length === 0 ? (
                <p className="font-libre text-xs text-gray-500 italic">Keine Kreaturen</p>
              ) : (
                <ul className="space-y-1.5">
                  {creatures.map((c) => (
                    <li key={c.id}>
                      <TokenThumb
                        imageUrl={c.imageUrl}
                        label={
                          c.creatureType
                            ? `${c.name} — ${c.creatureType}`
                            : c.name
                        }
                        disabled={placeDisabled}
                        accentClass="border-red-900/50 bg-black/25 hover:border-red-500/70"
                        onClick={() => onStartCreaturePlacement(c)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function sizeCellsFromCategory(
  category: string | null | undefined,
): number {
  const cat = parseNpcTokenSizeCategory(category);
  return NPC_SIZE_CELLS[cat] ?? 1;
}

export function npcPlacementDraft(npc: TokensPanelNpc): {
  kind: "npc";
  refId: string;
  name: string;
  imageUrl: string | null;
  tokenSide: BattlemapTokenSide;
  sizeCells: number;
  isVisibleToPlayers: boolean;
} {
  return {
    kind: "npc",
    refId: npc.id,
    name: npc.name,
    imageUrl: npc.tokenUrl || npc.imageUrl,
    tokenSide: "neutral",
    sizeCells: sizeCellsFromCategory(npc.sizeCategory),
    isVisibleToPlayers: true,
  };
}

export function creaturePlacementDraft(creature: TokensPanelCreature): {
  kind: "creature";
  refId: string;
  name: string;
  imageUrl: string | null;
  tokenSide: BattlemapTokenSide;
  sizeCells: number;
  isVisibleToPlayers: boolean;
} {
  return {
    kind: "creature",
    refId: creature.id,
    name: creature.name,
    imageUrl: creature.imageUrl,
    tokenSide: "hostile",
    sizeCells: 2,
    isVisibleToPlayers: true,
  };
}
