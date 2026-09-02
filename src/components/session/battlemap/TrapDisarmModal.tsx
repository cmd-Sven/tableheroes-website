"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Dices, Package, ShieldCheck, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import type { SessionBattlemapTrap } from "@/src/lib/session/battlemap-types";
import {
  claimTrapDisarmLoot,
  closeTrapDisarmSession,
  confirmTrapDisarm,
  getTrapDisarmCharacterStats,
  openTrapDisarmSession,
  submitTrapDisarmAttempt,
  updateTrapDisarmDraft,
  type TrapDisarmCharacterStats,
  type TrapDisarmLootItem,
} from "@/src/lib/actions/battlemap-trap-actions";
import {
  isMagicalTrap,
  isMechanicalTrap,
  resolveTrapDisarmRollMode,
  trapComponents,
  trapDisarmDc,
  trapDisarmPending,
  type TrapDisarmRollKind,
  type TrapDisarmRollResult,
} from "@/src/lib/session/battlemap-trap-model";
import {
  executeDiceRoll,
} from "@/src/lib/session/dice-roll";
import { requestLiveDiceRoll } from "@/src/lib/actions/session-dice-actions";
import {
  closeContainerTrapDisarmSession,
  confirmContainerTrapDisarm,
  openContainerTrapDisarmSession,
  submitContainerTrapDisarmAttempt,
  updateContainerTrapDisarmDraft,
} from "@/src/lib/actions/battlemap-container-actions";
import type { SessionBattlemapContainer } from "@/src/lib/session/battlemap-types";
import { containerToVirtualTrap } from "@/src/lib/session/battlemap-container-model";

type Props = {
  open: boolean;
  trap: SessionBattlemapTrap | null;
  sessionId: string;
  characterId: string | null;
  ownCharacterId?: string | null;
  isGm: boolean;
  onClose: () => void;
  onTrapUpdated: (trap: SessionBattlemapTrap) => void;
  /** Falle in Container — Actions auf Container-Tabelle */
  sourceContainerId?: string | null;
  onContainerUpdated?: (container: SessionBattlemapContainer) => void;
};

type DraftState = {
  investigate: boolean;
  trapMasteryDex: boolean;
  hasThievesTools: boolean;
  thievesToolsProficient: boolean;
  sleightProficient: boolean;
  sleightExpertise: boolean;
  investigationSuccess: boolean | null;
  disarmSuccess: boolean | null;
  investigationRoll: TrapDisarmRollResult | null;
  disarmRoll: TrapDisarmRollResult | null;
  gmTakeover: boolean;
};

function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

function RollResultBanner({ roll }: { roll: TrapDisarmRollResult }) {
  const modeLabel =
    roll.mode === "advantage" ? "Vorteil" : roll.mode === "disadvantage" ? "Nachteil" : null;
  return (
    <div
      className={`mt-2 rounded-md border px-3 py-2 font-libre text-xs ${
        roll.success
          ? "border-emerald-600/50 bg-emerald-950/30 text-emerald-100"
          : "border-red-600/50 bg-red-950/30 text-red-100"
      }`}
    >
      <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
        {roll.label}
        {modeLabel ? ` · ${modeLabel}` : ""}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{roll.display}</p>
      <p className="mt-0.5 text-[11px]">
        SG {roll.dc} —{" "}
        <span className={roll.success ? "text-emerald-200" : "text-red-200"}>
          {roll.success ? "Erfolg" : "Misserfolg"}
        </span>
        {roll.isCritical ? " · Natürliche 20" : roll.isFumble ? " · Natürliche 1" : ""}
      </p>
    </div>
  );
}

function LootCard({ item }: { item: TrapDisarmLootItem }) {
  return (
    <div className="rounded-md border border-hero-border/50 bg-slate-900/80 p-3">
      <div className="flex items-start gap-2">
        <Package className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" />
        <div className="min-w-0">
          <p className="font-barlow text-sm font-bold text-white">{item.name}</p>
          {item.description ? (
            <p className="mt-1 font-libre text-xs leading-relaxed text-gray-400">
              {item.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function draftFromPending(
  pending: NonNullable<ReturnType<typeof trapDisarmPending>>,
): DraftState {
  return {
    investigate: pending.investigate,
    trapMasteryDex: pending.trapMasteryDex,
    hasThievesTools: pending.hasThievesTools,
    thievesToolsProficient: pending.thievesToolsProficient,
    sleightProficient: pending.sleightProficient,
    sleightExpertise: pending.sleightExpertise,
    investigationSuccess: pending.investigationSuccess ?? null,
    disarmSuccess: pending.disarmSuccess ?? null,
    investigationRoll: pending.investigationRoll ?? null,
    disarmRoll: pending.disarmRoll ?? null,
    gmTakeover: pending.gmTakeover === true,
  };
}

export function TrapDisarmModal({
  open,
  trap,
  sessionId,
  characterId,
  ownCharacterId,
  isGm,
  onClose,
  onTrapUpdated,
  sourceContainerId = null,
  onContainerUpdated,
}: Props) {
  const notifyContainerUpdate = useCallback(
    (container: SessionBattlemapContainer) => {
      onContainerUpdated?.(container);
      const virtual = containerToVirtualTrap(container);
      if (virtual) onTrapUpdated(virtual);
    },
    [onContainerUpdated, onTrapUpdated],
  );
  const [pending, startTransition] = useTransition();
  const [stats, setStats] = useState<TrapDisarmCharacterStats | null>(null);
  const [draft, setDraft] = useState<DraftState>({
    investigate: false,
    trapMasteryDex: false,
    hasThievesTools: true,
    thievesToolsProficient: false,
    sleightProficient: false,
    sleightExpertise: false,
    investigationSuccess: null,
    disarmSuccess: null,
    investigationRoll: null,
    disarmRoll: null,
    gmTakeover: false,
  });
  const [loot, setLoot] = useState<{
    items: TrapDisarmLootItem[];
    recipeScroll: TrapDisarmLootItem | null;
  } | null>(null);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionOpenedRef = useRef<string | null>(null);
  const skipNextSyncRef = useRef(false);

  const disarmPending = trap ? trapDisarmPending(trap) : null;
  const components = trap ? trapComponents(trap) : [];
  const mechanical = trap ? isMechanicalTrap(trap) : true;
  const magical = trap ? isMagicalTrap(trap) : false;
  const isOwner = Boolean(characterId && ownCharacterId === characterId);
  const inProgress = disarmPending?.status === "in_progress";
  const gmReview = isGm && disarmPending?.status === "player_submitted";
  const gmConfirmed = trap?.is_disarmed && disarmPending?.status === "gm_confirmed";
  const showLoot = gmConfirmed && characterId === disarmPending?.characterId;
  const gmTakeoverActive = draft.gmTakeover === true;
  const canEditForm =
    !trap?.is_disarmed &&
    disarmPending?.status !== "player_submitted" &&
    ((isOwner && !gmTakeoverActive) || (isGm && gmTakeoverActive));

  const pushDraftToServer = useCallback(
    (nextDraft: DraftState) => {
      if (!trap || !characterId) return;
      if (disarmPending && disarmPending.status !== "in_progress") return;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        startTransition(async () => {
          try {
            const updated = sourceContainerId
              ? await updateContainerTrapDisarmDraft({
                  sessionId,
                  containerId: sourceContainerId,
                  characterId,
                  draft: nextDraft,
                })
              : await updateTrapDisarmDraft({
                  sessionId,
                  trapId: trap.id,
                  characterId,
                  draft: nextDraft,
                });
            skipNextSyncRef.current = true;
            if (sourceContainerId) {
              notifyContainerUpdate(updated as SessionBattlemapContainer);
            } else {
              onTrapUpdated(updated as SessionBattlemapTrap);
            }
          } catch {
            /* optional — nächster Realtime-Sync korrigiert */
          }
        });
      }, 350);
    },
    [trap, characterId, disarmPending, sessionId, onTrapUpdated, sourceContainerId, notifyContainerUpdate],
  );

  const updateDraft = useCallback(
    (patch: Partial<DraftState>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        pushDraftToServer(next);
        return next;
      });
    },
    [pushDraftToServer],
  );

  useEffect(() => {
    if (!open || !trap || !characterId) return;
    const sessionKey = `${trap.id}:${characterId}`;
    if (sessionOpenedRef.current === sessionKey) return;
    sessionOpenedRef.current = sessionKey;

    startTransition(async () => {
      try {
        const updated = sourceContainerId
          ? await openContainerTrapDisarmSession({
              sessionId,
              containerId: sourceContainerId,
              characterId,
            })
          : await openTrapDisarmSession({
              sessionId,
              trapId: trap.id,
              characterId,
            });
        if (sourceContainerId) {
          notifyContainerUpdate(updated as SessionBattlemapContainer);
        } else {
          onTrapUpdated(updated as SessionBattlemapTrap);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Session konnte nicht geöffnet werden.");
      }
    });
  }, [open, trap, characterId, sessionId, onTrapUpdated, sourceContainerId, notifyContainerUpdate]);

  useEffect(() => {
    if (!open) {
      sessionOpenedRef.current = null;
      setLoot(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !characterId) {
      setStats(null);
      return;
    }
    void getTrapDisarmCharacterStats(characterId)
      .then((s) => {
        setStats(s);
        if (!disarmPending || disarmPending.status === "in_progress") {
          setDraft((prev) => ({
            ...prev,
            thievesToolsProficient: s.thievesToolsProficient,
            sleightProficient: s.sleightMod > s.dexMod,
            sleightExpertise: s.sleightExpertise,
            trapMasteryDex: s.hasTrapMasteryFeat,
          }));
        }
      })
      .catch(() => setStats(null));
  }, [open, characterId, disarmPending?.status]);

  useEffect(() => {
    if (!disarmPending || disarmPending.status !== "in_progress") return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    setDraft(draftFromPending(disarmPending));
  }, [disarmPending, trap?.updated_at]);

  useEffect(
    () => () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    },
    [],
  );

  const investigationMod = useMemo(() => {
    if (!stats) return 0;
    if (draft.investigate && draft.trapMasteryDex && mechanical) return stats.dexMod;
    return stats.investigationMod;
  }, [stats, draft.investigate, draft.trapMasteryDex, mechanical]);

  const disarmMod = useMemo(() => {
    if (!stats) return 0;
    let mod = stats.dexMod;
    if (draft.thievesToolsProficient) mod += stats.proficiencyBonus;
    if (draft.sleightExpertise) mod += stats.proficiencyBonus;
    else if (draft.sleightProficient && !draft.thievesToolsProficient) {
      mod += stats.proficiencyBonus;
    }
    return mod;
  }, [stats, draft.thievesToolsProficient, draft.sleightProficient, draft.sleightExpertise]);

  const disarmAdvantage = Boolean(
    mechanical &&
      draft.hasThievesTools &&
      draft.thievesToolsProficient &&
      draft.sleightProficient,
  );
  const disarmDisadvantage = !draft.hasThievesTools;
  const trapDc = trap ? trapDisarmDc(trap) : 15;

  const performInlineRoll = useCallback(
    (input: {
      kind: TrapDisarmRollKind;
      label: string;
      modifier: number;
      skillKey: "inv" | "arc" | "slt";
      advantage?: boolean;
      disadvantage?: boolean;
      onSuccessField: "investigationSuccess" | "disarmSuccess";
      rollField: "investigationRoll" | "disarmRoll";
    }) => {
      if (!canEditForm || !characterId || !stats) return;

      const mode = resolveTrapDisarmRollMode(input.advantage, input.disadvantage);
      const outcome = executeDiceRoll({ dice: 1, sides: 20, modifier: input.modifier }, mode);
      const success = outcome.total >= trapDc;

      const rollResult: TrapDisarmRollResult = {
        kind: input.kind,
        label: input.label,
        modifier: input.modifier,
        mode,
        rolls: outcome.rolls,
        usedRoll: outcome.usedRoll,
        total: outcome.total,
        isCritical: outcome.isCritical,
        isFumble: outcome.isFumble,
        display: outcome.display,
        dc: trapDc,
        success,
        rolledAt: new Date().toISOString(),
      };

      updateDraft({
        [input.onSuccessField]: success,
        [input.rollField]: rollResult,
      } as Partial<DraftState>);

      void requestLiveDiceRoll({
        sessionId,
        characterId,
        characterName: stats.characterName,
        kind: "skill",
        dice: 1,
        sides: 20,
        modifier: input.modifier,
        mode,
        label: `${input.label} (SG ${trapDc})`,
        skillKey: input.skillKey,
      }).catch(() => {
        /* Chat-Transparenz optional — Modal zeigt Ergebnis primär */
      });
    },
    [canEditForm, characterId, stats, trapDc, sessionId, updateDraft],
  );

  if (!open || !trap || !characterId) return null;

  function handleClose() {
    if (inProgress) {
      startTransition(async () => {
        try {
          const updated = sourceContainerId
            ? await closeContainerTrapDisarmSession({
                sessionId,
                containerId: sourceContainerId,
                characterId: characterId!,
              })
            : await closeTrapDisarmSession({
                sessionId,
                trapId: trap!.id,
                characterId: characterId!,
              });
          if (sourceContainerId) {
            notifyContainerUpdate(updated as SessionBattlemapContainer);
          } else {
            onTrapUpdated(updated as SessionBattlemapTrap);
          }
        } catch {
          /* ignore */
        }
        onClose();
      });
      return;
    }
    onClose();
  }

  function submitPlayer() {
    if (!characterId) return;
    if (draft.disarmSuccess !== true) {
      toast.message("Bitte melde einen erfolgreichen Entschärfungswurf.");
      return;
    }
    startTransition(async () => {
      try {
        const updated = sourceContainerId
          ? await submitContainerTrapDisarmAttempt({
              sessionId,
              containerId: sourceContainerId,
              characterId,
              investigate: draft.investigate,
              trapMasteryDex: draft.trapMasteryDex,
              hasThievesTools: draft.hasThievesTools,
              thievesToolsProficient: draft.thievesToolsProficient,
              sleightProficient: draft.sleightProficient,
              sleightExpertise: draft.sleightExpertise,
              playerClaimsSuccess: true,
              investigationSuccess: draft.investigate
                ? (draft.investigationSuccess ?? undefined)
                : undefined,
              disarmSuccess: true,
            })
          : await submitTrapDisarmAttempt({
              sessionId,
              trapId: trap!.id,
              characterId,
              investigate: draft.investigate,
              trapMasteryDex: draft.trapMasteryDex,
              hasThievesTools: draft.hasThievesTools,
              thievesToolsProficient: draft.thievesToolsProficient,
              sleightProficient: draft.sleightProficient,
              sleightExpertise: draft.sleightExpertise,
              playerClaimsSuccess: true,
              investigationSuccess: draft.investigate
                ? (draft.investigationSuccess ?? undefined)
                : undefined,
              disarmSuccess: true,
            });
        if (sourceContainerId) {
          notifyContainerUpdate(updated as SessionBattlemapContainer);
        } else {
          onTrapUpdated(updated as SessionBattlemapTrap);
        }
        toast.success(
          isGm && gmTakeoverActive
            ? "Entschärfung im Namen des Spielers eingereicht."
            : "Entschärfung eingereicht — warte auf SL.",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Einreichung fehlgeschlagen.");
      }
    });
  }

  function gmConfirm(approved: boolean) {
    startTransition(async () => {
      try {
        const updated = sourceContainerId
          ? await confirmContainerTrapDisarm({
              sessionId,
              containerId: sourceContainerId,
              approved,
            })
          : await confirmTrapDisarm({
              sessionId,
              trapId: trap!.id,
              approved,
            });
        if (sourceContainerId) {
          notifyContainerUpdate(updated as SessionBattlemapContainer);
        } else {
          onTrapUpdated(updated as SessionBattlemapTrap);
        }
        toast.success(approved ? "Entschärfung bestätigt." : "Entschärfung abgelehnt.");
        if (!approved) handleClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Bestätigung fehlgeschlagen.");
      }
    });
  }

  function claimLoot() {
    if (!characterId) return;
    startTransition(async () => {
      try {
        const result = await claimTrapDisarmLoot({
          sessionId,
          trapId: trap!.id,
          characterId,
        });
        setLoot(result);
        toast.success("Komponenten ins Inventar gelegt.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Inventar fehlgeschlagen.");
      }
    });
  }

  const showForm =
    (isOwner || isGm) &&
    !trap.is_disarmed &&
    disarmPending?.status !== "player_submitted";
  const showWaiting =
    (isOwner || isGm) && disarmPending?.status === "player_submitted";

  return (
    <div className="fixed inset-0 z-[225] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-hero-border/60 bg-background-card shadow-2xl"
        role="dialog"
        aria-labelledby="trap-disarm-title"
      >
        <div className="flex items-center justify-between border-b border-hero-border/40 px-4 py-3">
          <div>
            <h2
              id="trap-disarm-title"
              className="font-barlow text-lg font-bold uppercase tracking-wide text-hero-vibrant"
            >
              Falle entschärfen
            </h2>
            <p className="font-libre text-xs text-gray-400">
              {trap.name}
              {disarmPending?.characterName ? ` — ${disarmPending.characterName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-gray-400 hover:text-white"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          {trap.description ? (
            <p className="font-libre text-sm leading-relaxed text-gray-200">
              {trap.description}
            </p>
          ) : null}

          {components.length > 0 ? (
            <section className="rounded-md border border-hero-border/30 bg-slate-900/40 p-3">
              <h3 className="mb-2 font-cinzel text-sm font-bold text-accent-gold">
                Mögliche Komponenten
              </h3>
              <ul className="space-y-1 font-libre text-xs text-gray-300">
                {components.map((c) => (
                  <li key={c.id}>
                    {c.quantity}× {c.name}
                    {c.isMagical ? " (magisch)" : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-libre text-[11px] text-gray-500">
                Nur bei vorheriger Nachforschung und erfolgreicher Entschärfung.
              </p>
            </section>
          ) : null}

          {showLoot && !loot ? (
            <section className="space-y-3">
              <p className="font-libre text-sm text-emerald-200">
                Falle entschärft! Komponenten können ins Inventar übernommen werden.
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={claimLoot}
                className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-3 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-50"
              >
                <Package className="h-4 w-4" />
                Ins Inventar
              </button>
            </section>
          ) : null}

          {loot ? (
            <section className="space-y-2">
              <h3 className="font-cinzel text-sm font-bold text-accent-gold">
                Extrahierte Gegenstände
              </h3>
              {loot.items.map((item) => (
                <LootCard key={item.id} item={item} />
              ))}
              {loot.recipeScroll ? <LootCard item={loot.recipeScroll} /> : null}
            </section>
          ) : null}

          {isGm && inProgress ? (
            <label className="flex items-center gap-2 rounded-md border border-amber-700/40 bg-amber-950/20 px-3 py-2 font-libre text-sm text-amber-100">
              <input
                type="checkbox"
                checked={gmTakeoverActive}
                onChange={(e) => updateDraft({ gmTakeover: e.target.checked })}
                className="rounded border-hero-border"
              />
              Übernehmen — Eingaben und Würfe für den Spieler ausfüllen
            </label>
          ) : null}

          {gmTakeoverActive && isOwner && !isGm ? (
            <p className="rounded-md border border-amber-700/30 bg-amber-950/10 px-3 py-2 font-libre text-xs text-amber-200">
              Der Spielleiter hat die Eingabe übernommen.
            </p>
          ) : null}

          {gmReview && disarmPending ? (
            <section className="space-y-3 rounded-md border border-amber-700/40 bg-amber-950/20 p-3">
              <h3 className="font-cinzel text-sm font-bold text-amber-200">
                SL-Bestätigung
              </h3>
              <dl className="grid grid-cols-2 gap-2 font-libre text-xs text-gray-300">
                <div>
                  <dt className="text-gray-500">Spieler</dt>
                  <dd>{disarmPending.characterName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Nachforschung</dt>
                  <dd>{disarmPending.investigate ? "Ja" : "Nein"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Diebeswerkzeug</dt>
                  <dd>
                    {disarmPending.hasThievesTools
                      ? disarmPending.thievesToolsProficient
                        ? "Ja + Übung"
                        : "Ja, ohne Übung"
                      : "Nein"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Fallenmeisterschaft (DEX)</dt>
                  <dd>{disarmPending.trapMasteryDex ? "Ja" : "Nein"}</dd>
                </div>
              </dl>
              {disarmPending.investigationRoll ? (
                <RollResultBanner roll={disarmPending.investigationRoll} />
              ) : null}
              {disarmPending.disarmRoll ? (
                <RollResultBanner roll={disarmPending.disarmRoll} />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => gmConfirm(true)}
                  className="rounded border border-emerald-600/60 bg-emerald-950/40 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-emerald-200 disabled:opacity-50"
                >
                  Bestätigen
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => gmConfirm(false)}
                  className="rounded border border-red-600/60 bg-red-950/40 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-red-200 disabled:opacity-50"
                >
                  Ablehnen
                </button>
              </div>
            </section>
          ) : null}

          {showForm ? (
            <section className={`space-y-3 ${!canEditForm ? "opacity-80" : ""}`}>
              <label className="flex items-center gap-2 font-libre text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={draft.investigate}
                  disabled={!canEditForm}
                  onChange={(e) => updateDraft({ investigate: e.target.checked })}
                  className="rounded border-hero-border"
                />
                Nachforschung (Investigation/INT) vor Entschärfung
              </label>

              {draft.investigate ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!canEditForm || !stats}
                      onClick={() =>
                        performInlineRoll({
                          kind:
                            mechanical && draft.trapMasteryDex
                              ? "disarm_sleight"
                              : "investigation",
                          label:
                            mechanical && draft.trapMasteryDex
                              ? "Nachforschung (DEX)"
                              : "Nachforschung (INT)",
                          modifier: investigationMod,
                          skillKey: mechanical && draft.trapMasteryDex ? "slt" : "inv",
                          onSuccessField: "investigationSuccess",
                          rollField: "investigationRoll",
                        })
                      }
                      className="inline-flex items-center gap-1 rounded border border-hero-border/50 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-200 disabled:opacity-50"
                    >
                      <Dices className="h-3 w-3" />
                      Würfeln {formatSigned(investigationMod)}
                    </button>
                    <button
                      type="button"
                      disabled={!canEditForm}
                      onClick={() => updateDraft({ investigationSuccess: true })}
                      className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                        draft.investigationSuccess === true
                          ? "bg-emerald-900 text-emerald-200"
                          : "border border-hero-border/40 text-gray-400"
                      }`}
                    >
                      Erfolg
                    </button>
                    <button
                      type="button"
                      disabled={!canEditForm}
                      onClick={() => updateDraft({ investigationSuccess: false })}
                      className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                        draft.investigationSuccess === false
                          ? "bg-red-900 text-red-200"
                          : "border border-hero-border/40 text-gray-400"
                      }`}
                    >
                      Misserfolg
                    </button>
                  </div>
                  {draft.investigationRoll ? (
                    <RollResultBanner roll={draft.investigationRoll} />
                  ) : null}
                </div>
              ) : null}

              {stats?.hasTrapMasteryFeat ? (
                <label className="flex items-center gap-2 font-libre text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={draft.trapMasteryDex}
                    disabled={!canEditForm}
                    onChange={(e) => updateDraft({ trapMasteryDex: e.target.checked })}
                    className="rounded border-hero-border"
                  />
                  Fallenmeisterschaft — DEX statt INT für Nachforschung
                </label>
              ) : null}

              <div className="rounded-md border border-hero-border/30 p-3">
                <h4 className="mb-2 flex items-center gap-2 font-cinzel text-xs font-bold text-accent-gold">
                  <Wrench className="h-3.5 w-3.5" />
                  Entschärfen
                </h4>
                <label className="mb-2 flex items-center gap-2 font-libre text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={draft.hasThievesTools}
                    disabled={!canEditForm}
                    onChange={(e) => updateDraft({ hasThievesTools: e.target.checked })}
                    className="rounded border-hero-border"
                  />
                  Diebeswerkzeug dabei
                </label>
                <label className="mb-2 flex items-center gap-2 font-libre text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={draft.thievesToolsProficient}
                    disabled={!canEditForm || !draft.hasThievesTools}
                    onChange={(e) =>
                      updateDraft({ thievesToolsProficient: e.target.checked })
                    }
                    className="rounded border-hero-border"
                  />
                  Übung mit Diebeswerkzeug
                </label>
                {magical ? (
                  <p className="mb-2 font-libre text-xs text-purple-200">
                    Magische Falle: Arcana (INT) oder Dispel Magic — SL entscheidet.
                  </p>
                ) : (
                  <p className="mb-2 font-libre text-xs text-gray-400">
                    Mechanisch: DEX + Diebeswerkzeug
                    {draft.thievesToolsProficient
                      ? ` (+${stats?.proficiencyBonus ?? 0} PB)`
                      : ""}
                    {disarmAdvantage ? " · Vorteil (Fingerfertigkeit + Werkzeug)" : ""}
                    {disarmDisadvantage ? " · Nachteil (kein Werkzeug)" : ""}
                    {" · SG "}
                    {trapDc}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!canEditForm || !stats}
                      onClick={() =>
                        performInlineRoll({
                          kind: magical ? "arcana" : "disarm_dex",
                          label: magical ? "Arcana (Entschärfen)" : "Entschärfen (DEX)",
                          modifier: magical ? (stats?.arcanaMod ?? 0) : disarmMod,
                          skillKey: magical ? "arc" : "slt",
                          advantage: disarmAdvantage,
                          disadvantage: disarmDisadvantage,
                          onSuccessField: "disarmSuccess",
                          rollField: "disarmRoll",
                        })
                      }
                      className="inline-flex items-center gap-1 rounded border border-hero-border/50 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-200 disabled:opacity-50"
                    >
                      <Dices className="h-3 w-3" />
                      Würfeln{" "}
                      {formatSigned(magical ? (stats?.arcanaMod ?? 0) : disarmMod)}
                    </button>
                    <button
                      type="button"
                      disabled={!canEditForm}
                      onClick={() => updateDraft({ disarmSuccess: true })}
                      className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                        draft.disarmSuccess === true
                          ? "bg-emerald-900 text-emerald-200"
                          : "border border-hero-border/40 text-gray-400"
                      }`}
                    >
                      Erfolg
                    </button>
                    <button
                      type="button"
                      disabled={!canEditForm}
                      onClick={() => updateDraft({ disarmSuccess: false })}
                      className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                        draft.disarmSuccess === false
                          ? "bg-red-900 text-red-200"
                          : "border border-hero-border/40 text-gray-400"
                      }`}
                    >
                      Misserfolg
                    </button>
                  </div>
                  {draft.disarmRoll ? <RollResultBanner roll={draft.disarmRoll} /> : null}
                </div>
              </div>

              {canEditForm ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={submitPlayer}
                  className="inline-flex w-full items-center justify-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-3 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isGm && gmTakeoverActive ? "Im Namen des Spielers senden" : "An SL senden"}
                </button>
              ) : null}
            </section>
          ) : null}

          {showWaiting ? (
            <p className="font-libre text-sm text-amber-200">
              Entschärfung eingereicht — warte auf Bestätigung durch den Spielleiter.
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
