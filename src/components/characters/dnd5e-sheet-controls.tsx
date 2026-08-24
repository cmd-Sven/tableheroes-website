/**
 * Small shared inputs/controls for the D&D 5e character sheet panel.
 */
"use client";

import { Loader2, Save } from "lucide-react";
import type { CharacterSheetMessageKey } from "@/src/lib/i18n/character-sheet";

export function ToggleSwitch({
  checked,
  disabled,
  onToggle,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-hero-vibrant focus:ring-offset-2 focus:ring-offset-background-dark disabled:opacity-50 ${
        checked ? "border-hero-vibrant bg-hero-vibrant" : "border-hero-border bg-hero-dark"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function CharacterSheetModeBar({
  editMode,
  canEdit,
  isPending,
  onToggle,
  onSave,
  t,
}: {
  editMode: boolean;
  canEdit: boolean;
  isPending: boolean;
  onToggle: () => void;
  onSave: () => void;
  t: (key: CharacterSheetMessageKey, vars?: Record<string, string | number>) => string;
}) {
  const modeLabel = editMode ? t("sheet.editModeBadge") : t("sheet.viewModeBadge");
  const toggleLabel = editMode ? t("sheet.viewModeAria") : t("sheet.editModeAria");

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-t-lg border-t px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md ${
        editMode
          ? "border-hero-vibrant/70 bg-hero-vibrant/15"
          : "border-hero-dark/80 bg-background-card/95"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`inline-flex shrink-0 items-center rounded border px-3 py-1 font-barlow text-[11px] font-bold uppercase tracking-wide ${
            editMode
              ? "border-hero-vibrant bg-hero-vibrant/25 text-hero-vibrant"
              : "border-hero-dark/70 bg-hero-dark/50 text-gray-400"
          }`}
        >
          {modeLabel}
        </span>
        <p className="hidden font-libre text-xs text-gray-400 sm:block">
          {editMode ? t("sheet.editModeActiveHint") : t("sheet.viewModeActiveHint")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {editMode ? t("sheet.switchToView") : t("sheet.switchToEdit")}
          </span>
          <ToggleSwitch
            checked={editMode}
            disabled={!canEdit}
            onToggle={onToggle}
            label={toggleLabel}
          />
        </div>

        {editMode && canEdit ? (
          <button
            type="button"
            disabled={isPending}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow text-[11px] font-bold uppercase text-black hover:bg-yellow-500 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("sheet.save")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  disabled,
  className = "",
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1 text-center font-barlow text-sm text-white disabled:opacity-60 ${className}`}
    />
  );
}

export function TextInput({
  value,
  onChange,
  disabled,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-1.5 font-libre text-sm text-white disabled:opacity-60 ${className}`}
    />
  );
}

