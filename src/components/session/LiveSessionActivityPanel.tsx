"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Eraser, Hand, MessageSquare, Send, Trash2, X } from "lucide-react";
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
  FALLBACK_PLAYER_COLOR,
} from "@/src/lib/session/class-player-color";
import {
  dispatchAvatarSpeechBubble,
  truncateSpeechBubbleText,
} from "@/src/lib/session/avatar-speech-bubble";
import {
  formatPendingDiceChatText,
  isDiceAnimMeta,
} from "@/src/lib/session/dice-animation";
import { isDiceEntryRevealed, useDiceRevealVersion } from "@/src/lib/session/dice-reveal-store";
import { useLiveSessionDiceRoll } from "@/src/components/session/useLiveSessionDiceRoll";

const ACTIVITY_TYPES = new Set([
  "dice",
  "player_action",
  "attack_pending",
  "attack_hit",
  "attack_miss",
  "skill_check",
  "saving_throw",
  "damage_roll",
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

  const { rollFromCommand, handleDamageRoll } = useLiveSessionDiceRoll({
    sessionId,
    campaignId,
    currentCharacter,
    active: open,
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
      logs.filter((l) => ACTIVITY_TYPES.has(String(l.type ?? ""))).slice(-80),
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
    if (!trimmed || !currentCharacter) return;

    if (rollFromCommand(trimmed)) {
      setInput("");
      return;
    }

    postActivity("player_action", `${currentCharacter.name}: ${trimmed}`, undefined, {
      speechKind: "chat",
      speechText: truncateSpeechBubbleText(trimmed),
    });
    setInput("");
  }

  function resolveAttack(requestId: string, hit: boolean, critical = false) {
    startTransition(async () => {
      try {
        await resolveCombatRequest({ sessionId, requestId, hit, critical });
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
              activityLogs.map((entry) => {
                const meta = entry.meta as {
                  isCritical?: boolean;
                  isFumble?: boolean;
                  pending?: boolean;
                  awaitsDamageRoll?: boolean;
                  damage?: string;
                  critical?: boolean;
                  requestId?: string;
                  weaponName?: string;
                  animate?: boolean;
                  label?: string;
                  formula?: string;
                  sides?: number;
                } | undefined;
                const revealed = isDiceEntryRevealed(entry);
                const animating = Boolean(meta?.animate) && !revealed;
                const isCrit = revealed && (meta?.isCritical || meta?.critical);
                const isFumble = revealed && meta?.isFumble;
                const requestId = meta?.requestId ?? entry.id;
                const showDamageBtn =
                  revealed &&
                  entry.type === "attack_hit" &&
                  meta?.awaitsDamageRoll &&
                  entry.character_id === currentCharacter?.id &&
                  !rolledDamageForRequest.has(requestId);
                const displayText =
                  animating && isDiceAnimMeta(meta)
                    ? formatPendingDiceChatText(entry.author_name ?? "Spieler", meta)
                    : entry.text;

                return (
                  <div
                    key={entry.id}
                    className={`group relative rounded border px-2 py-1.5 ${
                      isCrit
                        ? "border-accent-gold/70 bg-accent-gold/10"
                        : isFumble
                          ? "border-red-500/60 bg-red-950/30"
                          : animating
                            ? "border-accent-gold/40 bg-accent-gold/5"
                            : "border-hero-border/30 bg-hero-dark/25"
                    }`}
                    style={
                      !isCrit && !isFumble && !animating && entry.character_id
                        ? {
                            borderLeftWidth: 3,
                            borderLeftColor:
                              playerColorByCharacterId[entry.character_id] ??
                              FALLBACK_PLAYER_COLOR,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-libre text-[10px] text-gray-500">
                        {new Date(entry.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        {entry.author_name ? (
                          <>
                            {" · "}
                            <span
                              style={{
                                color: entry.character_id
                                  ? playerColorByCharacterId[entry.character_id] ??
                                    FALLBACK_PLAYER_COLOR
                                  : undefined,
                              }}
                            >
                              {entry.author_name}
                            </span>
                          </>
                        ) : null}
                      </p>
                      {isGM ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleDeleteEntry(entry.id)}
                          title="Nachricht löschen"
                          aria-label="Nachricht löschen"
                          className="shrink-0 rounded p-0.5 text-gray-600 opacity-70 hover:bg-red-950/50 hover:text-red-300 group-hover:opacity-100 disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                    <p
                      className={`font-libre text-xs leading-snug ${
                        isCrit
                          ? "text-accent-gold font-bold"
                          : isFumble
                            ? "text-red-300"
                            : animating
                              ? "text-accent-gold italic"
                              : "text-gray-200"
                      }`}
                    >
                      {isCrit && entry.type !== "damage_roll" ? "⚡ KRITISCH! " : ""}
                      {isFumble ? "💀 Patzer! " : ""}
                      {displayText}
                    </p>
                    {isGM && revealed && entry.type === "attack_pending" ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => resolveAttack(entry.id, true, Boolean(meta?.isCritical))}
                          className="rounded border border-hero-vibrant px-2 py-0.5 font-barlow text-[9px] uppercase text-hero-vibrant"
                        >
                          Trifft
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => resolveAttack(entry.id, true, true)}
                          className="rounded border border-accent-gold px-2 py-0.5 font-barlow text-[9px] uppercase text-accent-gold"
                        >
                          Kritisch
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => resolveAttack(entry.id, false)}
                          className="rounded border border-red-500/60 px-2 py-0.5 font-barlow text-[9px] uppercase text-red-300"
                        >
                          Verfehlt
                        </button>
                      </div>
                    ) : null}
                    {showDamageBtn ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          handleDamageRoll(meta?.damage, Boolean(meta?.critical), requestId, meta?.weaponName)
                        }
                        className="mt-1.5 w-full rounded border border-accent-blood/50 bg-accent-blood/15 px-2 py-1 font-barlow text-[9px] font-bold uppercase text-accent-blood"
                      >
                        Schaden würfeln ({meta?.damage ?? "?"})
                        {meta?.critical ? " · doppelte Würfel" : ""}
                      </button>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="shrink-0 border-t border-amber-900/50 p-3 space-y-2">
            <div className="flex gap-1">
              {myHandRaise ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleLowerHand}
                  className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 font-barlow text-[10px] font-bold uppercase disabled:opacity-40 ${
                    myHandRaise.urgent
                      ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                      : "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                  }`}
                >
                  <Hand className="h-3.5 w-3.5" />
                  Zurücknehmen
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={pending || (!currentCharacter && !isGM)}
                    onClick={() => handleRaiseHand(false)}
                    title="Hand heben"
                    className="flex flex-1 items-center justify-center gap-1 rounded border border-hero-border/60 bg-hero-dark/50 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-200 hover:border-hero-vibrant hover:text-hero-vibrant disabled:opacity-40"
                  >
                    <Hand className="h-3.5 w-3.5" />
                    Melden
                  </button>
                  <button
                    type="button"
                    disabled={pending || (!currentCharacter && !isGM)}
                    onClick={() => handleRaiseHand(true)}
                    title="Dringend melden"
                    className="flex flex-1 items-center justify-center gap-1 rounded border border-accent-blood/60 bg-accent-blood/15 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-blood/25 disabled:opacity-40"
                  >
                    <Hand className="h-3.5 w-3.5" />
                    <AlertTriangle className="h-3 w-3" />
                    Dringend
                  </button>
                </>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nachricht oder 2d6+3"
                className="min-w-0 flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-xs text-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || !currentCharacter || pending}
                className="rounded bg-hero-vibrant px-2 text-black disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
