"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AutocompleteCombobox } from "./AutocompleteCombobox";

type ImportantPerson = {
  name: string;
  relation: string;
  age: number;
  alignment: string;
  npc_id?: string | null;
};

type AddPersonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (person: ImportantPerson) => void;
  npcs: Array<{ id: string; name: string; factions?: { name: string } | null }>;
  getFactionName?: (npc: any) => string;
};

const RELATIONS = ["Nemesis", "Bekannter", "Freund", "Familie", "Mentor", "Kontakt"];
const ALIGNMENTS = [
  "Rechtschaffen Gut",
  "Neutral Gut",
  "Chaotisch Gut",
  "Rechtschaffen Neutral",
  "Neutral",
  "Chaotisch Neutral",
  "Rechtschaffen Böse",
  "Neutral Böse",
  "Chaotisch Böse",
];

export function AddPersonModal({ isOpen, onClose, onAdd, npcs, getFactionName }: AddPersonModalProps) {
  const [npcValue, setNpcValue] = useState<{ id: string | null; name: string }>({
    id: null,
    name: "",
  });
  const [relation, setRelation] = useState("Freund");
  const [age, setAge] = useState("");
  const [alignment, setAlignment] = useState("Neutral");

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!npcValue.name.trim()) {
      alert("Bitte gib einen Namen ein.");
      return;
    }

    onAdd({
      name: npcValue.name,
      relation,
      age: parseInt(age) || 0,
      alignment,
      npc_id: npcValue.id,
    });

    // Reset
    setNpcValue({ id: null, name: "" });
    setRelation("Freund");
    setAge("");
    setAlignment("Neutral");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg border border-hero-dark bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-dark">
          <h2 className="font-barlow font-bold text-xl uppercase text-hero-vibrant">
            Person hinzufügen
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <AutocompleteCombobox
            label="Name *"
            options={npcs.map((npc) => ({
              id: npc.id,
              name: getFactionName ? getFactionName(npc) : npc.name,
            }))}
            value={npcValue}
            onChange={setNpcValue}
            placeholder="NPC wählen oder neuen Namen eingeben..."
          />

          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Beziehung *
            </label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
            >
              {RELATIONS.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Alter
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="z.B. 35"
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
              Gesinnung
            </label>
            <select
              value={alignment}
              onChange={(e) => setAlignment(e.target.value)}
              className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white focus:border-hero-vibrant outline-none"
            >
              {ALIGNMENTS.map((align) => (
                <option key={align} value={align}>
                  {align}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex-none p-6 border-t border-hero-dark bg-background-dark/50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-hero-border px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-300 hover:bg-hero-dark transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-xs text-background-dark shadow-lg transition-all hover:scale-[1.02]"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

