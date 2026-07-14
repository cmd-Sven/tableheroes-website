"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { CampaignFlawRow } from "@/src/lib/campaign-rules/seed-campaign-flaws";

export type FlawEditorDraft = {
  name: string;
  nr: number;
  main_disadvantage: string;
  small_advantage: string;
  description: string;
  effects: string;
  roleplay: string;
  is_enabled: boolean;
};

type Props = {
  open: boolean;
  flaw: CampaignFlawRow | null;
  isNew?: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (draft: FlawEditorDraft) => void;
};

const inputClass =
  "w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none";
const labelClass = "font-barlow text-xs font-bold uppercase text-gray-400";

export function FlawEditorModal({
  open,
  flaw,
  isNew = false,
  saving = false,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<FlawEditorDraft>({
    name: "",
    nr: 1,
    main_disadvantage: "",
    small_advantage: "",
    description: "",
    effects: "",
    roleplay: "",
    is_enabled: true,
  });

  useEffect(() => {
    if (!open) return;
    if (flaw) {
      setDraft({
        name: flaw.name,
        nr: flaw.nr,
        main_disadvantage: flaw.main_disadvantage,
        small_advantage: flaw.small_advantage,
        description: flaw.description,
        effects: flaw.effects,
        roleplay: flaw.roleplay,
        is_enabled: flaw.is_enabled,
      });
    } else if (isNew) {
      setDraft({
        name: "",
        nr: 0,
        main_disadvantage: "",
        small_advantage: "",
        description: "",
        effects: "",
        roleplay: "",
        is_enabled: true,
      });
    }
  }, [open, flaw, isNew]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="presentation"
          className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            role="button"
            tabIndex={0}
            aria-label="Schließen"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="flaw-editor-title"
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-hero-dark bg-background-card shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center justify-between border-b border-hero-dark px-6 py-4">
              <h3
                id="flaw-editor-title"
                className="font-cinzel text-xl font-bold text-accent-gold"
              >
                {isNew ? "Neuer Makel" : "Makel bearbeiten"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-400 hover:text-white"
                aria-label="Modal schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-[80px_1fr]">
                {!isNew ? (
                  <div>
                    <label className={labelClass}>Nr.</label>
                    <input
                      type="number"
                      min={1}
                      value={draft.nr}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, nr: Number(e.target.value) || 0 }))
                      }
                      className={inputClass}
                    />
                  </div>
                ) : null}
                <div className={isNew ? "sm:col-span-2" : ""}>
                  <label className={labelClass}>Name</label>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className={inputClass}
                    placeholder="Name des Makels"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Hauptnachteil</label>
                <textarea
                  rows={2}
                  value={draft.main_disadvantage}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, main_disadvantage: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Kleiner Vorteil</label>
                <textarea
                  rows={2}
                  value={draft.small_advantage}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, small_advantage: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Beschreibung</label>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Effekte (Mechanik)</label>
                <textarea
                  rows={3}
                  value={draft.effects}
                  onChange={(e) => setDraft((d) => ({ ...d, effects: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Rollenspiel</label>
                <textarea
                  rows={3}
                  value={draft.roleplay}
                  onChange={(e) => setDraft((d) => ({ ...d, roleplay: e.target.value }))}
                  className={inputClass}
                />
              </div>

              {!isNew ? (
                <label className="flex items-center gap-2 font-libre text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={draft.is_enabled}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, is_enabled: e.target.checked }))
                    }
                    className="rounded border-hero-dark"
                  />
                  Makel ist aktiv (für Charakterauswahl verfügbar)
                </label>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-hero-dark px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="font-barlow font-bold uppercase text-gray-400 hover:text-white"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={saving || !draft.name.trim()}
                onClick={() => onSave(draft)}
                className="rounded-md border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50"
              >
                {saving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
