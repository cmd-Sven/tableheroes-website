"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
import {
  saveCampaignDiscordSettings,
  testCampaignDiscordWebhook,
  type CampaignDiscordSettings,
} from "@/src/app/dashboard/campaigns/[id]/campaign-discord-actions";

type Props = {
  campaignId: string;
  initial: CampaignDiscordSettings;
};

export function CampaignDiscordSettings({ campaignId, initial }: Props) {
  const [webhookUrl, setWebhookUrl] = useState(initial.webhookUrl);
  const [enabled, setEnabled] = useState(initial.notificationsEnabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await saveCampaignDiscordSettings(campaignId, {
        webhookUrl,
        notificationsEnabled: enabled,
      });
      if (result.success) toast.success("Discord-Einstellungen gespeichert.");
      else toast.error(result.error ?? "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testCampaignDiscordWebhook(campaignId);
      if (result.success) toast.success("Testnachricht an Discord gesendet.");
      else toast.error(result.error ?? "Test fehlgeschlagen.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h3 className="font-barlow font-bold text-lg text-white uppercase mb-2 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[#5865F2]" aria-hidden />
        Discord-Benachrichtigungen
      </h3>
      <p className="font-libre text-xs text-gray-400 mb-4 leading-relaxed">
        Verknüpfe den Discord-Kanal dieser Kampagne per Webhook. Spieler erhalten
        Teaser bei freigeschalteten NSCs, Fraktionen, Lore, Quests und Bestarium —
        sowie Recaps nach Veröffentlichung. NSCs werden nicht beim Erstellen, sondern
        erst bei Freigabe oder Bühnen-Auftritt gemeldet.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label
            htmlFor="discord_webhook_url"
            className="block mb-1.5 font-barlow font-bold uppercase text-xs text-gray-300"
          >
            Webhook-URL
          </label>
          <input
            id="discord_webhook_url"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/…"
            className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white font-mono focus:border-hero-vibrant outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-1 font-libre text-[11px] text-gray-500">
            Discord: Kanal → Einstellungen → Integrationen → Webhooks → URL kopieren
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-hero-border"
          />
          <span className="font-libre text-sm text-gray-300">
            Benachrichtigungen aktiv
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Speichern
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !webhookUrl.trim()}
            className="inline-flex items-center gap-2 rounded border border-[#5865F2]/50 bg-[#5865F2]/10 px-4 py-2 font-barlow font-bold uppercase text-sm text-[#aeb4ff] hover:bg-[#5865F2]/20 transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Test senden
          </button>
        </div>
      </form>
    </div>
  );
}
