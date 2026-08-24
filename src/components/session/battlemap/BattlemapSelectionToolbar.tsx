/**
 * BattlemapSelectionToolbar — GM bottom toolbar for visibility, prop resize, and remove on selected token/prop.
 */
"use client";

import { Eye, EyeOff, Minus, Plus, Trash2 } from "lucide-react";
import type {
  SessionBattlemapProp,
  SessionBattlemapToken,
} from "@/src/lib/session/battlemap-types";

type Props = {
  isGm: boolean;
  selectedToken: SessionBattlemapToken | null | undefined;
  selectedProp: SessionBattlemapProp | null | undefined;
  onToggleTokenVisibility?: (tokenId: string, visible: boolean) => void;
  onTogglePropVisibility?: (propId: string, visible: boolean) => void;
  onPropResize?: (propId: string, delta: number) => void;
  onRemoveToken?: (tokenId: string) => void;
  onRemoveProp?: (propId: string) => void;
};

export function BattlemapSelectionToolbar({
  isGm,
  selectedToken,
  selectedProp,
  onToggleTokenVisibility,
  onTogglePropVisibility,
  onPropResize,
  onRemoveToken,
  onRemoveProp,
}: Props) {
  if (!isGm || (!selectedToken && !selectedProp)) return null;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-hero-border/70 bg-background-card/95 px-3 py-2 shadow-xl backdrop-blur-md">
      <span className="max-w-[8rem] truncate font-barlow text-[10px] font-bold uppercase text-gray-300">
        {selectedToken?.label ?? selectedProp?.kind ?? "Auswahl"}
      </span>
      {selectedToken && onToggleTokenVisibility ? (
        <button
          type="button"
          title={
            selectedToken.is_visible_to_players
              ? "Für Spieler verbergen"
              : "Für Spieler sichtbar"
          }
          onClick={() =>
            onToggleTokenVisibility(
              selectedToken.id,
              !selectedToken.is_visible_to_players,
            )
          }
          className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-accent-gold hover:text-accent-gold"
        >
          {selectedToken.is_visible_to_players ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
      ) : null}
      {selectedProp && onTogglePropVisibility ? (
        <>
          <button
            type="button"
            title={
              selectedProp.is_visible_to_players
                ? "Für Spieler verbergen"
                : "Für Spieler sichtbar"
            }
            onClick={() =>
              onTogglePropVisibility(
                selectedProp.id,
                !selectedProp.is_visible_to_players,
              )
            }
            className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-accent-gold hover:text-accent-gold"
          >
            {selectedProp.is_visible_to_players ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>
          {onPropResize ? (
            <>
              <button
                type="button"
                title="Verkleinern"
                onClick={() => onPropResize(selectedProp.id, -0.02)}
                className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Vergrößern"
                onClick={() => onPropResize(selectedProp.id, 0.02)}
                className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </>
          ) : null}
        </>
      ) : null}
      {selectedToken && onRemoveToken ? (
        <button
          type="button"
          title="Token entfernen"
          onClick={() => onRemoveToken(selectedToken.id)}
          className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-red-500 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {selectedProp && onRemoveProp ? (
        <button
          type="button"
          title="Prop entfernen"
          onClick={() => onRemoveProp(selectedProp.id)}
          className="rounded border border-hero-border/50 p-1.5 text-gray-300 hover:border-red-500 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
