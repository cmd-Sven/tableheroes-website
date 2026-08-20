"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, CheckSquare, LayoutGrid, List, Search, Square } from "lucide-react";

export type StagePrepDeckItem = {
  id: string;
  name: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
};

type VisibilityFilter = "all" | "in" | "out";
type CatalogView = "tiles" | "compact";

const COLLAPSE_AFTER = 36;
const CHIP_LIMIT = 18;
const LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "#",
] as const;

function letterKey(name: string): string {
  const raw = name.trim().charAt(0).toUpperCase();
  if (raw === "Ä") return "A";
  if (raw === "Ö") return "O";
  if (raw === "Ü") return "U";
  return /[A-Z]/.test(raw) ? raw : "#";
}

type Props = {
  items: StagePrepDeckItem[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  searchPlaceholder: string;
  emptyLabel: string;
  entityLabel: string;
};

export function StagePrepDeckPicker({
  items,
  selectedIds,
  onChange,
  searchPlaceholder,
  emptyLabel,
  entityLabel,
}: Props) {
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [view, setView] = useState<CatalogView>("tiles");
  const [openLetter, setOpenLetter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const inDeck = selectedIds.has(item.id);
      if (visibility === "in" && !inDeck) return false;
      if (visibility === "out" && inDeck) return false;
      if (!term) return true;
      return `${item.name} ${item.subtitle ?? ""} ${item.badge ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [items, search, selectedIds, visibility]);

  const groups = useMemo(() => {
    const map = new Map<string, StagePrepDeckItem[]>();
    for (const item of filtered) {
      const key = letterKey(item.name);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "de"));
    }
    return LETTERS.filter((letter) => map.has(letter)).map((letter) => ({
      letter,
      items: map.get(letter) ?? [],
    }));
  }, [filtered]);

  const collapseLetters = items.length > COLLAPSE_AFTER && !search.trim();
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function selectVisible() {
    const next = new Set(selectedIds);
    for (const item of filtered) next.add(item.id);
    onChange(next);
  }

  function deselectVisible() {
    const visible = new Set(filtered.map((item) => item.id));
    const next = new Set(selectedIds);
    for (const id of visible) next.delete(id);
    onChange(next);
  }

  const hasFilter = Boolean(search.trim()) || visibility !== "all";
  const selectLabel = hasFilter ? "Treffer anwählen" : "Alle anwählen";
  const deselectLabel = hasFilter ? "Treffer abwählen" : "Alle abwählen";

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
          {selectedIds.size} von {items.length} {entityLabel} im Deck
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectVisible}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded border border-hero-vibrant/60 bg-hero-vibrant/15 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectLabel}
          </button>
          <button
            type="button"
            onClick={deselectVisible}
            disabled={filtered.every((item) => !selectedIds.has(item.id))}
            className="inline-flex items-center gap-1.5 rounded border border-hero-border/70 bg-slate-900 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-200 hover:border-hero-vibrant disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Square className="h-3.5 w-3.5" />
            {deselectLabel}
          </button>
        </div>
      </div>

      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 rounded border border-hero-border/30 bg-background-dark/60 p-2">
          {selectedItems.slice(0, CHIP_LIMIT).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              title="Aus Deck entfernen"
              className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-hero-vibrant/40 bg-hero-vibrant/10 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20"
            >
              <span className="truncate">{item.name}</span>
              <span aria-hidden className="text-gray-400">
                ×
              </span>
            </button>
          ))}
          {selectedItems.length > CHIP_LIMIT ? (
            <span className="self-center font-libre text-[11px] text-gray-500">
              +{selectedItems.length - CHIP_LIMIT} weitere
            </span>
          ) : null}
        </div>
      ) : (
        <p className="font-libre text-xs text-gray-500">
          Noch niemand im Deck. Kacheln antippen oder „Alle anwählen“.
        </p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpenLetter(null);
          }}
          placeholder={searchPlaceholder}
          className="w-full rounded border border-hero-dark bg-slate-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-hero-vibrant"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "Alle"],
              ["in", "Im Deck"],
              ["out", "Nicht im Deck"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVisibility(id)}
              className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                visibility === id
                  ? "bg-accent-gold/20 text-accent-gold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setView("tiles")}
            aria-pressed={view === "tiles"}
            title="Kachelansicht"
            className={`rounded border p-1.5 ${
              view === "tiles"
                ? "border-hero-vibrant text-hero-vibrant"
                : "border-hero-border/40 text-gray-500"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView("compact")}
            aria-pressed={view === "compact"}
            title="Kompaktliste"
            className={`rounded border p-1.5 ${
              view === "compact"
                ? "border-hero-vibrant text-hero-vibrant"
                : "border-hero-border/40 text-gray-500"
            }`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {groups.map(({ letter, items: letterItems }) => {
            const active = !collapseLetters || openLetter === letter;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => {
                  if (!collapseLetters) {
                    document
                      .getElementById(`deck-letter-${letter}`)
                      ?.scrollIntoView({ block: "nearest" });
                    return;
                  }
                  setOpenLetter((prev) => (prev === letter ? null : letter));
                }}
                className={`min-w-[1.75rem] rounded px-1.5 py-1 font-barlow text-[11px] font-bold ${
                  active
                    ? "bg-hero-vibrant/20 text-hero-vibrant"
                    : "bg-slate-900 text-gray-400 hover:text-white"
                }`}
              >
                {letter}
                <span className="ml-0.5 text-[9px] text-gray-500">{letterItems.length}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="py-6 text-center font-libre text-sm text-gray-500">
          {items.length === 0 ? emptyLabel : "Keine Treffer für die aktuelle Filterung."}
        </p>
      ) : view === "tiles" ? (
        <div className="max-h-[min(70vh,40rem)] space-y-5 overflow-y-auto rounded border border-hero-border/40 bg-background-dark/90 p-3">
          {groups.map(({ letter, items: letterItems }) => {
            if (collapseLetters && openLetter !== letter) return null;
            return (
              <section
                key={letter}
                id={`deck-letter-${letter}`}
                style={{ contentVisibility: "auto", containIntrinsicSize: "auto 280px" }}
              >
                <h3 className="mb-2 font-cinzel text-sm font-bold text-accent-gold">{letter}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {letterItems.map((item) => {
                    const on = selectedIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item.id)}
                        aria-pressed={on}
                        className={`group overflow-hidden rounded-md border text-left transition-transform hover:scale-[1.02] ${
                          on
                            ? "border-hero-vibrant bg-hero-vibrant/15 ring-1 ring-hero-vibrant/70"
                            : "border-hero-dark bg-background-card hover:border-hero-border"
                        }`}
                      >
                        <div className="relative aspect-[3/4] w-full bg-hero-dark/60">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 45vw, 140px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center font-barlow text-2xl font-extrabold text-accent-gold">
                              {item.name[0]?.toUpperCase() ?? "?"}
                            </span>
                          )}
                          {on ? (
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-hero-vibrant p-0.5 text-background-dark">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="truncate font-barlow text-xs font-bold uppercase text-white">
                            {item.name}
                          </p>
                          {item.subtitle ? (
                            <p className="truncate font-libre text-[10px] text-gray-400">
                              {item.subtitle}
                            </p>
                          ) : null}
                          {item.badge ? (
                            <p className="mt-0.5 font-barlow text-[9px] font-bold uppercase text-amber-400">
                              {item.badge}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {collapseLetters && openLetter == null ? (
            <p className="py-8 text-center font-libre text-sm text-gray-500">
              Buchstaben oben antippen, um den Katalog zu öffnen — oder suchen.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="max-h-[min(70vh,40rem)] overflow-y-auto rounded border border-hero-border/40 bg-background-dark/90">
          {groups.map(({ letter, items: letterItems }) => {
            if (collapseLetters && openLetter !== letter) return null;
            return (
              <section
                key={letter}
                id={`deck-letter-${letter}-list`}
                style={{ contentVisibility: "auto", containIntrinsicSize: "auto 120px" }}
              >
                <h3 className="sticky top-0 z-[1] border-b border-hero-border/30 bg-background-dark/95 px-3 py-1.5 font-cinzel text-sm font-bold text-accent-gold">
                  {letter}
                </h3>
                <ul>
                  {letterItems.map((item) => {
                    const on = selectedIds.has(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          aria-pressed={on}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-800/80 ${
                            on ? "bg-hero-vibrant/10" : ""
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              on
                                ? "border-hero-vibrant bg-hero-vibrant text-background-dark"
                                : "border-hero-border text-transparent"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span className="relative h-10 w-8 shrink-0 overflow-hidden rounded border border-hero-dark bg-hero-dark/50">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center font-barlow text-[10px] font-bold text-accent-gold">
                                {item.name[0]?.toUpperCase() ?? "?"}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-barlow text-sm font-bold text-white">
                              {item.name}
                            </span>
                            {item.subtitle ? (
                              <span className="block truncate font-libre text-[11px] text-gray-400">
                                {item.subtitle}
                              </span>
                            ) : null}
                          </span>
                          {item.badge ? (
                            <span className="shrink-0 font-barlow text-[9px] font-bold uppercase text-amber-400">
                              {item.badge}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {collapseLetters && openLetter == null ? (
            <p className="py-8 text-center font-libre text-sm text-gray-500">
              Buchstaben oben antippen, um den Katalog zu öffnen — oder suchen.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
