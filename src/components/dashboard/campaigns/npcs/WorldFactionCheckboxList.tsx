"use client";

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
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

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
        <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-hero-dark bg-slate-900 p-2">
          {factions.map((faction) => {
            const checked = selectedIds.includes(faction.id);
            const isPrimary = selectedIds[0] === faction.id;
            return (
              <label
                key={faction.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 font-libre text-sm text-gray-200 hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(faction.id)}
                  className="h-4 w-4 accent-[#379806]"
                />
                <span className="min-w-0 truncate">{faction.name}</span>
                {isPrimary ? (
                  <span className="shrink-0 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                    Primär
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      )}
      <p className="mt-1 font-libre text-[10px] text-gray-500">
        Die zuerst gewählte Fraktion ist die primäre Zugehörigkeit.
      </p>
    </fieldset>
  );
}
