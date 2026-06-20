"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlayerDashboardSettings } from "@/src/components/dashboard/PlayerDashboardSettings";
import { EmailNotificationSettings } from "@/src/components/dashboard/settings/EmailNotificationSettings";
import { ProfileSettings } from "@/src/components/dashboard/settings/ProfileSettings";
import type { EmailNotificationPreferences } from "@/src/lib/email/notification-preferences";
import type {
  ProfileDesignData,
  AchievementOption,
} from "@/src/components/dashboard/settings/ProfileSettings";
import { updateAccountData } from "@/src/lib/actions/user-actions";

type Props = {
  userId: string;
  initialUsername: string | null;
  privacyPublicProfile: boolean;
  playerDashboardTutorialDismissed: boolean;
  emailNotificationPreferences: EmailNotificationPreferences;
  profileDesign: ProfileDesignData;
  achievements: AchievementOption[];
};

export function SettingsClient({
  userId,
  initialUsername,
  privacyPublicProfile,
  playerDashboardTutorialDismissed,
  emailNotificationPreferences,
  profileDesign,
  achievements,
}: Props) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSaveAccount() {
    const trimmed = username.trim();
    if (trimmed === (initialUsername ?? "")) {
      toast.info("Keine Änderung am Benutzernamen.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateAccountData(userId, { username: trimmed });
      if (result.success) {
        toast.success("Benutzername gespeichert.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PlayerDashboardSettings
        privacyPublicProfile={privacyPublicProfile}
        playerDashboardTutorialDismissed={playerDashboardTutorialDismissed}
      />
      <EmailNotificationSettings initialPreferences={emailNotificationPreferences} />
      <ProfileSettings
        userId={userId}
        initial={profileDesign}
        achievements={achievements}
      />
      <section className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Account-Daten
        </h2>
        <div className="space-y-4">
          <label className="block font-barlow font-bold uppercase text-sm text-gray-300">
            Benutzername
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Dein Anzeigename"
            className="w-full max-w-md bg-slate-900 border border-hero-dark rounded p-2 text-white focus:border-hero-vibrant outline-none font-libre"
            disabled={saving}
          />
          <button
            type="button"
            onClick={handleSaveAccount}
            disabled={saving}
            className="font-barlow font-bold uppercase px-4 py-2 rounded bg-hero-dark text-white hover:bg-hero-vibrant/90 transition-colors disabled:opacity-60"
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
        <p className="mt-4 font-libre text-gray-500 text-sm">
          E-Mail und Passwort-Verwaltung folgen in Kürze.
        </p>
      </section>
    </div>
  );
}
