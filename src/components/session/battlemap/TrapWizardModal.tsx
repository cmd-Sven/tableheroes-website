"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type {
  BattlemapTrapDifficulty,
  BattlemapTrapEffectShape,
} from "@/src/lib/session/battlemap-types";
import { generateTrapWithAI } from "@/src/lib/actions/battlemap-trap-ai";
import { createBattlemapTrap } from "@/src/lib/actions/battlemap-trap-actions";
import {
  CHARACTER_CONDITION_DEFINITIONS,
  parseTrapStatusEffect,
  type CharacterConditionKey,
} from "@/src/lib/characters/condition-tokens";

export type TrapWizardDraft = {
  name: string;
  description: string;
  trapType: string;
  difficulty: BattlemapTrapDifficulty;
  detectionDC: number;
  isAreaEffect: boolean;
  effectShape: BattlemapTrapEffectShape;
  effectRadius: number;
  damage: string;
  damageType: string;
  saveAbility: string;
  saveDC: number;
  /** CharacterConditionKey oder leer */
  statusEffect: CharacterConditionKey | "";
  components: import("@/src/lib/session/battlemap-trap-model").TrapComponent[];
  buildTimeSimple: string;
  buildTimeExpert: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  campaignId: string;
  battlemapId: string;
  gridX: number;
  gridY: number;
  locationLoreContext?: string;
  targetLevel?: number;
  onCreated: (trapId: string) => void;
};

const DIFFICULTY_UI: Array<{ id: "easy" | "medium" | "hard"; label: string }> = [
  { id: "easy", label: "Leicht" },
  { id: "medium", label: "Mittel" },
  { id: "hard", label: "Schwer" },
];

function parseDamageField(raw: string): { damage: string; damageType: string } {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(.*)$/i);
  if (!m) return { damage: trimmed || "2d6", damageType: "piercing" };
  const formula = m[1].replace(/\s+/g, "");
  const rest = (m[2] ?? "").trim().toLowerCase() || "piercing";
  return { damage: formula, damageType: rest.slice(0, 24) };
}

function saveTypeToAbility(saveType: string): string {
  const s = saveType.trim().toLowerCase();
  if (s.startsWith("str")) return "str";
  if (s.startsWith("dex")) return "dex";
  if (s.startsWith("con")) return "con";
  if (s.startsWith("int")) return "int";
  if (s.startsWith("wis")) return "wis";
  if (s.startsWith("cha")) return "cha";
  return "dex";
}

const emptyDraft = (): TrapWizardDraft => ({
  name: "",
  description: "",
  trapType: "mechanical",
  difficulty: "medium",
  detectionDC: 15,
  isAreaEffect: false,
  effectShape: "circle",
  effectRadius: 1,
  damage: "2d6",
  damageType: "piercing",
  saveAbility: "dex",
  saveDC: 13,
  statusEffect: "",
  components: [],
  buildTimeSimple: "1 Stunde",
  buildTimeExpert: "1 FAP + Fertigkeitswurf",
});

export function TrapWizardModal({
  open,
  onClose,
  sessionId,
  campaignId,
  battlemapId,
  gridX,
  gridY,
  locationLoreContext = "",
  targetLevel = 3,
  onCreated,
}: Props) {
  const [draft, setDraft] = useState<TrapWizardDraft>(emptyDraft);
  const [aiHint, setAiHint] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function runAi() {
    startTransition(async () => {
      try {
        const out = await generateTrapWithAI({
          description: aiHint,
          targetLevel,
          difficulty: aiDifficulty,
          locationLoreContext,
        });
        const parsed = parseDamageField(out.damage);
        const statusEffect = parseTrapStatusEffect(out.statusEffect) ?? "";
        const components =
          out.components?.map((c, i) => ({
            id: `comp-${i}`,
            name: c.name,
            description: c.description,
            category: (["poison", "ammo", "mechanical", "gem", "scroll", "consumable", "other"].includes(
              c.category,
            )
              ? c.category
              : "other") as import("@/src/lib/session/battlemap-trap-model").TrapComponent["category"],
            quantity: c.quantity,
            isMagical: c.isMagical,
          })) ?? [];
        setDraft({
          name: out.name,
          description: out.description,
          trapType: out.trapType ?? "mechanical",
          difficulty: aiDifficulty === "hard" ? "hard" : aiDifficulty === "easy" ? "easy" : "medium",
          detectionDC: out.dc,
          isAreaEffect: out.isAreaEffect,
          effectShape: "circle",
          effectRadius: out.effectRadius ?? (out.isAreaEffect ? 2 : 1),
          damage: parsed.damage,
          damageType: parsed.damageType,
          saveAbility: saveTypeToAbility(out.saveType),
          saveDC: out.dc,
          statusEffect,
          components,
          buildTimeSimple: out.buildTimeSimple ?? "1 Stunde",
          buildTimeExpert: out.buildTimeExpert ?? "1 FAP + Fertigkeitswurf",
        });
        toast.success("Falle per KI erzeugt — bitte prüfen.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "KI-Generierung fehlgeschlagen.");
      }
    });
  }

  function save() {
    if (!draft.name.trim()) {
      toast.message("Bitte einen Namen vergeben.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createBattlemapTrap({
          sessionId,
          battlemapId,
          name: draft.name,
          description: draft.description,
          trapType: draft.trapType,
          difficulty: draft.difficulty,
          gridX,
          gridY,
          detectionDC: draft.detectionDC,
          isAreaEffect: draft.isAreaEffect,
          effectShape: draft.effectShape,
          effectRadius: draft.effectRadius,
          damage: draft.damage,
          damageType: draft.damageType,
          saveAbility: draft.saveAbility,
          saveDC: draft.saveDC,
          statusEffect: draft.statusEffect || null,
          loreContext: locationLoreContext || null,
          components: draft.components,
          aiPayload: {
            detectionDC: draft.detectionDC,
            damage: `${draft.damage} ${draft.damageType}`.trim(),
            effectRadius: draft.effectRadius,
            isAreaEffect: draft.isAreaEffect,
            statusEffect: draft.statusEffect || null,
            components: draft.components,
            buildTimeSimple: draft.buildTimeSimple,
            buildTimeExpert: draft.buildTimeExpert,
          },
        });
        toast.success(`Falle „${created.name}“ scharf gestellt.`);
        onCreated(created.id);
        setDraft(emptyDraft());
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falle konnte nicht gespeichert werden.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-hero-border/60 bg-background-card shadow-2xl"
        role="dialog"
        aria-labelledby="trap-wizard-title"
      >
        <div className="flex items-center justify-between border-b border-hero-border/40 px-4 py-3">
          <div>
            <h2
              id="trap-wizard-title"
              className="font-barlow text-lg font-bold uppercase tracking-wide text-hero-vibrant"
            >
              Trap-Wizard
            </h2>
            <p className="font-libre text-xs text-gray-400">
              Trigger-Zelle {gridX},{gridY} · unsichtbar bis Detection/Trigger
            </p>
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
          <section className="rounded-md border border-accent-gold/30 bg-accent-gold/5 p-3">
            <h3 className="mb-2 font-cinzel text-sm font-bold text-accent-gold">
              KI aus World-Lore
            </h3>
            <div className="mb-2 flex flex-wrap gap-2">
              {DIFFICULTY_UI.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setAiDifficulty(d.id)}
                  className={`rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                    aiDifficulty === d.id
                      ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                      : "border-hero-border/40 text-gray-400"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <textarea
              value={aiHint}
              onChange={(e) => setAiHint(e.target.value)}
              rows={2}
              placeholder="Kurzbeschreibung / Idee (optional)…"
              className="mb-2 w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
            <button
              type="button"
              disabled={pending}
              onClick={runAi}
              className="inline-flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/15 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Mit KI erzeugen
            </button>
          </section>

          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
              Name
            </span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
              Beschreibung
            </span>
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft((p) => ({ ...p, description: e.target.value }))
              }
              rows={3}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-gray-200 outline-none focus:border-hero-vibrant"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                Detection DC
              </span>
              <input
                type="number"
                min={5}
                max={30}
                value={draft.detectionDC}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    detectionDC: Number(e.target.value) || 15,
                  }))
                }
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                Save DC
              </span>
              <input
                type="number"
                min={5}
                max={30}
                value={draft.saveDC}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    saveDC: Number(e.target.value) || 13,
                  }))
                }
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                Schaden
              </span>
              <input
                value={draft.damage}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, damage: e.target.value }))
                }
                placeholder="2d6"
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                Schadensart
              </span>
              <input
                value={draft.damageType}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, damageType: e.target.value }))
                }
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 font-libre text-sm text-gray-200">
            <input
              type="checkbox"
              checked={draft.isAreaEffect}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  isAreaEffect: e.target.checked,
                  effectRadius: e.target.checked
                    ? Math.max(2, p.effectRadius)
                    : 1,
                }))
              }
              className="rounded border-hero-border"
            />
            Area-Effect (Schaden/Effekt-Fläche nach Auslösen)
          </label>
          {draft.isAreaEffect ? (
            <p className="font-libre text-[11px] text-gray-500 -mt-2">
              Auslösen bleibt eine Zelle — AoE erscheint erst beim Auslösen auf
              der Karte.
            </p>
          ) : null}

          {draft.isAreaEffect ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                  Effekt-Form
                </span>
                <select
                  value={draft.effectShape}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      effectShape: e.target.value === "rect" ? "rect" : "circle",
                    }))
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
                >
                  <option value="circle">Kreis</option>
                  <option value="rect">Quadrat</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                  Effekt-Radius (Felder)
                </span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={draft.effectRadius}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      effectRadius: Number(e.target.value) || 1,
                    }))
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
                />
              </label>
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
              Rettungswurf
            </span>
            <select
              value={draft.saveAbility}
              onChange={(e) =>
                setDraft((p) => ({ ...p, saveAbility: e.target.value }))
              }
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
            >
              <option value="dex">Geschicklichkeit (Dex)</option>
              <option value="str">Stärke (Str)</option>
              <option value="con">Konstitution (Con)</option>
              <option value="int">Intelligenz (Int)</option>
              <option value="wis">Weisheit (Wis)</option>
              <option value="cha">Charisma (Cha)</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
              Status-Effekt bei Save-Fail
            </span>
            <select
              value={draft.statusEffect}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  statusEffect: (e.target.value || "") as CharacterConditionKey | "",
                }))
              }
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
            >
              <option value="">Kein Zustand</option>
              {CHARACTER_CONDITION_DEFINITIONS.map((def) => (
                <option key={def.key} value={def.key}>
                  {def.labelDe}
                </option>
              ))}
            </select>
            <p className="font-libre text-[11px] text-gray-500">
              Wird über das bestehende Zustands-/Avatar-System gesetzt (SL kann später entfernen).
            </p>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-hero-border/40 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border/50 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-300"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="rounded border border-hero-vibrant bg-hero-vibrant/20 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-50"
          >
            Falle scharf stellen
          </button>
        </div>
      </motion.div>
    </div>
  );
}
