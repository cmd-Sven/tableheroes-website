"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  BEAST_CHECK_TYPES,
  type BeastCheckResult,
} from "@/src/lib/beast-check-results";

type Props = {
  value: BeastCheckResult[];
  onChange: (value: BeastCheckResult[]) => void;
  compact?: boolean;
};

const SKILL_SUGGESTIONS = [
  "Naturkunde",
  "Arkane Kunde",
  "Wahrnehmung",
  "Überleben",
  "Geschichte",
  "Religion",
];

function emptyRow(): BeastCheckResult {
  return {
    type: "Monsterkategorie",
    skill: "Naturkunde",
    dc: 15,
    result: "",
    is_critical: false,
  };
}

export function BeastCheckResultsEditor({ value, onChange, compact = false }: Props) {
  const rows = value.length > 0 ? value : [emptyRow()];

  const updateRow = (index: number, patch: Partial<BeastCheckResult>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => onChange([...rows, emptyRow()]);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <p className="font-libre text-xs text-gray-400">
        Was Spielercharaktere bei erfolgreichen Proben über die Kreatur erfahren. Der SL schaltet
        freigeschaltete Infos auf der Bühne frei (Icons: Schwächen rot, Immunität blau, Fähigkeiten
        grün).
      </p>
      {rows.map((row, index) => (
        <div
          key={index}
          className="rounded border border-hero-border/40 bg-background-dark/60 p-3 space-y-2"
        >
          <div className="flex flex-wrap gap-2 items-end">
            <label className="flex flex-col gap-1 min-w-[140px]">
              <span className="font-barlow text-[10px] uppercase text-gray-500">Typ</span>
              <select
                value={row.type}
                onChange={(e) => updateRow(index, { type: e.target.value })}
                className="rounded border border-hero-border bg-background-card px-2 py-1.5 text-sm text-white"
              >
                {BEAST_CHECK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 min-w-[120px]">
              <span className="font-barlow text-[10px] uppercase text-gray-500">Fertigkeit</span>
              <input
                list={`beast-skills-${index}`}
                value={row.skill ?? ""}
                onChange={(e) => updateRow(index, { skill: e.target.value })}
                placeholder="z. B. Naturkunde"
                className="rounded border border-hero-border bg-background-card px-2 py-1.5 text-sm text-white"
              />
              <datalist id={`beast-skills-${index}`}>
                {SKILL_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 w-20">
              <span className="font-barlow text-[10px] uppercase text-gray-500">SG</span>
              <input
                type="number"
                min={5}
                max={30}
                value={row.dc}
                onChange={(e) => updateRow(index, { dc: Number(e.target.value) || 15 })}
                className="rounded border border-hero-border bg-background-card px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="flex items-center gap-2 pb-1.5">
              <input
                type="checkbox"
                checked={row.is_critical === true}
                onChange={(e) => updateRow(index, { is_critical: e.target.checked })}
                className="rounded"
              />
              <span className="font-libre text-xs text-gray-400">Kritischer Erfolg</span>
            </label>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="ml-auto p-1.5 text-gray-500 hover:text-red-400"
                title="Eintrag entfernen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-barlow text-[10px] uppercase text-gray-500">
              Was der Spieler erfährt (bei SG erreicht)
            </span>
            <textarea
              value={row.result}
              onChange={(e) => updateRow(index, { result: e.target.value })}
              rows={2}
              className="w-full rounded border border-hero-border bg-background-card px-3 py-2 text-sm text-white resize-y min-h-[60px]"
              placeholder="Beschreibung aus Spielersicht …"
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 font-barlow text-xs uppercase text-hero-vibrant hover:text-white"
      >
        <Plus className="h-3.5 w-3.5" />
        Analyse-Eintrag hinzufügen
      </button>
    </div>
  );
}
