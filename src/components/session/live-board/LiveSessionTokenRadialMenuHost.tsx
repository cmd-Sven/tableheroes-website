/**
 * LiveSessionTokenRadialMenuHost — Battlemap token radial menu for non-character tokens.
 */
"use client";

import type { Dispatch, SetStateAction, TransitionStartFunction } from "react";
import { toast } from "sonner";
import { BattlemapTokenRadialMenu } from "@/src/components/session/battlemap/BattlemapTokenRadialMenu";
import {
  removeBattlemapToken,
  toggleBattlemapTokenVisibility,
  updateBattlemapTokenSettings,
} from "@/src/lib/actions/battlemap-actions";
import type { SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import { isCombatTokenUsed } from "./live-session-combat-utils";
import type { CombatTokenPayload, LiveState, PartyCharacter } from "./live-session-types";

export type LiveSessionTokenRadialMenuHostProps = {
  tokenRadial: { token: SessionBattlemapToken; x: number; y: number } | null;
  setTokenRadial: Dispatch<
    SetStateAction<{ token: SessionBattlemapToken; x: number; y: number } | null>
  >;
  isGM: boolean;
  battlemapTokenHpByRef: Record<string, { current: number; max: number }>;
  setGmMoveTokenId: Dispatch<SetStateAction<string | null>>;
  setGmTokenPlacement: Dispatch<SetStateAction<import("@/src/lib/session/battlemap-types").GmTokenPlacementDraft | null>>;
  setTokenPlacement: Dispatch<SetStateAction<import("@/src/lib/session/battlemap-types").CharacterTokenPlacement | null>>;
  partyCharacters: PartyCharacter[];
  startCharacterTokenPlacement: (characterId: string, characterName: string) => void;
  startTransition: TransitionStartFunction;
  sessionId: string;
  setBattlemapTokens: Dispatch<SetStateAction<SessionBattlemapToken[]>>;
  notifyBattlemapTokensChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    token?: SessionBattlemapToken | null;
    tokenId?: string | null;
  }) => void;
  setSelectedBattlemapTokenId: Dispatch<SetStateAction<string | null>>;
  liveState: LiveState | null;
  battlemapTokenToCombatPayload: (token: SessionBattlemapToken) => CombatTokenPayload | null;
  combatParticipantNames: Set<string>;
  combatParticipantNpcIds: Set<string>;
  addCombatToken: (payload: CombatTokenPayload) => Promise<void> | void;
};

export function LiveSessionTokenRadialMenuHost(props: LiveSessionTokenRadialMenuHostProps) {
  const {
    tokenRadial,
    setTokenRadial,
    isGM,
    battlemapTokenHpByRef,
    setGmMoveTokenId,
    setGmTokenPlacement,
    setTokenPlacement,
    partyCharacters,
    startCharacterTokenPlacement,
    startTransition,
    sessionId,
    setBattlemapTokens,
    notifyBattlemapTokensChanged,
    setSelectedBattlemapTokenId,
    liveState,
    battlemapTokenToCombatPayload,
    combatParticipantNames,
    combatParticipantNpcIds,
    addCombatToken,
  } = props;

  return (
    <>
{tokenRadial && !tokenRadial.token.character_id ? (
        <BattlemapTokenRadialMenu
          token={tokenRadial.token}
          anchor={{ x: tokenRadial.x, y: tokenRadial.y }}
          isGm={isGM}
          hpCurrent={
            tokenRadial.token.character_id
              ? battlemapTokenHpByRef[`char:${tokenRadial.token.character_id}`]?.current
              : tokenRadial.token.npc_id
                ? battlemapTokenHpByRef[`npc:${tokenRadial.token.npc_id}`]?.current
                : null
          }
          hpMax={
            tokenRadial.token.character_id
              ? battlemapTokenHpByRef[`char:${tokenRadial.token.character_id}`]?.max
              : tokenRadial.token.npc_id
                ? battlemapTokenHpByRef[`npc:${tokenRadial.token.npc_id}`]?.max
                : null
          }
          onClose={() => setTokenRadial(null)}
          onMove={
            isGM && !tokenRadial.token.character_id
              ? () => {
                  setGmMoveTokenId(tokenRadial.token.id);
                  setGmTokenPlacement(null);
                  setTokenPlacement(null);
                }
              : isGM && tokenRadial.token.character_id
                ? () => {
                    const ch = partyCharacters.find(
                      (p) => p.id === tokenRadial.token.character_id,
                    );
                    if (ch) startCharacterTokenPlacement(ch.id, ch.name);
                  }
                : undefined
          }
          onToggleVisibility={
            isGM
              ? (visible) => {
                  startTransition(async () => {
                    try {
                      const updated = await toggleBattlemapTokenVisibility(
                        tokenRadial.token.id,
                        sessionId,
                        visible,
                      );
                      setBattlemapTokens((prev) =>
                        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
                      );
                      notifyBattlemapTokensChanged({ op: "upsert", token: updated });
                      toast.success(visible ? "Token sichtbar." : "Token verborgen.");
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Sichtbarkeit fehlgeschlagen.",
                      );
                    }
                  });
                }
              : undefined
          }
          onRemove={
            isGM
              ? () => {
                  startTransition(async () => {
                    try {
                      const tokenId = tokenRadial.token.id;
                      await removeBattlemapToken(tokenId, sessionId);
                      setBattlemapTokens((prev) => prev.filter((t) => t.id !== tokenId));
                      setSelectedBattlemapTokenId(null);
                      notifyBattlemapTokensChanged({ op: "delete", tokenId });
                      toast.success("Token entfernt.");
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Entfernen fehlgeschlagen.",
                      );
                    }
                  });
                }
              : undefined
          }
          canJoinCombat={(() => {
            if (!liveState?.is_combat_mode || !isGM) return false;
            const payload = battlemapTokenToCombatPayload(tokenRadial.token);
            if (!payload) return false;
            return !isCombatTokenUsed(
              payload,
              combatParticipantNames,
              combatParticipantNpcIds,
            );
          })()}
          onJoinCombat={
            isGM && liveState?.is_combat_mode
              ? () => {
                  const payload = battlemapTokenToCombatPayload(tokenRadial.token);
                  if (payload) void addCombatToken(payload);
                }
              : undefined
          }
          onSaveSettings={(settings) => {
            startTransition(async () => {
              try {
                const updated = await updateBattlemapTokenSettings({
                  tokenId: tokenRadial.token.id,
                  sessionId,
                  showHpBar: settings.showHpBar,
                  sizeCells: settings.sizeCells,
                });
                setBattlemapTokens((prev) =>
                  prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
                );
                notifyBattlemapTokensChanged({ op: "upsert", token: updated });
                toast.success("Token-Einstellungen gespeichert.");
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Einstellungen fehlgeschlagen.",
                );
              }
            });
          }}
        />
      ) : null}
    </>
  );
}
