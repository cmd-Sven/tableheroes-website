"use client";

import React, { useState } from "react";
import { Plus, X, Eye, Edit2, Save, Trash2 } from "lucide-react";

const SKILL_OPTIONS = ["Geschichte", "Arkan", "Religion", "Überlebenskunst", "Wissen (Lokal)", "Diplomatie"] as const;

type StorySection = {
  dc: number;
  skill: string;
  content: string;
  is_revealed: boolean;
};

type Props = {
  sections: StorySection[];
  onChange: (sections: StorySection[]) => void;
};

export function StoriesAndLegendsEditor({ sections, onChange }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingSection, setEditingSection] = useState<StorySection | null>(null);

  const handleAdd = () => {
    const newSection: StorySection = {
      dc: 12,
      skill: "Geschichte",
      content: "",
      is_revealed: false,
    };
    onChange([...sections, newSection]);
    setEditingIndex(sections.length);
    setEditingSection(newSection);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingSection({ ...sections[index] });
  };

  const handleSave = () => {
    if (editingIndex === null || !editingSection) return;
    const updated = [...sections];
    updated[editingIndex] = editingSection;
    onChange(updated.sort((a, b) => a.dc - b.dc));
    setEditingIndex(null);
    setEditingSection(null);
  };

  const handleDelete = (index: number) => {
    if (confirm("Diesen Abschnitt wirklich löschen?")) {
      const updated = sections.filter((_, i) => i !== index);
      onChange(updated);
      setEditingIndex(null);
      setEditingSection(null);
    }
  };

  return (
    <div className="rounded-lg border-2 border-accent-gold/50 bg-slate-900/80 p-6 space-y-4">
      <div>
        <h3 className="font-barlow font-bold text-lg uppercase text-accent-gold flex items-center gap-2 mb-1">
          <Eye className="h-5 w-5" />
          Geschichten & Legenden
        </h3>
        <p className="font-libre text-sm text-gray-400 mb-3">
          DC-basierte Abschnitte, die Spieler per Probe (z. B. Geschichte, Arkan) oder NPC-Infos freischalten. Der GM kann Abschnitte manuell freigeben.
        </p>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded border border-hero-vibrant bg-hero-vibrant/10 text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors font-barlow font-bold text-sm uppercase"
        >
          <Plus className="h-4 w-4" />
          Abschnitt hinzufügen
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="font-libre text-sm text-gray-500 italic">Noch keine Geschichten & Legenden definiert.</p>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const isEditing = editingIndex === index;
            return (
              <div
                key={index}
                className={`rounded-lg border p-4 ${isEditing ? "border-accent-gold" : "border-hero-border bg-slate-900/50"}`}
              >
                {isEditing && editingSection ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 font-barlow font-semibold text-xs uppercase text-gray-300">DC</label>
                        <input
                          type="number"
                          min={5}
                          max={30}
                          value={editingSection.dc}
                          onChange={(e) => setEditingSection({ ...editingSection, dc: parseInt(e.target.value) || 10 })}
                          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-barlow font-semibold text-xs uppercase text-gray-300">Fertigkeit</label>
                        <select
                          value={editingSection.skill}
                          onChange={(e) => setEditingSection({ ...editingSection, skill: e.target.value })}
                          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white"
                        >
                          {SKILL_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 font-barlow font-semibold text-xs uppercase text-gray-300">Inhalt (für GM bei diesem Wurf)</label>
                      <textarea
                        value={editingSection.content}
                        onChange={(e) => setEditingSection({ ...editingSection, content: e.target.value })}
                        rows={3}
                        className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white resize-none"
                        placeholder="z. B. Angeblich gibt es hier einen unterirdischen Teil für illegale Käfigkämpfe."
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingSection.is_revealed}
                        onChange={(e) => setEditingSection({ ...editingSection, is_revealed: e.target.checked })}
                        className="rounded border-hero-dark bg-slate-800 text-accent-gold"
                      />
                      <span className="font-libre text-sm text-gray-300">Manuell für Spieler freigegeben</span>
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded bg-hero-vibrant text-black font-barlow font-bold text-sm">
                        <Save className="h-4 w-4" /> Speichern
                      </button>
                      <button type="button" onClick={() => handleDelete(index)} className="flex items-center gap-1 px-3 py-1.5 rounded border border-red-700 text-red-400 hover:bg-red-900/30 font-barlow font-bold text-sm">
                        <Trash2 className="h-4 w-4" /> Löschen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-barlow font-bold text-accent-gold">DC {section.dc}</span>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="font-libre text-sm text-gray-300">{section.skill}</span>
                      {section.is_revealed && <span className="ml-2 text-xs text-green-400">(freigegeben)</span>}
                      {section.content && <p className="font-libre text-sm text-gray-400 mt-1 line-clamp-2">{section.content}</p>}
                    </div>
                    <button type="button" onClick={() => handleEdit(index)} className="p-1.5 rounded text-gray-400 hover:text-accent-gold hover:bg-accent-gold/10">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
