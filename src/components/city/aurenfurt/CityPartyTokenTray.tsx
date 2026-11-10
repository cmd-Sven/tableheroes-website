"use client";

import { Users } from "lucide-react";
import {
  clearPartyTokenDraft,
  setPartyTokenDraft,
  type AurenfurtPartyTokenState,
  type PartyTokenPlacementDraft,
} from "./aurenfurt-party-tokens";

export type CityPartyTrayCharacter = {
  id: string;
  name: string;
  imageUrl?: string | null;
  tokenUrl?: string | null;
  canPlace?: boolean;
};

type Props = {
  characters: CityPartyTrayCharacter[];
  draft: PartyTokenPlacementDraft | null;
  placed: AurenfurtPartyTokenState;
  canManage: boolean;
};

/**
 * Rechte Leiste auf der 3D-Stadtkarte: Spieler-Tokens + Gruppen-Token setzen.
 */
export function CityPartyTokenTray({ characters, draft, placed, canManage }: Props) {
  if (!canManage || characters.length === 0) return null;

  function selectCharacter(character: CityPartyTrayCharacter) {
    const imageUrl = character.tokenUrl || character.imageUrl || null;
    if (
      draft?.kind === "character" &&
      draft.characterId === character.id
    ) {
      clearPartyTokenDraft();
      return;
    }
    setPartyTokenDraft({
      kind: "character",
      characterId: character.id,
      name: character.name,
      imageUrl,
    });
  }

  function selectGroup() {
    if (draft?.kind === "group") {
      clearPartyTokenDraft();
      return;
    }
    setPartyTokenDraft({
      kind: "group",
      name: "Gruppe",
      imageUrl: null,
    });
  }

  return (
    <aside
      className="pointer-events-auto absolute right-3 top-1/2 z-[70] flex max-h-[70vh] -translate-y-1/2 flex-col gap-2 overflow-y-auto rounded-md border border-hero-border/70 bg-background-card/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-md"
      aria-label="Party-Tokens für die Stadtkarte"
    >
      <p className="px-1 text-center font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold">
        Tokens
      </p>
      <p className="px-1 text-center font-libre text-[9px] leading-snug text-gray-400">
        {draft ? "Klicke auf die Karte" : "Wählen & setzen"}
      </p>

      <button
        type="button"
        onClick={selectGroup}
        title="Gruppentoken setzen"
        className={`flex flex-col items-center gap-1 rounded border px-1.5 py-1.5 transition ${
          draft?.kind === "group"
            ? "border-hero-vibrant bg-hero-vibrant/15"
            : placed.group
              ? "border-accent-gold/60 bg-accent-gold/10"
              : "border-hero-dark/70 hover:border-hero-border"
        }`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full border border-accent-gold/50 bg-background-dark text-accent-gold">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <span className="max-w-[4.5rem] truncate font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-200">
          Gruppe
        </span>
      </button>

      <div className="my-0.5 h-px bg-hero-dark/60" />

      {characters.map((character) => {
        const imageUrl = character.tokenUrl || character.imageUrl || null;
        const placedHere = Boolean(placed.characters[character.id]);
        const active =
          draft?.kind === "character" && draft.characterId === character.id;
        return (
          <button
            key={character.id}
            type="button"
            disabled={character.canPlace === false}
            onClick={() => selectCharacter(character)}
            title={character.name}
            className={`flex flex-col items-center gap-1 rounded border px-1.5 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? "border-hero-vibrant bg-hero-vibrant/15"
                : placedHere
                  ? "border-accent-gold/60 bg-accent-gold/10"
                  : "border-hero-dark/70 hover:border-hero-border"
            }`}
          >
            <span className="relative h-11 w-11 overflow-hidden rounded-full border border-accent-gold/50 bg-background-dark">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center font-barlow text-xs font-bold text-accent-gold">
                  {character.name[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </span>
            <span className="max-w-[4.5rem] truncate font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-200">
              {character.name}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
