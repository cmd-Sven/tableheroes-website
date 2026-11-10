"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { SearchableOption } from "./SearchableSelect";

type Props = {
  options: SearchableOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  /** Erste Auswahl bleibt primär (Reihenfolge beibehalten). */
  markPrimary?: boolean;
  primaryLabel?: string;
  emptyHint?: string;
  "aria-label"?: string;
  id?: string;
};

export function SearchableMultiSelect({
  options,
  values,
  onChange,
  placeholder = "Suchen und auswählen…",
  disabled = false,
  className = "",
  size = "sm",
  markPrimary = false,
  primaryLabel = "Primär",
  emptyHint,
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

  const byValue = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o]));
    return map;
  }, [options]);

  const selectedOptions = useMemo(
    () =>
      values
        .map((v) => byValue.get(v) ?? { value: v, label: v })
        .filter(Boolean) as SearchableOption[],
    [byValue, values]
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
  }, [highlight, open, filtered.length]);

  const toggle = useCallback(
    (optionValue: string) => {
      if (values.includes(optionValue)) {
        onChange(values.filter((v) => v !== optionValue));
      } else {
        // Reihenfolge: zuerst gewählt = primär
        onChange([...values, optionValue]);
      }
    },
    [onChange, values]
  );

  const remove = useCallback(
    (optionValue: string) => {
      onChange(values.filter((v) => v !== optionValue));
    },
    [onChange, values]
  );

  const openList = () => {
    if (disabled) return;
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "Backspace" && !query && values.length > 0) {
      e.preventDefault();
      onChange(values.slice(0, -1));
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
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
      const opt = filtered[highlight];
      if (opt) {
        toggle(opt.value);
        setQuery("");
      }
    }
  };

  const pad = size === "sm" ? "p-2 text-sm" : "p-3";

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {selectedOptions.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {selectedOptions.map((opt, index) => {
            const isPrimary = markPrimary && index === 0;
            return (
              <span
                key={opt.value}
                className={`inline-flex max-w-full items-center gap-1 rounded border px-2 py-0.5 font-libre text-xs ${
                  isPrimary
                    ? "border-accent-gold/60 bg-accent-gold/10 text-accent-gold"
                    : "border-hero-dark bg-slate-900 text-gray-200"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isPrimary ? (
                  <span className="font-barlow text-[9px] font-bold uppercase tracking-wide opacity-80">
                    {primaryLabel}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`${opt.label} entfernen`}
                  disabled={disabled}
                  onClick={() => remove(opt.value)}
                  className="shrink-0 rounded p-0.5 text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-multiselectable="true"
          aria-activedescendant={open && filtered[highlight] ? `${autoId}-opt-${highlight}` : undefined}
          aria-label={ariaLabel}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
          onKeyDown={onKeyDown}
          className={`w-full rounded bg-slate-900 border border-hero-dark ${pad} text-white font-libre focus:border-hero-vibrant outline-none pr-9 disabled:opacity-50`}
        />
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
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-white hover:bg-hero-dark/40"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-hero-border bg-slate-900 shadow-xl"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 font-libre text-sm text-gray-500">
              {options.length === 0 && emptyHint ? emptyHint : "Keine Treffer"}
            </li>
          ) : (
            filtered.map((option, index) => {
              const checked = values.includes(option.value);
              const isPrimary = markPrimary && values[0] === option.value;
              const active = highlight === index;
              return (
                <li
                  key={option.value}
                  id={`${autoId}-opt-${index}`}
                  role="option"
                  aria-selected={checked}
                  data-index={index}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 font-libre text-sm text-white ${
                    active ? "bg-hero-dark/60" : ""
                  } ${checked ? "bg-hero-vibrant/10" : ""}`}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    toggle(option.value);
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                >
                  <span className="min-w-0 truncate">
                    {option.label}
                    {option.secondary ? (
                      <span className="text-gray-400"> ({option.secondary})</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {isPrimary ? (
                      <span className="font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold">
                        {primaryLabel}
                      </span>
                    ) : null}
                    {checked ? <Check className="h-3.5 w-3.5 text-hero-vibrant" /> : null}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      ) : null}

      {markPrimary && values.length > 0 ? (
        <p className="mt-1 font-libre text-[10px] text-gray-500">
          Die zuerst gewählte Option ist die primäre Zugehörigkeit.
        </p>
      ) : null}
    </div>
  );
}
