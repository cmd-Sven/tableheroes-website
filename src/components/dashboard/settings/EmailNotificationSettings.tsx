"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { updateEmailNotificationPreferences } from "@/src/app/dashboard/dashboard-actions";
import {
  EMAIL_NOTIFICATION_LABELS,
  EMAIL_NOTIFICATION_KINDS,
  type EmailNotificationKind,
  type EmailNotificationPreferences,
} from "@/src/lib/email/notification-preferences";

type Props = {
  initialPreferences: EmailNotificationPreferences;
};

type ToggleKey = "master_enabled" | EmailNotificationKind;

export function EmailNotificationSettings({ initialPreferences }: Props) {
  const [prefs, setPrefs] = useState(initialPreferences);
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const masterOn = prefs.master_enabled;

  const handleToggle = async (key: ToggleKey) => {
    const next = !prefs[key];
    setError(null);
    setSavingKey(key);
    try {
      await updateEmailNotificationPreferences({ [key]: next });
      setPrefs((current) => ({ ...current, [key]: next }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "E-Mail-Einstellung konnte nicht gespeichert werden.",
      );
    } finally {
      setSavingKey(null);
    }
  };

  function ToggleSwitch({
    checked,
    disabled,
    saving,
    onToggle,
    label,
  }: {
    checked: boolean;
    disabled?: boolean;
    saving: boolean;
    onToggle: () => void;
    label: string;
  }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled || saving}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-hero-vibrant focus:ring-offset-2 focus:ring-offset-background-dark disabled:opacity-50 ${
          checked ? "border-hero-vibrant bg-hero-vibrant" : "border-hero-border bg-hero-dark"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    );
  }

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Mail className="h-6 w-6 text-accent-gold" />
        E-Mail-Benachrichtigungen
      </h2>
      <p className="font-libre text-sm text-gray-500 mb-4">
        Steuere, welche E-Mails an die Adresse deines Accounts gesendet werden. Mit dem
        Hauptschalter schaltest du alle Benachrichtigungen auf einmal ab.
      </p>

      <label className="flex items-start justify-between gap-4 cursor-pointer border border-hero-vibrant/30 rounded-lg bg-hero-vibrant/5 p-4 mb-6">
        <span>
          <span className="block font-barlow font-bold text-hero-vibrant uppercase tracking-wide">
            Alle E-Mail-Benachrichtigungen
          </span>
          <span className="block font-libre text-sm text-gray-400 mt-1">
            {masterOn
              ? "Aktiv — einzelne Kategorien unten steuerbar."
              : "Aus — es werden keine E-Mails mehr versendet."}
          </span>
        </span>
        <ToggleSwitch
          checked={masterOn}
          saving={savingKey === "master_enabled"}
          onToggle={() => handleToggle("master_enabled")}
          label="Alle E-Mail-Benachrichtigungen"
        />
      </label>

      <div className={`space-y-4 ${!masterOn ? "opacity-50 pointer-events-none" : ""}`}>
        {EMAIL_NOTIFICATION_KINDS.map((kind) => {
          const meta = EMAIL_NOTIFICATION_LABELS[kind];
          const enabled = prefs[kind];
          const saving = savingKey === kind;
          return (
            <label
              key={kind}
              className="flex items-start justify-between gap-4 cursor-pointer border-t border-hero-border/40 pt-4 first:border-t-0 first:pt-0"
            >
              <span>
                <span className="block font-libre text-gray-200">{meta.title}</span>
                <span className="block font-libre text-sm text-gray-500 mt-1">
                  {meta.description}
                </span>
              </span>
              <ToggleSwitch
                checked={enabled}
                disabled={!masterOn}
                saving={saving}
                onToggle={() => handleToggle(kind)}
                label={meta.title}
              />
            </label>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 font-libre text-sm text-red-400 rounded border border-red-800 bg-red-950/30 px-3 py-2">
          {error}
        </p>
      )}
    </section>
  );
}
