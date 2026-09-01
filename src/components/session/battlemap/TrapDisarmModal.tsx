"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Dices, Package, ShieldCheck, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import type { SessionBattlemapTrap } from "@/src/lib/session/battlemap-types";
import {
  claimTrapDisarmLoot,
  confirmTrapDisarm,
  getTrapDisarmCharacterStats,
  submitTrapDisarmAttempt,
  type TrapDisarmCharacterStats,
  type TrapDisarmLootItem,
} from "@/src/lib/actions/battlemap-trap-actions";
import {
  isMagicalTrap,
  isMechanicalTrap,
  trapComponents,
  trapDisarmPending,
} from "@/src/lib/session/battlemap-trap-model";

type Props = {
  open: boolean;
  trap: SessionBattlemapTrap | null;
  sessionId: string;
  characterId: string | null;
  isGm: boolean;
  onClose: () => void;
  onTrapUpdated: (trap: SessionBattlemapTrap) => void;
  onRequestSkillRoll?: (input: {
    skillKey: "inv" | "arc" | "slt";
    label: string;
    modifier: number;
    advantage?: boolean;
    disadvantage?: boolean;
  }) => void;
};

function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
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

export function TrapDisarmModal({
  open,
  trap,
  sessionId,
  characterId,
  isGm,
  onClose,
  onTrapUpdated,
  onRequestSkillRoll,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [stats, setStats] = useState<TrapDisarmCharacterStats | null>(null);
  const [investigate, setInvestigate] = useState(false);
  const [trapMasteryDex, setTrapMasteryDex] = useState(false);
  const [hasThievesTools, setHasThievesTools] = useState(true);
  const [thievesToolsProficient, setThievesToolsProficient] = useState(false);
  const [sleightProficient, setSleightProficient] = useState(false);
  const [sleightExpertise, setSleightExpertise] = useState(false);
  const [investigationSuccess, setInvestigationSuccess] = useState<boolean | null>(null);
  const [disarmSuccess, setDisarmSuccess] = useState<boolean | null>(null);
  const [loot, setLoot] = useState<{
    items: TrapDisarmLootItem[];
    recipeScroll: TrapDisarmLootItem | null;
  } | null>(null);

  const disarmPending = trap ? trapDisarmPending(trap) : null;
  const components = trap ? trapComponents(trap) : [];
  const mechanical = trap ? isMechanicalTrap(trap) : true;
  const magical = trap ? isMagicalTrap(trap) : false;

  useEffect(() => {
    if (!open || !characterId) {
      setStats(null);
      return;
    }
    void getTrapDisarmCharacterStats(characterId)
      .then((s) => {
        setStats(s);
        setThievesToolsProficient(s.thievesToolsProficient);
        setSleightProficient(s.sleightMod > s.dexMod);
        setSleightExpertise(s.sleightExpertise);
        setTrapMasteryDex(s.hasTrapMasteryFeat);
      })
      .catch(() => setStats(null));
  }, [open, characterId]);

  const investigationMod = useMemo(() => {
    if (!stats) return 0;
    if (investigate && trapMasteryDex && mechanical) return stats.dexMod;
    return stats.investigationMod;
  }, [stats, investigate, trapMasteryDex, mechanical]);

  const disarmMod = useMemo(() => {
    if (!stats) return 0;
    let mod = stats.dexMod;
    if (thievesToolsProficient) mod += stats.proficiencyBonus;
    if (sleightExpertise) mod += stats.proficiencyBonus;
    else if (sleightProficient && !thievesToolsProficient) {
      mod += stats.proficiencyBonus;
    }
    return mod;
  }, [stats, thievesToolsProficient, sleightProficient, sleightExpertise]);

  const disarmAdvantage = Boolean(
    mechanical &&
      hasThievesTools &&
      thievesToolsProficient &&
      sleightProficient,
  );
  const disarmDisadvantage = !hasThievesTools;

  if (!open || !trap) return null;

  const playerView = !isGm && characterId;
  const gmReview = isGm && disarmPending?.status === "player_submitted";
  const gmConfirmed = trap.is_disarmed && disarmPending?.status === "gm_confirmed";
  const showLoot = gmConfirmed && characterId === disarmPending?.characterId;

  function submitPlayer() {
    if (!characterId) return;
    if (disarmSuccess !== true) {
      toast.message("Bitte melde einen erfolgreichen Entschärfungswurf.");
      return;
    }
    startTransition(async () => {
      try {
        const updated = await submitTrapDisarmAttempt({
          sessionId,
          trapId: trap!.id,
          characterId,
          investigate,
          trapMasteryDex,
          hasThievesTools,
          thievesToolsProficient,
          sleightProficient,
          sleightExpertise,
          playerClaimsSuccess: true,
          investigationSuccess: investigate ? investigationSuccess ?? undefined : undefined,
          disarmSuccess: true,
        });
        onTrapUpdated(updated);
        toast.success("Entschärfung eingereicht — warte auf SL.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Einreichung fehlgeschlagen.");
      }
    });
  }

  function gmConfirm(approved: boolean) {
    startTransition(async () => {
      try {
        const updated = await confirmTrapDisarm({
          sessionId,
          trapId: trap!.id,
          approved,
        });
        onTrapUpdated(updated);
        toast.success(approved ? "Entschärfung bestätigt." : "Entschärfung abgelehnt.");
        if (!approved) onClose();
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
            <p className="font-libre text-xs text-gray-400">{trap.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
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

          {playerView && !trap.is_disarmed && !disarmPending ? (
            <section className="space-y-3">
              <label className="flex items-center gap-2 font-libre text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={investigate}
                  onChange={(e) => setInvestigate(e.target.checked)}
                  className="rounded border-hero-border"
                />
                Nachforschung (Investigation/INT) vor Entschärfung
              </label>

              {investigate ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onRequestSkillRoll?.({
                        skillKey: mechanical && trapMasteryDex ? "slt" : "inv",
                        label: mechanical && trapMasteryDex
                          ? "Nachforschung (DEX)"
                          : "Nachforschung (INT)",
                        modifier: investigationMod,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded border border-hero-border/50 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-200"
                  >
                    <Dices className="h-3 w-3" />
                    Wurf {formatSigned(investigationMod)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvestigationSuccess(true)}
                    className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                      investigationSuccess === true
                        ? "bg-emerald-900 text-emerald-200"
                        : "border border-hero-border/40 text-gray-400"
                    }`}
                  >
                    Erfolg
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvestigationSuccess(false)}
                    className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                      investigationSuccess === false
                        ? "bg-red-900 text-red-200"
                        : "border border-hero-border/40 text-gray-400"
                    }`}
                  >
                    Misserfolg
                  </button>
                </div>
              ) : null}

              {stats?.hasTrapMasteryFeat ? (
                <label className="flex items-center gap-2 font-libre text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={trapMasteryDex}
                    onChange={(e) => setTrapMasteryDex(e.target.checked)}
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
                    checked={hasThievesTools}
                    onChange={(e) => setHasThievesTools(e.target.checked)}
                    className="rounded border-hero-border"
                  />
                  Diebeswerkzeug dabei
                </label>
                <label className="mb-2 flex items-center gap-2 font-libre text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={thievesToolsProficient}
                    onChange={(e) => setThievesToolsProficient(e.target.checked)}
                    disabled={!hasThievesTools}
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
                    {thievesToolsProficient ? ` (+${stats?.proficiencyBonus ?? 0} PB)` : ""}
                    {disarmAdvantage ? " · Vorteil (Fingerfertigkeit + Werkzeug)" : ""}
                    {disarmDisadvantage ? " · Nachteil (kein Werkzeug)" : ""}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onRequestSkillRoll?.({
                        skillKey: magical ? "arc" : "slt",
                        label: magical ? "Arcana (Entschärfen)" : "Entschärfen (DEX)",
                        modifier: magical ? (stats?.arcanaMod ?? 0) : disarmMod,
                        advantage: disarmAdvantage,
                        disadvantage: disarmDisadvantage,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded border border-hero-border/50 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-200"
                  >
                    <Dices className="h-3 w-3" />
                    Wurf{" "}
                    {formatSigned(magical ? (stats?.arcanaMod ?? 0) : disarmMod)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisarmSuccess(true)}
                    className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                      disarmSuccess === true
                        ? "bg-emerald-900 text-emerald-200"
                        : "border border-hero-border/40 text-gray-400"
                    }`}
                  >
                    Erfolg
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisarmSuccess(false)}
                    className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                      disarmSuccess === false
                        ? "bg-red-900 text-red-200"
                        : "border border-hero-border/40 text-gray-400"
                    }`}
                  >
                    Misserfolg
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={pending}
                onClick={submitPlayer}
                className="inline-flex w-full items-center justify-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-3 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                An SL senden
              </button>
            </section>
          ) : null}

          {playerView && disarmPending?.status === "player_submitted" ? (
            <p className="font-libre text-sm text-amber-200">
              Entschärfung eingereicht — warte auf Bestätigung durch den Spielleiter.
            </p>
          ) : null}

          {isGm && !gmReview && !gmConfirmed ? (
            <p className="font-libre text-sm text-gray-400">
              Warte auf Spieler-Eingaben zur Entschärfung.
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
