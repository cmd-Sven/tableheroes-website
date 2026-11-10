"use client";

import { SearchableMultiSelect } from "@/src/components/ui/SearchableMultiSelect";

type FactionOption = { id: string; name: string };

type Props = {
  factions: FactionOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  compact?: boolean;
};

export function WorldFactionCheckboxList({
  factions,
  selectedIds,
  onChange,
  compact = false,
}: Props) {
  return (
    <fieldset className="min-w-0">
      <legend
        className={
          compact
            ? "mb-1 block font-barlow font-bold text-xs uppercase text-gray-400"
            : "mb-2 block font-barlow font-bold text-sm uppercase text-gray-300"
        }
      >
        Welt-Fraktionen (mehrere möglich)
      </legend>
      {factions.length === 0 ? (
        <p className="font-libre text-xs text-gray-500">
          In dieser Welt sind noch keine Fraktionen angelegt.
        </p>
      ) : (
        <SearchableMultiSelect
          options={factions.map((f) => ({ value: f.id, label: f.name }))}
          values={selectedIds}
          onChange={onChange}
          placeholder="Fraktion suchen…"
          markPrimary
          primaryLabel="Primär"
          size={compact ? "sm" : "md"}
          aria-label="Welt-Fraktionen"
        />
      )}
    </fieldset>
  );
}
