"use client";

/**
 * LiveSessionActivityPanel — Session chat, hand raises, and combat-request resolve UI.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Eraser, Hand, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import {
  appendSessionActivity,
  clearSessionActivity,
  deleteSessionActivityEntry,
  resolveCombatRequest,
  type SessionActivityEntry,
} from "@/src/lib/actions/session-activity-actions";
import {
  lowerSessionHand,
  raiseSessionHand,
} from "@/src/lib/actions/session-hand-raise-actions";
import type { SessionHandRaise } from "@/src/lib/session/hand-raises";
import {
  dispatchAvatarSpeechBubble,
  truncateSpeechBubbleText,
} from "@/src/lib/session/avatar-speech-bubble";
import { useDiceRevealVersion } from "@/src/lib/session/dice-reveal-store";
import {
  GM_DICE_ROLLER_ID,
  GM_DICE_ROLLER_NAME,
} from "@/src/lib/session/dice-skins";
import { useLiveSessionDiceRoll } from "@/src/components/session/useLiveSessionDiceRoll";
import { ActivityComposer } from "@/src/components/session/activity/ActivityComposer";
import { ActivityLogEntry } from "@/src/components/session/activity/ActivityLogEntry";

const ACTIVITY_TYPES = new Set([
  "dice",
  "player_action",
  "attack_pending",
  "attack_hit",
  "attack_miss",
  "skill_check",
  "fap_skill_request",
  "saving_throw",
  "damage_roll",
  // Legacy / alternate type strings from older clients
  "chat",
  "message",
  "roll",
  "attack",
]);

type Props = {
  sessionId: string;
  campaignId: string;
  isGM: boolean;
  isPrepMode?: boolean;
  open: boolean;
  /** Legacy: freistehender Toggle-Button. Side-Rail nutzt `embedded` + `onClose`. */
  onToggle?: () => void;
  embedded?: boolean;
  onClose?: () => void;
  logs: SessionActivityEntry[];
  currentCharacter: { id: string; name: string } | null;
  prepTestCharacters?: { id: string; name: string }[];
  prepTestCharacterId?: string | null;
  onPrepTestCharacterChange?: (id: string) => void;
  onActivityPosted?: (entry: SessionActivityEntry) => void;
  onActivityCleared?: () => void;
  onActivityDeleted?: (entryId: string) => void;
  handRaises?: SessionHandRaise[];
  currentUserId?: string | null;
  playerColorByCharacterId?: Record<string, string>;
  onHandRaisesChanged?: (raises: SessionHandRaise[] | "refresh") => void;
};

export function LiveSessionActivityPanel({
  sessionId,
  campaignId,
  isGM,
  isPrepMode = false,
  open,
  onToggle,
  embedded = false,
  onClose,
  logs,
  currentCharacter,
  prepTestCharacters,
  prepTestCharacterId,
  onPrepTestCharacterChange,
  onActivityPosted,
  onActivityCleared,
  onActivityDeleted,
  handRaises = [],
  currentUserId = null,
  playerColorByCharacterId = {},
  onHandRaisesChanged,
}: Props) {
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  useDiceRevealVersion();

  const roller = useMemo(() => {
    if (currentCharacter) return currentCharacter;
    if (isGM) return { id: GM_DICE_ROLLER_ID, name: GM_DICE_ROLLER_NAME };
    return null;
  }, [currentCharacter, isGM]);

  const { rollFromCommand, handleDamageRoll } = useLiveSessionDiceRoll({
    sessionId,
    campaignId,
    currentCharacter,
    roller,
    active: open,
    activityLogs: logs,
    onActivityPosted,
    userId: currentUserId,
    isGM,
  });

  const myHandRaise = useMemo(
    () => (currentUserId ? handRaises.find((r) => r.userId === currentUserId) ?? null : null),
    [handRaises, currentUserId],
  );

  const activityLogs = useMemo(
    () =>
      logs
        .filter((l) => {
          const type = String(l.type ?? "");
          if (ACTIVITY_TYPES.has(type)) return true;
          // Fallback: Text-Nachrichten ohne bekannten Typ trotzdem anzeigen
          return Boolean(l.text?.trim()) && type !== "system" && type !== "journal";
        })
        .slice(-80),
    [logs],
  );

  const rolledDamageForRequest = useMemo(() => {
    const set = new Set<string>();
    for (const log of activityLogs) {
      if (log.type === "damage_roll" && log.meta?.requestId) {
        set.add(String(log.meta.requestId));
      }
    }
    return set;
  }, [activityLogs]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activityLogs.length, open]);

  function postActivity(
    type: string,
    text: string,
    meta?: Record<string, unknown>,
    opts?: { speechKind?: "dice" | "chat"; speechText?: string },
  ) {
    const characterId = currentCharacter?.id;
    startTransition(async () => {
      try {
        const entry = await appendSessionActivity({
          sessionId,
          type,
          text,
          characterId,
          characterName: currentCharacter?.name,
          meta,
        });
        if (!entry) return;
        onActivityPosted?.(entry);
        if (characterId && opts?.speechKind && opts.speechText) {
          dispatchAvatarSpeechBubble({
            characterId,
            kind: opts.speechKind,
            text: opts.speechText,
            sourceId: entry.id,
          });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Eintrag fehlgeschlagen.");
      }
    });
  }

  function handleClearChat() {
    if (!isGM) return;
    if (!window.confirm("Gesamten Session-Chat wirklich leeren?")) return;
    startTransition(async () => {
      try {
        await clearSessionActivity(sessionId);
        onActivityCleared?.();
        toast.success("Chat geleert.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Chat konnte nicht geleert werden.");
      }
    });
  }

  function handleDeleteEntry(entryId: string) {
    if (!isGM) return;
    startTransition(async () => {
      try {
        await deleteSessionActivityEntry(sessionId, entryId);
        onActivityDeleted?.(entryId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Nachricht konnte nicht gelöscht werden.");
      }
    });
  }

  function handleRaiseHand(urgent: boolean) {
    if (!currentCharacter && !isGM) {
      toast.error("Kein Charakter ausgewählt.");
      return;
    }
    const name = currentCharacter?.name ?? "Spielleiter";
    startTransition(async () => {
      try {
        const entry = await raiseSessionHand({
          sessionId,
          urgent,
          displayName: name,
          characterId: currentCharacter?.id,
        });
        onHandRaisesChanged?.([
          ...handRaises.filter((r) => r.userId !== entry.userId),
          entry,
        ].sort((a, b) => a.at.localeCompare(b.at)));
        if (currentCharacter?.id) {
          dispatchAvatarSpeechBubble({
            characterId: currentCharacter.id,
            kind: "chat",
            text: urgent ? "✋ Dringend!" : "✋ Meldet sich",
            sourceId: `hand-${entry.id}`,
          });
        }
        toast.success(urgent ? "Dringend gemeldet." : "Hand gehoben.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Meldung fehlgeschlagen.");
      }
    });
  }

  function handleLowerHand() {
    startTransition(async () => {
      try {
        await lowerSessionHand(sessionId);
        onHandRaisesChanged?.(
          currentUserId ? handRaises.filter((r) => r.userId !== currentUserId) : handRaises,
        );
        toast.success("Meldung zurückgenommen.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Zurücknehmen fehlgeschlagen.");
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    // Spieler brauchen einen Charakter; GM darf auch ohne (als Spielleiter) chatten.
    if (!trimmed || (!currentCharacter && !isGM)) return;

    if (rollFromCommand(trimmed)) {
      setInput("");
      return;
    }

    const speaker = currentCharacter?.name ?? (isGM ? "Spielleiter" : null);
    if (!speaker) return;

    postActivity("player_action", `${speaker}: ${trimmed}`, undefined, {
      speechKind: currentCharacter ? "chat" : undefined,
      speechText: currentCharacter ? truncateSpeechBubbleText(trimmed) : undefined,
    });
    setInput("");
  }

  function resolveAttack(requestId: string, hit: boolean, critical = false) {
    startTransition(async () => {
      try {
        const entry = await resolveCombatRequest({ sessionId, requestId, hit, critical });
        onActivityPosted?.(entry);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Antwort fehlgeschlagen.");
      }
    });
  }

  const handleClose = onClose ?? onToggle;

  return (
    <>
      {!embedded ? (
        <button
          type="button"
          onClick={onToggle}
          className="fixed right-0 top-[38%] z-40 -translate-y-1/2 rounded-l-lg border border-r-0 border-amber-800/70 bg-background-card/95 px-3 py-4 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant shadow-2xl transition-colors hover:bg-emerald-950"
        >
          <MessageSquare className="mx-auto mb-1 h-4 w-4" />
          {open ? "Chat zu" : "Chat"}
          {handRaises.length > 0 ? (
            <span className="mt-1 flex items-center justify-center gap-0.5 font-barlow text-[9px] text-accent-gold">
              <Hand className="h-3 w-3" />
              {handRaises.length}
            </span>
          ) : null}
        </button>
      ) : null}

      {open ? (
        <div
          className={`${
            embedded
              ? "flex h-full min-h-0 flex-col"
              : "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col"
          } border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md`}
        >
          <div className="flex items-center justify-between border-b border-amber-900/50 px-3 py-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">Session-Chat</h2>
              <p className="font-libre text-[10px] text-gray-500">
                {isPrepMode ? "Vorbereitung · Chat & Aktionen" : "Chat & Kampfprotokoll"}
              </p>
              {prepTestCharacters && prepTestCharacters.length > 0 ? (
                <select
                  value={prepTestCharacterId ?? prepTestCharacters[0]?.id ?? ""}
                  onChange={(e) => onPrepTestCharacterChange?.(e.target.value)}
                  className="mt-1 w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-[10px] text-white"
                >
                  {prepTestCharacters.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      Test als: {pc.name}
                    </option>
                  ))}
                </select>
              ) : currentCharacter ? (
                <p className="mt-0.5 truncate font-libre text-[10px] text-gray-400">{currentCharacter.name}</p>
              ) : null}
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-1">
              {isGM ? (
                <button
                  type="button"
                  disabled={pending || activityLogs.length === 0}
                  onClick={handleClearChat}
                  title="Chat leeren"
                  aria-label="Chat leeren"
                  className="rounded p-1 text-gray-500 hover:bg-red-950/40 hover:text-red-300 disabled:opacity-40"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleClose}
                className="rounded p-1 text-gray-400 hover:text-white"
                aria-label="Chat schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {activityLogs.length === 0 ? (
              <p className="font-libre text-xs text-gray-500 italic">Noch keine Aktivität.</p>
            ) : (
              activityLogs.map((entry) => (
                <ActivityLogEntry
                  key={entry.id}
                  entry={entry}
                  isGM={isGM}
                  pending={pending}
                  currentCharacterId={currentCharacter?.id}
                  playerColorByCharacterId={playerColorByCharacterId}
                  rolledDamageForRequest={rolledDamageForRequest}
                  onDelete={handleDeleteEntry}
                  onResolveAttack={resolveAttack}
                  onDamageRoll={handleDamageRoll}
                />
              ))
            )}
          </div>

          <ActivityComposer
            pending={pending}
            myHandRaise={myHandRaise}
            canRaiseHand={Boolean(currentCharacter || isGM)}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            onRaiseHand={handleRaiseHand}
            onLowerHand={handleLowerHand}
            canSubmit={Boolean(input.trim() && (currentCharacter || isGM) && !pending)}
          />
        </div>
      ) : null}
    </>
  );
}
