"use client";

import {
  CHARACTER_FLAWS,
  MAX_CHARACTER_FLAWS,
  getFlawById,
  flawUnlockHint,
  flawEmptyHint,
  type CharacterFlawEntry,
} from "@/src/lib/characters/character-flaws";

export type CharacterFlawPickerProps = {
  characterFlaws: CharacterFlawEntry[];
  onCharacterFlawsChange: (entries: CharacterFlawEntry[]) => void;
  readOnly?: boolean;
  /** Kompaktere Darstellung für den Attributebogen */
  compact?: boolean;
};

export function CharacterFlawPicker({
  characterFlaws,
  onCharacterFlawsChange,
  readOnly = false,
  compact = false,
}: CharacterFlawPickerProps) {
  const usedFlawIds = new Set(characterFlaws.map((f) => f.flawId).filter(Boolean));
  const hasSelectedFlaws = usedFlawIds.size > 0;

  const textareaClass = `w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none ${
    readOnly ? "cursor-default opacity-80" : ""
  }`;

  function setFlawAt(index: number, patch: Partial<CharacterFlawEntry>) {
    const slots: CharacterFlawEntry[] = Array.from({ length: MAX_CHARACTER_FLAWS }, (_, i) =>
      characterFlaws[i] ?? { flawId: "", story: "" },
    );
    slots[index] = { ...slots[index], ...patch };
    onCharacterFlawsChange(slots.filter((f) => f.flawId.trim()).slice(0, MAX_CHARACTER_FLAWS));
  }

  function removeFlawAt(index: number) {
    const slots: CharacterFlawEntry[] = Array.from({ length: MAX_CHARACTER_FLAWS }, (_, i) =>
      characterFlaws[i] ?? { flawId: "", story: "" },
    );
    slots[index] = { flawId: "", story: "" };
    onCharacterFlawsChange(slots.filter((f) => f.flawId.trim()).slice(0, MAX_CHARACTER_FLAWS));
  }

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
      <div className="border-b border-hero-dark pb-2">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">Makel</h3>
        <p className="mt-1 font-libre text-xs text-gray-500">
          {hasSelectedFlaws ? flawUnlockHint() : flawEmptyHint()}
        </p>
      </div>

      {Array.from({ length: MAX_CHARACTER_FLAWS }, (_, slotIndex) => {
        const entry = characterFlaws[slotIndex];
        const flawDef = entry?.flawId ? getFlawById(entry.flawId) : null;

        return (
          <div
            key={slotIndex}
            className={`rounded-lg border border-hero-border/60 bg-hero-dark/20 p-4 space-y-3 ${
              compact ? "p-3 space-y-2" : ""
            }`}
          >
            <p className="font-barlow text-xs font-bold uppercase text-gray-400">
              Makel {slotIndex + 1}
              {slotIndex === 0 ? (
                <span className="ml-2 text-[10px] font-normal text-gray-500">(optional)</span>
              ) : null}
            </p>

            <select
              value={entry?.flawId ?? ""}
              disabled={readOnly}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  removeFlawAt(slotIndex);
                  return;
                }
                setFlawAt(slotIndex, {
                  flawId: id,
                  story: entry?.story ?? "",
                });
              }}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
            >
              <option value="">— Makel auswählen —</option>
              {CHARACTER_FLAWS.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                  disabled={usedFlawIds.has(f.id) && entry?.flawId !== f.id}
                >
                  {f.nr}. {f.name}
                </option>
              ))}
            </select>

            {flawDef ? (
              <div
                className={`rounded border border-accent-blood/30 bg-accent-blood/5 space-y-2 text-xs ${
                  compact ? "p-2" : "p-3"
                }`}
              >
                {!compact ? (
                  <p className="font-libre text-gray-300">{flawDef.description}</p>
                ) : null}
                <p>
                  <span className="font-barlow font-bold uppercase text-accent-blood">Nachteil:</span>{" "}
                  <span className="font-libre text-gray-300">{flawDef.mainDisadvantage}</span>
                </p>
                <p>
                  <span className="font-barlow font-bold uppercase text-hero-vibrant">Vorteil:</span>{" "}
                  <span className="font-libre text-gray-300">{flawDef.smallAdvantage}</span>
                </p>
                {!compact ? (
                  <details className="font-libre text-gray-400">
                    <summary className="cursor-pointer text-hero-vibrant hover:underline">
                      Details &amp; Rollenspiel
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap">{flawDef.effects}</p>
                    <p className="mt-2 italic">{flawDef.roleplay}</p>
                  </details>
                ) : null}
              </div>
            ) : null}

            {flawDef ? (
              <div>
                <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
                  Wie ist es dazu gekommen?
                </label>
                <textarea
                  value={entry?.story ?? ""}
                  readOnly={readOnly}
                  onChange={(e) => setFlawAt(slotIndex, { story: e.target.value })}
                  rows={compact ? 2 : 3}
                  placeholder="Beschreibe die Hintergrundgeschichte zu diesem Makel…"
                  className={textareaClass}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

/** Kurzübersicht für den Biografie-Tab — verweist auf Attributebogen zur Bearbeitung. */
export function CharacterFlawSummary({
  characterFlaws,
}: {
  characterFlaws: CharacterFlawEntry[];
}) {
  const selected = characterFlaws.filter((f) => f.flawId.trim());

  if (selected.length === 0) {
    return (
      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-2">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold border-b border-hero-dark pb-2">
          Makel
        </h3>
        <p className="font-libre text-xs text-gray-500">{flawEmptyHint()}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
      <div className="border-b border-hero-dark pb-2">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">Makel</h3>
        <p className="mt-1 font-libre text-xs text-gray-500">
          Ausgewählte Makel — bearbeiten im Tab „Attribute“.
        </p>
      </div>
      <ul className="space-y-2">
        {selected.map((entry) => {
          const def = getFlawById(entry.flawId);
          if (!def) return null;
          return (
            <li
              key={entry.flawId}
              className="rounded border border-hero-border/40 bg-hero-dark/20 px-3 py-2"
            >
              <p className="font-barlow text-xs font-bold uppercase text-white">
                {def.nr}. {def.name}
              </p>
              <p className="font-libre text-xs text-gray-400 mt-0.5">{def.mainDisadvantage}</p>
              {entry.story.trim() ? (
                <p className="font-libre text-xs text-gray-500 mt-1 italic line-clamp-2">
                  {entry.story.trim()}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
