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

export function EmailNotificationSettings({ initialPreferences }: Props) {
  const [prefs, setPrefs] = useState(initialPreferences);
  const [savingKey, setSavingKey] = useState<EmailNotificationKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (kind: EmailNotificationKind) => {
    const next = !prefs[kind];
    setError(null);
    setSavingKey(kind);
    try {
      await updateEmailNotificationPreferences({ [kind]: next });
      setPrefs((current) => ({ ...current, [kind]: next }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "E-Mail-Einstellung konnte nicht gespeichert werden.",
      );
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Mail className="h-6 w-6 text-accent-gold" />
        E-Mail-Benachrichtigungen
      </h2>
      <p className="font-libre text-sm text-gray-500 mb-4">
        Du kannst jede Benachrichtigung einzeln abschalten. Es werden nur E-Mails an die Adresse
        deines Accounts gesendet.
      </p>
      <div className="space-y-4">
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
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={saving}
                onClick={() => handleToggle(kind)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-hero-vibrant focus:ring-offset-2 focus:ring-offset-background-dark disabled:opacity-50 ${
                  enabled ? "border-hero-vibrant bg-hero-vibrant" : "border-hero-border bg-hero-dark"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    enabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
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
