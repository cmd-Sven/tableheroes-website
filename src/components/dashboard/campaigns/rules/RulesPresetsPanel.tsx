"use client";

import { useState, useTransition } from "react";
import { Download, Save, Trash2 } from "lucide-react";
import type { CampaignRulesPresetListItem } from "@/src/lib/campaign-rules/campaign-rules-preset-snapshot";
import {
  deleteCampaignRulesPreset,
  importCampaignRulesPreset,
  saveCampaignRulesPreset,
} from "@/src/app/dashboard/campaigns/[id]/rules-system-actions";

type Props = {
  campaignId: string;
  campaignName: string;
  presets: CampaignRulesPresetListItem[];
};

function formatPresetDate(value: string) {
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RulesPresetsPanel({ campaignId, campaignName, presets }: Props) {
  const [presetName, setPresetName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const result = await saveCampaignRulesPreset({ campaignId, name: presetName });
      if (!result.success) {
        setError(result.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setPresetName("");
    });
  }

  function handleImport(preset: CampaignRulesPresetListItem) {
    const confirmed = window.confirm(
      `Regelvorlage „${preset.name}" in „${campaignName}" importieren?\n\nAlle Makel und Schicksalspunkte-Texte dieser Kampagne werden ersetzt.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      setError(null);
      const result = await importCampaignRulesPreset({
        campaignId,
        presetId: preset.id,
      });
      if (!result.success) {
        setError(result.error ?? "Import fehlgeschlagen.");
      }
    });
  }

  function handleDelete(preset: CampaignRulesPresetListItem) {
    const confirmed = window.confirm(`Regelvorlage „${preset.name}" wirklich löschen?`);
    if (!confirmed) return;

    startTransition(async () => {
      setError(null);
      const result = await deleteCampaignRulesPreset({
        campaignId,
        presetId: preset.id,
      });
      if (!result.success) {
        setError(result.error ?? "Löschen fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-hero-border bg-hero-dark/40 p-5 space-y-4">
        <h3 className="font-cinzel text-lg font-semibold text-gray-100">
          Aktuelles Regelsystem speichern
        </h3>
        <p className="font-libre text-sm text-gray-400">
          Speichert den kompletten Makel-Katalog (inkl. aktiviert/deaktiviert und eigene Makel) sowie
          alle Schicksalspunkte-Texte unter einem Namen deiner Wahl.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1">
            <span className="font-barlow text-xs font-bold uppercase tracking-wide text-gray-400">
              Name der Vorlage
            </span>
            <input
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="z. B. Malanthirk Standard 2026"
              maxLength={120}
              disabled={pending}
              className="w-full rounded-md border border-hero-border bg-hero-dark px-3 py-2 font-libre text-gray-100 placeholder:text-gray-500 focus:border-hero-vibrant focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !presetName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-hero-vibrant px-4 py-2 font-barlow text-sm font-bold uppercase tracking-wide text-hero-dark transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden />
            Als Vorlage speichern
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-cinzel text-lg font-semibold text-gray-100">Gespeicherte Vorlagen</h3>
        {presets.length === 0 ? (
          <p className="font-libre text-sm text-gray-500">
            Noch keine Regelvorlagen gespeichert. Lege oben eine an, um sie in andere Kampagnen zu
            importieren.
          </p>
        ) : (
          <ul className="space-y-3">
            {presets.map((preset) => (
              <li
                key={preset.id}
                className="flex flex-col gap-3 rounded-lg border border-hero-border bg-hero-dark/30 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-barlow text-base font-semibold text-gray-100">{preset.name}</p>
                  <p className="font-libre text-xs text-gray-500">
                    {preset.flaw_count} Makel · erstellt {formatPresetDate(preset.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleImport(preset)}
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-md border border-hero-vibrant/60 px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant transition-colors hover:bg-hero-vibrant/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    In diese Kampagne importieren
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(preset)}
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-md border border-red-900/60 px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-red-400 transition-colors hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? (
        <p className="font-libre text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
