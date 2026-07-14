"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { CampaignFlawRow } from "@/src/lib/campaign-rules/seed-campaign-flaws";
import {
  createCampaignFlaw,
  deleteCampaignFlaw,
  updateCampaignFlaw,
} from "@/src/app/dashboard/campaigns/[id]/rules-system-actions";
import { FlawEditorModal, type FlawEditorDraft } from "./FlawEditorModal";

type Props = {
  campaignId: string;
  flaws: CampaignFlawRow[];
  isGM: boolean;
};

export function FlawsCatalogPanel({ campaignId, flaws, isGM }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFlaw, setEditingFlaw] = useState<CampaignFlawRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedFlaws = useMemo(
    () => [...flaws].sort((a, b) => a.sort_order - b.sort_order || a.nr - b.nr),
    [flaws],
  );

  function openEdit(flaw: CampaignFlawRow) {
    setEditingFlaw(flaw);
    setIsNew(false);
    setEditorOpen(true);
    setError(null);
  }

  function openCreate() {
    setEditingFlaw(null);
    setIsNew(true);
    setEditorOpen(true);
    setError(null);
  }

  function handleSave(draft: FlawEditorDraft) {
    startTransition(async () => {
      setError(null);
      if (isNew) {
        const result = await createCampaignFlaw({
          campaignId,
          name: draft.name,
          main_disadvantage: draft.main_disadvantage,
          small_advantage: draft.small_advantage,
          description: draft.description,
          effects: draft.effects,
          roleplay: draft.roleplay,
        });
        if (!result.success) {
          setError(result.error ?? "Speichern fehlgeschlagen.");
          return;
        }
      } else if (editingFlaw) {
        const result = await updateCampaignFlaw({
          campaignId,
          flawId: editingFlaw.id,
          patch: {
            name: draft.name,
            nr: draft.nr,
            main_disadvantage: draft.main_disadvantage,
            small_advantage: draft.small_advantage,
            description: draft.description,
            effects: draft.effects,
            roleplay: draft.roleplay,
            is_enabled: draft.is_enabled,
          },
        });
        if (!result.success) {
          setError(result.error ?? "Speichern fehlgeschlagen.");
          return;
        }
      }
      setEditorOpen(false);
      setEditingFlaw(null);
    });
  }

  function handleDelete(flaw: CampaignFlawRow) {
    if (!flaw.is_custom) return;
    if (!window.confirm(`Makel „${flaw.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      const result = await deleteCampaignFlaw({ campaignId, flawId: flaw.id });
      if (!result.success) setError(result.error ?? "Löschen fehlgeschlagen.");
    });
  }

  async function toggleEnabled(flaw: CampaignFlawRow) {
    startTransition(async () => {
      await updateCampaignFlaw({
        campaignId,
        flawId: flaw.id,
        patch: { is_enabled: !flaw.is_enabled },
      });
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-libre text-sm text-gray-400">
          {isGM
            ? "Bearbeite den Makel-Katalog dieser Kampagne. Spieler sehen die Liste nur lesend."
            : "Alle Makel dieser Kampagne — nur zur Orientierung beim Charakterbau."}
        </p>
        {isGM ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md border border-hero-vibrant px-3 py-2 font-barlow text-sm font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/10"
          >
            <Plus className="h-4 w-4" />
            Neuer Makel
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded border border-red-800/60 bg-red-950/40 px-3 py-2 font-libre text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        {sortedFlaws.map((flaw, index) => {
          const expanded = expandedId === flaw.id;
          return (
            <motion.div
              key={flaw.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
              className={`rounded-md border bg-background-card p-4 shadow-lg ${
                flaw.is_enabled ? "border-hero-dark" : "border-gray-700 opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : flaw.id)}
                  className="flex flex-1 items-start gap-2 text-left"
                >
                  <span className="mt-0.5 shrink-0 font-barlow text-sm font-bold text-accent-gold">
                    {flaw.nr}.
                  </span>
                  <span>
                    <span className="font-barlow text-base font-bold uppercase text-white">
                      {flaw.name}
                    </span>
                    {!flaw.is_enabled ? (
                      <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-gray-400">
                        Deaktiviert
                      </span>
                    ) : null}
                    {flaw.is_custom ? (
                      <span className="ml-2 rounded bg-accent-gold/20 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-accent-gold">
                        SL-eigen
                      </span>
                    ) : null}
                    <p className="mt-1 font-libre text-sm text-gray-400 line-clamp-1">
                      {flaw.main_disadvantage}
                    </p>
                  </span>
                  {expanded ? (
                    <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-gray-500" />
                  ) : (
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-gray-500" />
                  )}
                </button>

                {isGM ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      title={flaw.is_enabled ? "Deaktivieren" : "Aktivieren"}
                      onClick={() => toggleEnabled(flaw)}
                      disabled={pending}
                      className="rounded p-2 text-gray-400 hover:bg-hero-dark/60 hover:text-hero-vibrant"
                    >
                      <span className="font-barlow text-[10px] font-bold uppercase">
                        {flaw.is_enabled ? "Aus" : "An"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(flaw)}
                      className="rounded p-2 text-gray-400 hover:bg-hero-dark/60 hover:text-white"
                      aria-label="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {flaw.is_custom ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(flaw)}
                        disabled={pending}
                        className="rounded p-2 text-gray-400 hover:bg-red-950/50 hover:text-red-400"
                        aria-label="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {expanded ? (
                <div className="mt-4 space-y-3 border-t border-hero-dark/60 pt-4 font-libre text-sm text-gray-200">
                  <div>
                    <p className="font-barlow text-xs font-bold uppercase text-accent-gold">
                      Kleiner Vorteil
                    </p>
                    <p className="mt-1 leading-relaxed">{flaw.small_advantage || "—"}</p>
                  </div>
                  <div>
                    <p className="font-barlow text-xs font-bold uppercase text-accent-gold">
                      Beschreibung
                    </p>
                    <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                      {flaw.description || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-barlow text-xs font-bold uppercase text-accent-gold">
                      Effekte
                    </p>
                    <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                      {flaw.effects || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-barlow text-xs font-bold uppercase text-accent-gold">
                      Rollenspiel
                    </p>
                    <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                      {flaw.roleplay || "—"}
                    </p>
                  </div>
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      <FlawEditorModal
        open={editorOpen}
        flaw={editingFlaw}
        isNew={isNew}
        saving={pending}
        onClose={() => {
          setEditorOpen(false);
          setEditingFlaw(null);
        }}
        onSave={handleSave}
      />
    </section>
  );
}
