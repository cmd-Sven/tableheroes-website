"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export type SearchableOption = {
  value: string;
  label: string;
  secondary?: string;
};

type Props = {
  options: SearchableOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  noneLabel?: string;
  /** Wenn true, erscheint „— Keiner —“ und Clear. */
  allowNone?: boolean;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  /** Optional: aria-labelledby / label für Screenreader */
  "aria-label"?: string;
  id?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Suchen…",
  noneLabel = "— Keiner —",
  allowNone = true,
  disabled = false,
  className = "",
  size = "sm",
  "aria-label": ariaLabel,
  id,
}: Props) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const inputId = id ?? `${autoId}-input`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.secondary?.toLowerCase().includes(q) ?? false)
    );
  }, [options, query]);

  const rows = useMemo(() => {
    const base = filtered.map((o) => ({ kind: "option" as const, option: o }));
    if (allowNone && (!query.trim() || noneLabel.toLowerCase().includes(query.trim().toLowerCase()))) {
      return [{ kind: "none" as const }, ...base];
    }
    return base;
  }, [allowNone, filtered, noneLabel, query]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const commit = useCallback(
    (next: string | null) => {
      onChange(next);
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [onChange]
  );

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlight((h) => Math.min(h + 1, Math.max(rows.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const row = rows[highlight];
      if (!row) return;
      if (row.kind === "none") commit(null);
      else commit(row.option.value);
      return;
    }
    if (e.key === "Home" && open) {
      e.preventDefault();
      setHighlight(0);
      return;
    }
    if (e.key === "End" && open) {
      e.preventDefault();
      setHighlight(Math.max(rows.length - 1, 0));
    }
  };

  const pad = size === "sm" ? "p-2 text-sm" : "p-3";
  const displayValue = open ? query : selected?.label ?? "";

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${autoId}-opt-${highlight}` : undefined}
          aria-label={ariaLabel}
          disabled={disabled}
          value={displayValue}
          placeholder={selected ? selected.label : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
          onKeyDown={onKeyDown}
          className={`w-full rounded bg-slate-900 border border-hero-dark ${pad} text-white font-libre focus:border-hero-vibrant outline-none pr-16 disabled:opacity-50`}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {allowNone && value ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Auswahl löschen"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                commit(null);
              }}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-hero-dark/40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? "Liste schließen" : "Liste öffnen"}
            disabled={disabled}
            onClick={() => {
              if (open) {
                setOpen(false);
                setQuery("");
              } else {
                openList();
                inputRef.current?.focus();
              }
            }}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-hero-dark/40"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-hero-border bg-slate-900 shadow-xl"
        >
          {rows.length === 0 ? (
            <li className="px-3 py-2 font-libre text-sm text-gray-500">Keine Treffer</li>
          ) : (
            rows.map((row, index) => {
              if (row.kind === "none") {
                const active = highlight === index;
                const selectedNone = !value;
                return (
                  <li
                    key="__none__"
                    id={`${autoId}-opt-${index}`}
                    role="option"
                    aria-selected={selectedNone}
                    data-index={index}
                    className={`cursor-pointer px-3 py-2 font-libre text-sm text-gray-300 ${
                      active ? "bg-hero-dark/60" : ""
                    } ${selectedNone ? "text-hero-vibrant" : ""}`}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(null)}
                  >
                    {noneLabel}
                  </li>
                );
              }
              const { option } = row;
              const active = highlight === index;
              const isSelected = value === option.value;
              return (
                <li
                  key={option.value}
                  id={`${autoId}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 font-libre text-sm text-white ${
                    active ? "bg-hero-dark/60" : ""
                  } ${isSelected ? "bg-hero-vibrant/15" : ""}`}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(option.value)}
                >
                  <span className="min-w-0 truncate">
                    {option.label}
                    {option.secondary ? (
                      <span className="text-gray-400"> ({option.secondary})</span>
                    ) : null}
                  </span>
                  {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-hero-vibrant" /> : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
