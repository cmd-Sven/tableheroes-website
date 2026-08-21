"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import type { SessionBattlemapTrap } from "@/src/lib/session/battlemap-types";
import { resolveBattlemapTrapTrigger } from "@/src/lib/actions/battlemap-trap-actions";
import { addCharacterActiveCondition } from "@/src/app/dashboard/campaigns/[id]/character-state-actions";
import { getLiveSessionAvatarStatus } from "@/src/lib/actions/live-session-avatar-actions";
import {
  getConditionLabel,
  parseTrapStatusEffect,
} from "@/src/lib/characters/condition-tokens";
import { dispatchCharacterDisplayChanged } from "@/src/lib/session/character-radial-bridge";

type Props = {
  open: boolean;
  trap: SessionBattlemapTrap | null;
  characterName: string;
  characterId: string;
  campaignId: string;
  passivePerception: number;
  isGm: boolean;
  sessionId: string;
  onClose: () => void;
  onRequestSaveRoll?: (ability: string, dc: number) => void;
  onRequestDamageRoll?: (formula: string, damageType: string) => void;
};

export function TrapTriggerModal({
  open,
  trap,
  characterName,
  characterId,
  campaignId,
  passivePerception,
  isGm,
  sessionId,
  onClose,
  onRequestSaveRoll,
  onRequestDamageRoll,
}: Props) {
  const [pending, startTransition] = useTransition();

  if (!open || !trap) return null;

  const statusEffect = parseTrapStatusEffect(trap.status_effect);
  const statusLabel = statusEffect
    ? getConditionLabel("de", statusEffect)
    : null;

  function resume() {
    startTransition(async () => {
      try {
        await resolveBattlemapTrapTrigger({
          sessionId,
          trapId: trap!.id,
          resumeMovement: true,
        });
        toast.success("Bewegung fortgesetzt.");
        onClose();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Bewegung konnte nicht freigegeben werden.",
        );
      }
    });
  }

  /** Fehlgeschlagener Save → bestehenden Zustands-/Avatar-Pfad nutzen. */
  function applyFailedSaveCondition() {
    if (!statusEffect || !characterId || !campaignId) {
      toast.message("Diese Falle hat keinen Status-Effekt hinterlegt.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await addCharacterActiveCondition({
          campaignId,
          characterId,
          conditionKey: statusEffect,
        });
        if (!result.success) {
          toast.error(result.error ?? "Zustand konnte nicht gesetzt werden.");
          return;
        }

        const status = await getLiveSessionAvatarStatus(characterId);
        const moodTokenUrls: Record<string, string> = {};
        for (const [k, v] of Object.entries(status.moodTokenUrls ?? {})) {
          if (v?.trim()) moodTokenUrls[k] = v.trim();
        }
        dispatchCharacterDisplayChanged({
          characterId,
          snapshot: {
            url: status.displayAvatarUrl,
            activeConditions: status.activeConditions ?? [],
            hpCurrent: status.hpCurrent,
            hpMax: status.hpMax,
            moodTokenUrls,
          },
        });

        toast.success(
          `${characterName}: ${getConditionLabel("de", statusEffect)} gesetzt.`,
        );
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Zustand konnte nicht gesetzt werden.",
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md overflow-hidden rounded-xl border border-red-700/60 bg-background-card shadow-2xl"
        role="alertdialog"
        aria-labelledby="trap-trigger-title"
      >
        <div className="flex items-start gap-3 border-b border-red-900/50 bg-red-950/40 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-300" />
          <div className="min-w-0 flex-1">
            <h2
              id="trap-trigger-title"
              className="font-barlow text-lg font-bold uppercase tracking-wide text-red-200"
            >
              Falle ausgelöst!
            </h2>
            <p className="font-libre text-sm text-gray-300">
              <span className="text-white">{characterName}</span> (Passive Wahrnehmung{" "}
              {passivePerception}) unterliegt Detection DC {trap.detection_dc}.
            </p>
          </div>
          {isGm ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:text-white"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="font-cinzel text-base font-bold text-accent-gold">
              {trap.name}
            </h3>
            {trap.description ? (
              <p className="mt-1 font-libre text-sm leading-relaxed text-gray-200">
                {trap.description}
              </p>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-2 font-barlow text-xs uppercase tracking-wide text-gray-400">
            <div>
              <dt>Schaden</dt>
              <dd className="text-sm font-bold normal-case text-red-200">
                {trap.damage} {trap.damage_type}
              </dd>
            </div>
            <div>
              <dt>Rettungswurf</dt>
              <dd className="text-sm font-bold normal-case text-amber-200">
                {(trap.save_ability ?? "dex").toUpperCase()} DC{" "}
                {trap.save_dc ?? trap.detection_dc}
              </dd>
            </div>
            {statusLabel ? (
              <div className="col-span-2">
                <dt>Status-Effekt bei Fail</dt>
                <dd className="text-sm font-bold normal-case text-emerald-200">
                  {statusLabel}
                </dd>
              </div>
            ) : null}
            {trap.is_area_effect ? (
              <div className="col-span-2">
                <dt>Effekt-AoE (nach Auslösen)</dt>
                <dd className="text-sm font-bold normal-case text-orange-200">
                  {trap.effect_shape} · Radius {trap.effect_radius} Felder ·
                  Trigger war Zelle {trap.grid_x},{trap.grid_y}
                </dd>
              </div>
            ) : null}
          </dl>

          <p className="rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 font-libre text-xs text-amber-100/90">
            Bewegung ist pausiert (movementLocked), bis der SL den Vorfall auflöst.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-red-900/40 px-4 py-3">
          {isGm && onRequestSaveRoll && trap.save_ability ? (
            <button
              type="button"
              onClick={() =>
                onRequestSaveRoll(
                  trap.save_ability!,
                  trap.save_dc ?? trap.detection_dc,
                )
              }
              className="rounded border border-amber-600/60 bg-amber-950/40 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-amber-200"
            >
              Rettungswurf
            </button>
          ) : null}
          {isGm && statusEffect ? (
            <button
              type="button"
              disabled={pending}
              onClick={applyFailedSaveCondition}
              className="rounded border border-emerald-600/60 bg-emerald-950/40 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-emerald-200 disabled:opacity-50"
            >
              Save fehlgeschlagen → {statusLabel}
            </button>
          ) : null}
          {isGm && onRequestDamageRoll ? (
            <button
              type="button"
              onClick={() =>
                onRequestDamageRoll(trap.damage, trap.damage_type)
              }
              className="rounded border border-red-600/60 bg-red-950/50 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-red-200"
            >
              Schaden würfeln
            </button>
          ) : null}
          {isGm ? (
            <button
              type="button"
              disabled={pending}
              onClick={resume}
              className="rounded border border-hero-vibrant bg-hero-vibrant/20 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-50"
            >
              Auflösen & Bewegung freigeben
            </button>
          ) : (
            <span className="font-libre text-xs text-gray-500">
              Warte auf den Spielleiter…
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
