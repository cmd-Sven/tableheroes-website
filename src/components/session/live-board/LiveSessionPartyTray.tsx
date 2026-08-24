/**
 * LiveSessionPartyTray — Bottom hero avatar strip with combat turn and inventory shortcuts.
 */
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Feather, Hand } from "lucide-react";
import { LiveSessionCharacterAvatar } from "@/src/components/session/LiveSessionCharacterAvatar";
import { PartyTrayExhaustionBadge } from "./PartyTrayExhaustionBadge";
import { FALLBACK_PLAYER_COLOR } from "@/src/lib/session/class-player-color";
import type { SessionHandRaise } from "@/src/lib/session/hand-raises";
import type { SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import type { CombatParticipant, PartyCharacter } from "./live-session-types";

export type PartyTrayMode = "full" | "compact" | "hidden";

type Props = {
  partyTrayMode: PartyTrayMode;
  displayPartyCharacters: PartyCharacter[];
  userId: string;
  isGuest: boolean;
  isGM: boolean;
  presentUserIds: Set<string>;
  physicallyPresentIdSet: Set<string>;
  scribeId: string | null | undefined;
  handRaises: SessionHandRaise[];
  playerColorByCharacterId: Record<string, string>;
  combatStarted: boolean;
  activeCombatParticipant: CombatParticipant | null | undefined;
  currentPlayerCharacterId: string | null | undefined;
  showDnd5eSheet: boolean;
  battlemapActive: boolean;
  battlemapMovementPaused: boolean | null | undefined;
  battlemapTokens: SessionBattlemapToken[];
  isCombatMode: boolean;
  combatParticipantNames: Set<string>;
  sessionId: string;
  campaignId: string;
  onAssignScribe: (userId: string | null) => void;
  onOpenInventory: (pc: PartyCharacter) => void;
  onStartTokenPlacement: (characterId: string, characterName: string) => void;
  onBattlemapTokensChanged: (updated: SessionBattlemapToken) => void;
  onJoinCombat: (pc: PartyCharacter) => void;
};

export function LiveSessionPartyTray({
  partyTrayMode,
  displayPartyCharacters,
  userId,
  isGuest,
  isGM,
  presentUserIds,
  physicallyPresentIdSet,
  scribeId,
  handRaises,
  playerColorByCharacterId,
  combatStarted,
  activeCombatParticipant,
  currentPlayerCharacterId,
  showDnd5eSheet,
  battlemapActive,
  battlemapMovementPaused,
  battlemapTokens,
  isCombatMode,
  combatParticipantNames,
  sessionId,
  campaignId,
  onAssignScribe,
  onOpenInventory,
  onStartTokenPlacement,
  onBattlemapTokensChanged,
  onJoinCombat,
}: Props) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-50 overflow-visible bg-transparent px-4 ${
        partyTrayMode === "hidden" ? "pb-1.5 pt-1.5" : "pb-1"
      }`}
    >
      {partyTrayMode === "hidden" ? null : displayPartyCharacters.length === 0 ? (
        <div className="pointer-events-none mx-auto max-w-lg space-y-1 py-3">
          <p className="font-libre text-xs text-gray-400">
            Hier erscheinen Charaktere von Spielern, die für diesen Termin zugesagt haben
            oder vom GM freigegeben wurden.
          </p>
          <p className="font-libre text-[10px] text-gray-500">
            Wenn die Liste leer bleibt: In Supabase die Funktion{" "}
            <code className="text-gray-400">get_session_party_tray</code>{" "}
            aus der Migration ausführen.
          </p>
        </div>
      ) : (
        <div className="pointer-events-none relative z-[60] flex justify-center px-1">
          <div className="pointer-events-auto w-fit max-w-full overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              className={`flex justify-center ${
                partyTrayMode === "compact" ? "gap-3 px-4 py-1" : "gap-5 px-6 py-1"
              }`}
            >
              {displayPartyCharacters.map((pc) => {
                const pid = pc.playerUserId ? String(pc.playerUserId) : "";
                const isGuestSelf =
                  isGuest && pc.isSessionDummy && pc.guestId === userId;
                const self = pid === userId || isGuestSelf;
                const onDeck =
                  Boolean(pc.isSessionDummy) ||
                  !pid ||
                  self ||
                  presentUserIds.has(pid) ||
                  physicallyPresentIdSet.has(pid);
                const isScribe = !!pid && scribeId === pid;
                const canOpenInventory =
                  !isGuest &&
                  (isGM || pid === userId) &&
                  !pc.isSessionDummy;
                const canInteractAvatar = canOpenInventory && showDnd5eSheet;
                const isActiveTurn =
                  combatStarted &&
                  activeCombatParticipant?.type === "player" &&
                  activeCombatParticipant.name === pc.name &&
                  !pc.isSessionDummy;
                const handRaise =
                  handRaises.find(
                    (r) =>
                      (pid && r.userId === pid) ||
                      (r.characterId != null && r.characterId === pc.id),
                  ) ?? null;
                const playerColor =
                  playerColorByCharacterId[pc.id] ?? FALLBACK_PLAYER_COLOR;
                const compact = partyTrayMode === "compact";
                return (
                  <motion.div
                    key={pc.id}
                    className={`relative flex shrink-0 flex-col items-center pt-2 transition-[opacity,filter,transform] duration-200 ${
                      compact ? "w-[118px]" : "w-[272px] pt-4"
                    } ${onDeck ? "" : "opacity-50 grayscale"}`}
                    animate={
                      isActiveTurn
                        ? {
                            y: [0, compact ? -3 : -6, 0],
                            filter: [
                              "drop-shadow(0 0 0 rgba(202,185,38,0))",
                              "drop-shadow(0 0 18px rgba(202,185,38,0.85))",
                              "drop-shadow(0 0 0 rgba(202,185,38,0))",
                            ],
                          }
                        : { y: 0 }
                    }
                    transition={
                      isActiveTurn
                        ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.2 }
                    }
                  >
                    {isActiveTurn ? (
                      <span
                        className={`mb-1 rounded-full border border-accent-gold bg-accent-gold/20 font-barlow font-extrabold uppercase tracking-wide text-accent-gold shadow-[0_0_18px_rgba(202,185,38,0.65)] ${
                          compact
                            ? "px-2 py-0.5 text-[8px]"
                            : "mb-2 px-4 py-1 text-xs"
                        }`}
                      >
                        {activeCombatParticipant?.name === pc.name &&
                        currentPlayerCharacterId === pc.id
                          ? "Du bist am Zug"
                          : "Am Zug"}
                      </span>
                    ) : null}
                    <div
                      className={`relative drop-shadow-2xl ${
                        compact ? "h-32 w-28" : "h-64 w-56"
                      }`}
                    >
                      <Image
                        src="/images/Session_ui/player-frame.png?v=20260429-freigestellt"
                        alt=""
                        fill
                        sizes={compact ? "112px" : "224px"}
                        className="pointer-events-none object-contain object-bottom"
                        priority={false}
                        unoptimized
                      />
                      <div
                        className={`absolute z-30 flex flex-col items-center justify-end text-center ${
                          compact
                            ? "inset-x-2 bottom-5 top-5"
                            : "inset-x-3 bottom-7 top-8"
                        }`}
                      >
                        <LiveSessionCharacterAvatar
                          sessionId={sessionId}
                          campaignId={campaignId}
                          characterId={pc.id}
                          characterName={pc.name}
                          className={pc.class}
                          fallbackAvatarUrl={pc.avatar_url}
                          avatarDisplay={pc.avatar_display}
                          isDummy={pc.isSessionDummy}
                          isGm={isGM}
                          density={compact ? "compact" : "full"}
                          canInteract={
                            canInteractAvatar && (pid === userId || isGM)
                          }
                          canControlWebcam={
                            !pc.isSessionDummy && (pid === userId || isGM)
                          }
                          isCameraOwner={
                            Boolean(userId) &&
                            pid === userId &&
                            !pc.isSessionDummy
                          }
                          showDnd5eSheet={showDnd5eSheet}
                          battlemapActive={battlemapActive}
                          onStartTokenPlacement={
                            battlemapActive &&
                            !pc.isSessionDummy &&
                            (isGM || !battlemapMovementPaused)
                              ? () => onStartTokenPlacement(pc.id, pc.name)
                              : undefined
                          }
                          battlemapToken={(() => {
                            const t = battlemapTokens.find(
                              (tok) => tok.character_id === pc.id,
                            );
                            if (!t) return null;
                            return {
                              id: t.id,
                              showHpBar: t.show_hp_bar === true,
                              sizeCells: t.size_cells,
                            };
                          })()}
                          onBattlemapTokenSaved={onBattlemapTokensChanged}
                          combatMode={isCombatMode}
                          canJoinCombat={
                            !pc.isSessionDummy &&
                            !combatParticipantNames.has(pc.name)
                          }
                          onJoinCombat={
                            isGM && isCombatMode && !pc.isSessionDummy
                              ? () => onJoinCombat(pc)
                              : undefined
                          }
                        />
                      </div>
                      {handRaise ? (
                        <span
                          title={handRaise.urgent ? "Dringend gemeldet" : "Meldet sich"}
                          className={`absolute left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-full border shadow-lg ${
                            compact ? "top-2 px-1.5 py-0.5" : "top-4 px-2 py-1"
                          } ${
                            handRaise.urgent
                              ? "border-accent-gold bg-accent-blood/90 text-accent-gold"
                              : "bg-background-dark/90"
                          }`}
                          style={
                            handRaise.urgent
                              ? undefined
                              : {
                                  borderColor: playerColor,
                                  color: playerColor,
                                }
                          }
                        >
                          <Hand className={compact ? "h-3 w-3" : "h-4 w-4"} />
                          {handRaise.urgent ? (
                            <span className="font-barlow text-[10px] font-bold">!</span>
                          ) : null}
                        </span>
                      ) : null}
                      {isScribe && (
                        <span
                          title="Chronist"
                          className={`absolute z-20 text-accent-gold drop-shadow-[0_0_6px_rgba(202,185,38,0.9)] ${
                            compact
                              ? "right-3 top-3 text-sm"
                              : "right-7 top-6 text-xl"
                          }`}
                        >
                          🪶
                        </span>
                      )}
                      {isGM && pid ? (
                        <button
                          type="button"
                          onClick={() => onAssignScribe(isScribe ? null : pid)}
                          className={`absolute z-30 rounded-full border transition-colors ${
                            compact ? "right-2 top-2 p-1 text-[10px]" : "right-6 top-6 p-2 text-sm"
                          } ${
                            isScribe
                              ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                              : "border-amber-900/60 bg-background-dark/85 text-gray-300 hover:text-accent-gold"
                          }`}
                          title={isScribe ? "Chronist entfernen" : "Als Chronist setzen"}
                          aria-label={
                            isScribe ? "Chronist entfernen" : "Als Chronist setzen"
                          }
                        >
                          <Feather className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                        </button>
                      ) : null}
                      {canOpenInventory ? (
                        <button
                          type="button"
                          onClick={() => onOpenInventory(pc)}
                          className={`absolute z-20 cursor-pointer transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-gold ${
                            compact ? "-left-3 top-[38px]" : "-left-8 top-[70px]"
                          }`}
                          title={`Rucksack von ${pc.name} öffnen`}
                          aria-label={`Rucksack von ${pc.name} öffnen`}
                        >
                          <Image
                            src="/images/Session_ui/rucksack.webp"
                            alt=""
                            width={compact ? 40 : 88}
                            height={compact ? 40 : 88}
                            className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.85)]"
                          />
                        </button>
                      ) : null}
                      {!pc.isSessionDummy ? (
                        <PartyTrayExhaustionBadge
                          characterId={pc.id}
                          compact={compact}
                        />
                      ) : null}
                      <div
                        className={`absolute inset-x-1 z-40 px-1 text-center leading-none ${
                          compact ? "bottom-0.5" : "bottom-1"
                        }`}
                      >
                        <p
                          className={`truncate font-barlow font-bold uppercase tracking-wide drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)] ${
                            compact ? "text-[9px]" : "text-[11px]"
                          }`}
                          style={{ color: playerColor }}
                          title={`${pc.name} ( ${pc.level || 1} )`}
                        >
                          {pc.name}{" "}
                          <span className="font-semibold text-accent-gold">
                            ( {pc.level || 1} )
                          </span>
                        </p>
                        {!compact && pc.isSessionDummy ? (
                          <p className="mt-0.5 font-libre text-[9px] leading-none text-gray-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)]">
                            Platzhalter
                          </p>
                        ) : null}
                        {!compact && pid && !self && !onDeck ? (
                          <p className="mt-0.5 font-libre text-[9px] leading-none text-amber-300/90">
                            Nicht online
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
