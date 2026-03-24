"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import {
  updatePrivacyPublicProfile,
  setPlayerDashboardTutorialDismissed,
} from "@/src/app/dashboard/dashboard-actions";

type Props = {
  privacyPublicProfile: boolean;
  playerDashboardTutorialDismissed: boolean;
};

export function PlayerDashboardSettings({
  privacyPublicProfile,
  playerDashboardTutorialDismissed,
}: Props) {
  const router = useRouter();
  const [publicProfile, setPublicProfile] = useState(privacyPublicProfile);
  const [tutorialDismissed, setTutorialDismissed] = useState(
    playerDashboardTutorialDismissed
  );
  const [saving, setSaving] = useState(false);
  const [savingTutorial, setSavingTutorial] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTutorialDismissed(playerDashboardTutorialDismissed);
  }, [playerDashboardTutorialDismissed]);

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

  const handleTutorialToggle = async () => {
    const nextDismissed = !tutorialDismissed;
    setError(null);
    setSavingTutorial(true);
    try {
      await setPlayerDashboardTutorialDismissed(nextDismissed);
      setTutorialDismissed(nextDismissed);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Einstellung konnte nicht gespeichert werden.");
    } finally {
      setSavingTutorial(false);
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

        <label className="flex items-center justify-between gap-4 cursor-pointer border-t border-hero-border pt-4">
          <span className="font-libre text-gray-200">
            Dashboard-Hilfe (Tutor) anzeigen
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={!tutorialDismissed}
            disabled={savingTutorial}
            onClick={handleTutorialToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-hero-vibrant focus:ring-offset-2 focus:ring-offset-background-dark disabled:opacity-50 ${
              !tutorialDismissed ? "border-hero-vibrant bg-hero-vibrant" : "border-hero-border bg-hero-dark"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                !tutorialDismissed ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </label>
        <p className="font-libre text-sm text-gray-500">
          {tutorialDismissed
            ? "Die Einführungskarte oben auf dem Spieler-Dashboard ist ausgeblendet. Schalte ein, um sie wieder zu sehen."
            : "Die Hilfe-Karte mit den Schritten wird oben auf dem Dashboard angezeigt."}
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
