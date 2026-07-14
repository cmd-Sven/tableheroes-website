"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Coins, Save } from "lucide-react";
import type { CampaignFatePointsRules } from "@/src/lib/campaign-rules/default-fate-points-rules";
import { updateCampaignFatePointsRules } from "@/src/app/dashboard/campaigns/[id]/rules-system-actions";
import { MarkdownDisplay } from "@/src/components/ui/MarkdownDisplay";

type Props = {
  campaignId: string;
  rules: CampaignFatePointsRules;
  isGM: boolean;
};

const textareaClass =
  "w-full min-h-[180px] rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none";

export function FatePointsRulesPanel({ campaignId, rules, isGM }: Props) {
  const [draft, setDraft] = useState(rules);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const result = await updateCampaignFatePointsRules({ campaignId, rules: draft });
      if (!result.success) {
        setError(result.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  if (!isGM) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-md border border-hero-dark bg-background-card p-6 shadow-lg"
        >
          <MarkdownDisplay content={rules.fate_points_intro} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="rounded-md border border-hero-dark bg-background-card p-6 shadow-lg"
        >
          <MarkdownDisplay content={rules.fate_points_w10_rules} />
        </motion.div>
        {rules.fate_points_gm_notes.trim() ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-md border border-hero-dark bg-background-card p-6 shadow-lg"
          >
            <MarkdownDisplay content={rules.fate_points_gm_notes} />
          </motion.div>
        ) : null}
        <p className="flex items-center gap-2 font-libre text-sm text-gray-500">
          <Coins className="h-4 w-4 text-accent-gold" />
          In der Live-Session verwaltet ihr den aktuellen Pool über die Schicksalsmünzen im
          Session-Board.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="font-libre text-sm text-gray-400">
        Markdown ist erlaubt. Spieler sehen diese Texte nur lesend. Der Live-Pool bleibt in der
        Session.
      </p>

      {error ? (
        <p className="rounded border border-red-800/60 bg-red-950/40 px-3 py-2 font-libre text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <label className="font-cinzel text-lg font-bold text-accent-gold">
          Vattrak & Malanthirk (Grundlagen)
        </label>
        <textarea
          value={draft.fate_points_intro}
          onChange={(e) => setDraft((d) => ({ ...d, fate_points_intro: e.target.value }))}
          className={textareaClass}
        />
      </div>

      <div className="space-y-2">
        <label className="font-cinzel text-lg font-bold text-accent-gold">W10-Umverteilung</label>
        <textarea
          value={draft.fate_points_w10_rules}
          onChange={(e) => setDraft((d) => ({ ...d, fate_points_w10_rules: e.target.value }))}
          className={textareaClass}
        />
      </div>

      <div className="space-y-2">
        <label className="font-cinzel text-lg font-bold text-accent-gold">
          Zusatzregeln (Spielleiter)
        </label>
        <textarea
          value={draft.fate_points_gm_notes}
          onChange={(e) => setDraft((d) => ({ ...d, fate_points_gm_notes: e.target.value }))}
          className={textareaClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {pending ? "Speichern…" : "Regeln speichern"}
        </button>
        {saved ? (
          <span className="font-libre text-sm text-hero-vibrant">Gespeichert.</span>
        ) : null}
      </div>

      <p className="flex items-center gap-2 font-libre text-sm text-gray-500">
        <Coins className="h-4 w-4 text-accent-gold" />
        Live-Pool: Schicksalsmünzen in der Session — diese Seite dokumentiert nur die Regeln.
      </p>
    </div>
  );
}
