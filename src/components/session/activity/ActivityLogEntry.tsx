/**
 * ActivityLogEntry — Single session-chat / combat-log row with GM resolve and damage actions.
 */
"use client";

import { Trash2 } from "lucide-react";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";
import { FALLBACK_PLAYER_COLOR } from "@/src/lib/session/class-player-color";
import {
  formatPendingDiceChatText,
  isDiceAnimMeta,
} from "@/src/lib/session/dice-animation";
import { isDiceEntryRevealed } from "@/src/lib/session/dice-reveal-store";

type EntryMeta = {
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
  spellCast?: boolean;
  spellName?: string;
  spellLevelLabel?: string;
  castingTime?: string;
  range?: string;
  spellDescription?: string;
};

type Props = {
  entry: SessionActivityEntry;
  isGM: boolean;
  pending: boolean;
  currentCharacterId?: string | null;
  playerColorByCharacterId: Record<string, string>;
  rolledDamageForRequest: Set<string>;
  onDelete: (entryId: string) => void;
  onResolveAttack: (requestId: string, hit: boolean, critical?: boolean) => void;
  onDamageRoll: (
    damage: string | undefined,
    critical: boolean,
    requestId: string,
    weaponName: string | undefined,
  ) => void;
};

export function ActivityLogEntry({
  entry,
  isGM,
  pending,
  currentCharacterId,
  playerColorByCharacterId,
  rolledDamageForRequest,
  onDelete,
  onResolveAttack,
  onDamageRoll,
}: Props) {
  const meta = entry.meta as EntryMeta | undefined;
  const revealed = isDiceEntryRevealed(entry);
  const animating = Boolean(meta?.animate) && !revealed;
  const isCrit = revealed && (meta?.isCritical || meta?.critical);
  const isFumble = revealed && meta?.isFumble;
  const requestId = meta?.requestId ?? entry.id;
  const showDamageBtn =
    revealed &&
    entry.type === "attack_hit" &&
    meta?.awaitsDamageRoll &&
    entry.character_id === currentCharacterId &&
    !rolledDamageForRequest.has(requestId);
  const displayText =
    animating && isDiceAnimMeta(meta)
      ? formatPendingDiceChatText(entry.author_name ?? "Spieler", meta)
      : entry.text;
  const spellMeta =
    meta?.spellCast === true
      ? {
          levelLabel: meta.spellLevelLabel?.trim() || null,
          castingTime: meta.castingTime?.trim() || null,
          range: meta.range?.trim() || null,
          description: meta.spellDescription?.trim() || null,
        }
      : null;
  const spellDetails = [spellMeta?.levelLabel, spellMeta?.castingTime, spellMeta?.range].filter(
    Boolean,
  );

  return (
    <div
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
                playerColorByCharacterId[entry.character_id] ?? FALLBACK_PLAYER_COLOR,
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-libre text-[10px] text-gray-500">
          {new Date(entry.at).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
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
            onClick={() => onDelete(entry.id)}
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
      {spellMeta && spellDetails.length > 0 ? (
        <p className="mt-1 font-libre text-[10px] text-gray-500">{spellDetails.join(" · ")}</p>
      ) : null}
      {spellMeta?.description ? (
        <p className="mt-1 font-libre text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap">
          {spellMeta.description}
        </p>
      ) : null}
      {isGM && revealed && entry.type === "attack_pending" ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => onResolveAttack(entry.id, true, Boolean(meta?.isCritical))}
            className="rounded border border-hero-vibrant px-2 py-0.5 font-barlow text-[9px] uppercase text-hero-vibrant"
          >
            Trifft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onResolveAttack(entry.id, true, true)}
            className="rounded border border-accent-gold px-2 py-0.5 font-barlow text-[9px] uppercase text-accent-gold"
          >
            Kritisch
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onResolveAttack(entry.id, false)}
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
            onDamageRoll(meta?.damage, Boolean(meta?.critical), requestId, meta?.weaponName)
          }
          className={`mt-1.5 w-full rounded border px-2 py-1 font-barlow text-[9px] font-bold uppercase ${
            meta?.critical
              ? "border-accent-gold/70 bg-accent-gold/15 text-accent-gold"
              : "border-accent-blood/50 bg-accent-blood/15 text-accent-blood"
          }`}
        >
          {meta?.critical ? "Crit Schaden" : "Schaden"} würfeln ({meta?.damage ?? "?"})
          {meta?.critical ? " · doppelte Würfel" : ""}
        </button>
      ) : null}
    </div>
  );
}
