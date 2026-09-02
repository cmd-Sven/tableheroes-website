"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type {
  BattlemapContainerType,
  BattlemapTrapDifficulty,
} from "@/src/lib/session/battlemap-types";
import {
  CONTAINER_TYPE_LABELS,
  defaultForceOpenDc,
} from "@/src/lib/session/battlemap-container-model";
import { generateContainerWithAI } from "@/src/lib/actions/battlemap-container-ai";
import { createBattlemapContainer } from "@/src/lib/actions/battlemap-container-actions";
import {
  CHARACTER_CONDITION_DEFINITIONS,
  parseTrapStatusEffect,
  type CharacterConditionKey,
} from "@/src/lib/characters/condition-tokens";

export type ContainerWizardDraft = {
  name: string;
  description: string;
  containerType: BattlemapContainerType;
  isLocked: boolean;
  forceOpenDc: number;
  hasTrap: boolean;
  trapName: string;
  trapDescription: string;
  trapType: string;
  trapDifficulty: BattlemapTrapDifficulty;
  trapDetectionDC: number;
  trapIsAreaEffect: boolean;
  trapEffectRadius: number;
  trapDamage: string;
  trapDamageType: string;
  trapSaveAbility: string;
  trapSaveDC: number;
  trapStatusEffect: CharacterConditionKey | "";
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
  onCreated: (containerId: string) => void;
};

const CONTAINER_TYPES: BattlemapContainerType[] = [
  "chest",
  "barrel",
  "crate",
  "urn",
  "sarcophagus",
  "other",
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

const emptyDraft = (type: BattlemapContainerType = "chest"): ContainerWizardDraft => ({
  name: "",
  description: "",
  containerType: type,
  isLocked: true,
  forceOpenDc: defaultForceOpenDc(type),
  hasTrap: false,
  trapName: "",
  trapDescription: "",
  trapType: "mechanical",
  trapDifficulty: "medium",
  trapDetectionDC: 15,
  trapIsAreaEffect: false,
  trapEffectRadius: 1,
  trapDamage: "2d6",
  trapDamageType: "piercing",
  trapSaveAbility: "dex",
  trapSaveDC: 13,
  trapStatusEffect: "",
});

export function ContainerWizardModal({
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
  const [draft, setDraft] = useState<ContainerWizardDraft>(emptyDraft());
  const [aiHint, setAiHint] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDraft(emptyDraft());
    setAiHint("");
    setAiDifficulty("medium");
  }, [open, gridX, gridY]);

  if (!open) return null;

  function runAi() {
    startTransition(async () => {
      try {
        const out = await generateContainerWithAI({
          description: aiHint,
          targetLevel,
          difficulty: aiDifficulty,
          locationLoreContext,
          containerType: draft.containerType,
        });
        const typeRaw = String(out.containerType ?? draft.containerType);
        const containerType = CONTAINER_TYPES.includes(typeRaw as BattlemapContainerType)
          ? (typeRaw as BattlemapContainerType)
          : draft.containerType;
        const trap = out.trap;
        const statusEffect = trap?.statusEffect
          ? parseTrapStatusEffect(trap.statusEffect)
          : "";
        const parsed = trap ? parseDamageField(trap.damage) : null;
        setDraft({
          name: out.name,
          description: out.description ?? "",
          containerType,
          isLocked: out.isLocked ?? true,
          forceOpenDc: out.forceOpenDc ?? defaultForceOpenDc(containerType),
          hasTrap: out.hasTrap === true && trap != null,
          trapName: trap?.name ?? "",
          trapDescription: trap?.description ?? "",
          trapType: trap?.trapType ?? "mechanical",
          trapDifficulty: aiDifficulty === "easy" ? "easy" : aiDifficulty === "hard" ? "hard" : "medium",
          trapDetectionDC: trap?.dc ?? 15,
          trapIsAreaEffect: trap?.isAreaEffect ?? false,
          trapEffectRadius: trap?.effectRadius ?? 1,
          trapDamage: parsed?.damage ?? "2d6",
          trapDamageType: parsed?.damageType ?? "piercing",
          trapSaveAbility: trap ? saveTypeToAbility(trap.saveType) : "dex",
          trapSaveDC: trap?.dc ?? 13,
          trapStatusEffect: statusEffect ?? "",
        });
        toast.success("Behälter per KI erzeugt — bitte prüfen.");
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
        const created = await createBattlemapContainer({
          sessionId,
          battlemapId,
          name: draft.name,
          description: draft.description,
          containerType: draft.containerType,
          gridX,
          gridY,
          isLocked: draft.isLocked,
          forceOpenDc: draft.forceOpenDc,
          hasTrap: draft.hasTrap,
          trapConfig: draft.hasTrap
            ? {
                name: draft.trapName.trim() || "Falle",
                description: draft.trapDescription,
                trap_type: draft.trapType,
                difficulty: draft.trapDifficulty,
                detection_dc: draft.trapDetectionDC,
                is_area_effect: draft.trapIsAreaEffect,
                effect_shape: "circle",
                effect_radius: draft.trapEffectRadius,
                damage: draft.trapDamage,
                damage_type: draft.trapDamageType,
                save_ability: draft.trapSaveAbility,
                save_dc: draft.trapSaveDC,
                status_effect: draft.trapStatusEffect || null,
              }
            : undefined,
          loreContext: locationLoreContext || null,
        });
        toast.success(`„${created.name}" platziert.`);
        onCreated(created.id);
        setDraft(emptyDraft());
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Behälter konnte nicht gespeichert werden.");
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
        aria-labelledby="container-wizard-title"
      >
        <div className="flex items-center justify-between border-b border-hero-border/40 px-5 py-3">
          <h2
            id="container-wizard-title"
            className="font-barlow text-lg font-extrabold uppercase tracking-wide text-hero-vibrant"
          >
            Behälter platzieren
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-accent-gold/30 bg-accent-gold/5 p-3">
            <p className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
              KI-Assistent
            </p>
            <textarea
              value={aiHint}
              onChange={(e) => setAiHint(e.target.value)}
              placeholder="z. B. verrostetes Fass mit Giftgas-Falle"
              rows={2}
              className="mt-2 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
            />
            <div className="mt-2 flex items-center gap-2">
              <select
                value={aiDifficulty}
                onChange={(e) =>
                  setAiDifficulty(e.target.value as "easy" | "medium" | "hard")
                }
                className="rounded border border-hero-dark bg-slate-900 p-1.5 text-xs text-white"
              >
                <option value="easy">Leicht</option>
                <option value="medium">Mittel</option>
                <option value="hard">Schwer</option>
              </select>
              <button
                type="button"
                disabled={pending}
                onClick={runAi}
                className="flex items-center gap-1 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                KI generieren
              </button>
            </div>
          </div>

          <label className="block">
            <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">Name</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
            />
          </label>

          <label className="block">
            <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
              Beschreibung
            </span>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">Typ</span>
              <select
                value={draft.containerType}
                onChange={(e) => {
                  const t = e.target.value as BattlemapContainerType;
                  setDraft((p) => ({
                    ...p,
                    containerType: t,
                    forceOpenDc: defaultForceOpenDc(t),
                  }));
                }}
                className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
              >
                {CONTAINER_TYPES.map((t) => (
                  <option key={t} value={t}>{CONTAINER_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                Gewaltsam SG
              </span>
              <input
                type="number"
                min={1}
                max={40}
                value={draft.forceOpenDc}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    forceOpenDc: Math.max(1, Math.min(40, Number(e.target.value))),
                  }))
                }
                className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={draft.isLocked}
              onChange={(e) => setDraft((p) => ({ ...p, isLocked: e.target.checked }))}
            />
            Verschlossen
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={draft.hasTrap}
              onChange={(e) => setDraft((p) => ({ ...p, hasTrap: e.target.checked }))}
            />
            Falle eingebettet
          </label>

          {draft.hasTrap ? (
            <div className="space-y-3 rounded-lg border border-red-800/40 bg-red-950/20 p-3">
              <p className="font-cinzel text-sm font-bold text-red-300">Falle</p>
              <input
                value={draft.trapName}
                onChange={(e) => setDraft((p) => ({ ...p, trapName: e.target.value }))}
                placeholder="Name der Falle"
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
              />
              <textarea
                value={draft.trapDescription}
                onChange={(e) => setDraft((p) => ({ ...p, trapDescription: e.target.value }))}
                placeholder="Beschreibung"
                rows={2}
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={draft.trapDetectionDC}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      trapDetectionDC: Number(e.target.value),
                      trapSaveDC: Number(e.target.value),
                    }))
                  }
                  className="rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
                  title="Detection DC"
                />
                <input
                  value={draft.trapDamage}
                  onChange={(e) => setDraft((p) => ({ ...p, trapDamage: e.target.value }))}
                  placeholder="2d6 piercing"
                  className="rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.trapIsAreaEffect}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, trapIsAreaEffect: e.target.checked }))
                  }
                />
                Flächeneffekt
              </label>
              <select
                value={draft.trapStatusEffect}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    trapStatusEffect: e.target.value as CharacterConditionKey | "",
                  }))
                }
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-xs text-white"
              >
                <option value="">Kein Status-Effekt</option>
                {CHARACTER_CONDITION_DEFINITIONS.map((c) => (
                  <option key={c.key} value={c.key}>{c.labelDe}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-hero-border/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-dark px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-300"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-50"
          >
            Platzieren
          </button>
        </div>
      </motion.div>
    </div>
  );
}
