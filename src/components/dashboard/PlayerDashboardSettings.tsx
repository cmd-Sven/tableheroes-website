"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { updatePrivacyPublicProfile } from "@/src/app/dashboard/dashboard-actions";

type Props = {
  privacyPublicProfile: boolean;
};

export function PlayerDashboardSettings({ privacyPublicProfile }: Props) {
  const [publicProfile, setPublicProfile] = useState(privacyPublicProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    const next = !publicProfile;
    setError(null);
    setSaving(true);
    try {
      await updatePrivacyPublicProfile(next);
      setPublicProfile(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Einstellung konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Settings className="h-6 w-6 text-accent-gold" />
        Einstellungen
      </h2>
      <div className="space-y-4">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="font-libre text-gray-200">Mein Profil für andere sichtbar machen</span>
          <button
            type="button"
            role="switch"
            aria-checked={publicProfile}
            disabled={saving}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-hero-vibrant focus:ring-offset-2 focus:ring-offset-background-dark disabled:opacity-50 ${
              publicProfile ? "border-hero-vibrant bg-hero-vibrant" : "border-hero-border bg-hero-dark"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                publicProfile ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </label>
        <p className="font-libre text-sm text-gray-500">
          {publicProfile
            ? "Dein Profil ist unter /profile/[dein-username] für andere sichtbar."
            : "Nur du siehst dein Dashboard. Andere können dein Profil nicht aufrufen."}
        </p>
        {error && (
          <p className="font-libre text-sm text-red-400 rounded border border-red-800 bg-red-950/30 px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
