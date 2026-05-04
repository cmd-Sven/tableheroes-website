"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  createCharacterItem,
  updateCharacterItem,
} from "@/src/lib/actions/character-inventory-actions";
import {
  type CharacterItem,
  type InventoryCategory,
} from "@/src/types/inventory";

const CATEGORY_OPTIONS: Array<{ id: InventoryCategory; label: string }> = [
  { id: "Weapon", label: "Waffen" },
  { id: "Equipment", label: "Ausrüstung" },
  { id: "Consumable", label: "Verbrauchsgüter" },
  { id: "Story", label: "Story-Items" },
];

function iconForCategory(category: InventoryCategory) {
  if (category === "Weapon") return "sword";
  if (category === "Consumable") return "flask";
  if (category === "Story") return "scroll";
  return "bag";
}

export function ItemEditorModal({
  characterId,
  item,
  onClose,
  onSaved,
}: {
  characterId: string;
  item: CharacterItem | null;
  onClose: () => void;
  onSaved: (item: CharacterItem) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("Equipment");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setCategory(item?.category === "CoinGem" ? "Equipment" : item?.category ?? "Equipment");
    setError(null);
  }, [item]);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const saved = item
          ? await updateCharacterItem({
              itemId: item.id,
              name,
              description,
              category,
              iconType: iconForCategory(category),
            })
          : await createCharacterItem({
              characterId,
              name,
              description,
              category,
              iconType: iconForCategory(category),
            });
        onSaved(saved);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Item konnte nicht gespeichert werden.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-amber-900/70 bg-linear-to-b from-background-card via-emerald-950 to-background-dark shadow-2xl">
        <div className="flex items-center justify-between border-b border-amber-900/60 px-5 py-4">
          <div>
            <h2 className="font-barlow text-lg font-extrabold uppercase tracking-wide text-accent-gold">
              {item ? "Item bearbeiten" : "Neues Item"}
            </h2>
            <p className="font-libre text-xs text-gray-400">
              Minimal, rollenspielorientiert, ohne Werteballast.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-background-dark hover:text-white"
            aria-label="Item-Editor schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <label className="block">
            <span className="mb-1 block font-barlow text-xs font-bold uppercase text-accent-gold/80">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-amber-900/60 bg-background-dark px-3 py-2 font-libre text-sm text-white outline-none focus:border-accent-gold"
              placeholder="z. B. Verbeulter Silberkelch"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-barlow text-xs font-bold uppercase text-accent-gold/80">
              Kurzbeschreibung
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none rounded border border-amber-900/60 bg-background-dark px-3 py-2 font-libre text-sm text-white outline-none focus:border-accent-gold"
              placeholder="Was macht dieses Item erzählerisch interessant?"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-barlow text-xs font-bold uppercase text-accent-gold/80">
              Kategorie
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as InventoryCategory)}
              className="w-full rounded border border-amber-900/60 bg-background-dark px-3 py-2 font-barlow text-sm font-bold uppercase text-white outline-none focus:border-accent-gold"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="font-libre text-sm text-red-300">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-amber-900/60 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-amber-900/60 bg-background-dark px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-300 transition-colors hover:border-accent-gold hover:text-accent-gold"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded border border-accent-gold/70 bg-accent-gold/15 px-4 py-2 font-barlow text-xs font-bold uppercase text-accent-gold transition-colors hover:bg-accent-gold/25 disabled:opacity-50"
          >
            {isPending ? "Speichert..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
