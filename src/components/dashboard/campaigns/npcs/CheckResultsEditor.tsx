"use client";

import React, { useState } from "react";
import { Plus, X, Eye, HeartPulse, Scroll, Edit2, Save, Trash2 } from "lucide-react";

type CheckResult = {
  type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
  dc: number;
  result: string;
  is_critical: boolean;
};

type Props = {
  checkResults: CheckResult[];
  onChange: (results: CheckResult[]) => void;
  isGM?: boolean;
};

const CHECK_TYPES = [
  { value: "Wahrnehmung", label: "Wahrnehmung", icon: Eye, color: "text-blue-400" },
  { value: "Motiv erkennen", label: "Motiv erkennen", icon: HeartPulse, color: "text-red-400" },
  { value: "Wissen", label: "Wissen", icon: Scroll, color: "text-yellow-400" },
] as const;

export function CheckResultsEditor({ checkResults, onChange, isGM = true }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingResult, setEditingResult] = useState<CheckResult | null>(null);

  const handleAdd = () => {
    const newResult: CheckResult = {
      type: "Wahrnehmung",
      dc: 15,
      result: "",
      is_critical: false,
    };
    onChange([...checkResults, newResult]);
    setEditingIndex(checkResults.length);
    setEditingResult(newResult);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingResult({ ...checkResults[index] });
  };

  const handleSave = () => {
    if (editingIndex === null || !editingResult) return;

    const updated = [...checkResults];
    updated[editingIndex] = editingResult;
    
    // Sortiere nach Typ, dann nach DC
    const sorted = updated.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return a.dc - b.dc;
    });

    onChange(sorted);
    setEditingIndex(null);
    setEditingResult(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditingResult(null);
  };

  const handleDelete = (index: number) => {
    if (confirm("Möchtest du diese Ergebnis-Stufe wirklich löschen?")) {
      const updated = [...checkResults];
      updated.splice(index, 1);
      onChange(updated);
    }
  };

  // Gruppiere nach Typ
  const grouped = checkResults.reduce((acc, result, index) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push({ ...result, originalIndex: index });
    return acc;
  }, {} as Record<string, Array<CheckResult & { originalIndex: number }>>);

  // Sortiere innerhalb jeder Gruppe nach DC
  Object.keys(grouped).forEach((type) => {
    grouped[type].sort((a, b) => a.dc - b.dc);
  });

  if (!isGM) {
    return null;
  }

  return (
    <div className="rounded-lg border-2 border-accent-gold/50 bg-slate-900/80 p-6 space-y-6">
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-barlow font-bold text-xl uppercase text-accent-gold flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Ergebnisse für Spielerproben
          </h3>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 rounded border border-hero-vibrant bg-hero-vibrant/10 text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors font-barlow font-bold text-sm uppercase"
          >
            <Plus className="h-4 w-4" />
            Weitere Stufe hinzufügen
          </button>
        </div>
        <p className="font-libre text-sm text-gray-400">
          Mögliche Ergebnisse für den GM: Was Spieler mit ihren Charakteren bei Würfen auf Wahrnehmung, Motiv erkennen oder Wissen über diesen NPC entdecken können (z. B. bei DC 12 / DC 18 / kritischem Erfolg). Der NPC würfelt nicht – die Spieler.
        </p>
      </div>

      {checkResults.length === 0 ? (
        <div className="text-center py-8 text-gray-400 font-libre">
          <p>Noch keine Ergebnisse für Spielerproben definiert.</p>
          <p className="text-sm mt-2">Füge DC-Stufen hinzu, die der GM nutzen kann, wenn Spieler gegen diesen NPC würfeln.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {CHECK_TYPES.map((checkType) => {
            const results = grouped[checkType.value] || [];
            if (results.length === 0) return null;

            const Icon = checkType.icon;

            return (
              <div key={checkType.value} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-hero-border/30">
                  <Icon className={`h-5 w-5 ${checkType.color}`} />
                  <h4 className="font-barlow font-semibold text-lg text-accent-blood">
                    {checkType.label}
                  </h4>
                  <span className="ml-auto text-xs text-gray-400 font-barlow">
                    {results.length} {results.length === 1 ? "Ergebnis" : "Ergebnisse"}
                  </span>
                </div>

                <div className="space-y-2">
                  {results.map((result, groupIndex) => {
                    const originalIndex = result.originalIndex;
                    const isEditing = editingIndex === originalIndex;

                    if (isEditing && editingResult) {
                      return (
                        <div
                          key={originalIndex}
                          className="rounded-lg border-2 border-accent-gold bg-slate-800/50 p-4 space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block mb-1 font-barlow font-semibold text-xs uppercase text-gray-300">
                                Typ
                              </label>
                              <select
                                value={editingResult.type}
                                onChange={(e) =>
                                  setEditingResult({
                                    ...editingResult,
                                    type: e.target.value as CheckResult["type"],
                                  })
                                }
                                className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
                              >
                                {CHECK_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block mb-1 font-barlow font-semibold text-xs uppercase text-gray-300">
                                DC (Schwierigkeitsgrad)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={editingResult.dc}
                                onChange={(e) =>
                                  setEditingResult({
                                    ...editingResult,
                                    dc: parseInt(e.target.value) || 10,
                                  })
                                }
                                className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block mb-1 font-barlow font-semibold text-xs uppercase text-gray-300">
                              Was der Spielercharakter bei diesem Wurf erfährt
                            </label>
                            <textarea
                              value={editingResult.result}
                              onChange={(e) =>
                                setEditingResult({
                                  ...editingResult,
                                  result: e.target.value,
                                })
                              }
                              rows={3}
                              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold resize-none"
                              placeholder="z. B. Bemerkt die Narbe über dem linken Auge und die Wachtuniform. Bei kritischem Erfolg: erkennt das Abzeichen der Stadtwache."
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingResult.is_critical}
                                onChange={(e) =>
                                  setEditingResult({
                                    ...editingResult,
                                    is_critical: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-hero-dark bg-slate-800 text-accent-gold focus:ring-2 focus:ring-accent-gold cursor-pointer"
                              />
                              <span className="font-libre text-sm text-gray-300">
                                Kritischer Erfolg / Herausragender Erfolg
                              </span>
                            </label>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={handleSave}
                              className="flex items-center gap-2 px-4 py-2 rounded bg-hero-vibrant text-black hover:bg-yellow-400 transition-colors font-barlow font-bold text-sm uppercase"
                            >
                              <Save className="h-4 w-4" />
                              Speichern
                            </button>
                            <button
                              type="button"
                              onClick={handleCancel}
                              className="flex items-center gap-2 px-4 py-2 rounded border border-hero-border text-gray-300 hover:bg-hero-dark transition-colors font-barlow font-bold text-sm uppercase"
                            >
                              <X className="h-4 w-4" />
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={originalIndex}
                        className="rounded-lg border border-hero-border bg-background-card p-4 hover:border-accent-gold/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Icon className={`h-5 w-5 ${checkType.color}`} />
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded bg-hero-dark/50 text-accent-gold font-barlow font-bold text-sm border border-accent-gold/50">
                                  DC {result.dc}
                                </span>
                                {result.is_critical && (
                                  <span className="px-3 py-1 rounded bg-accent-blood/20 text-accent-blood font-barlow font-bold text-xs border border-accent-blood/50">
                                    Kritisch
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                              {result.result || "Kein Ergebnis definiert."}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEdit(originalIndex)}
                              className="p-2 rounded text-gray-400 hover:text-blue-400 hover:bg-hero-dark transition-colors"
                              title="Bearbeiten"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(originalIndex)}
                              className="p-2 rounded text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                              title="Löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

