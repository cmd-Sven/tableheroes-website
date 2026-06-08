"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
import {
  saveDiscordPlatformNewsWebhook,
  testDiscordPlatformNewsWebhook,
} from "@/src/lib/actions/discord-platform-actions";

type Props = {
  initialWebhookUrl: string;
};

export function DiscordPlatformSettings({ initialWebhookUrl }: Props) {
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await saveDiscordPlatformNewsWebhook(webhookUrl);
      if (result.success) toast.success("Discord-Webhook für News gespeichert.");
      else toast.error(result.error ?? "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testDiscordPlatformNewsWebhook();
      if (result.success) toast.success("Testnachricht an Discord gesendet.");
      else toast.error(result.error ?? "Test fehlgeschlagen.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-lg border border-hero-border/60 bg-background-card/80 p-6">
      <h2 className="font-barlow font-bold text-xl uppercase text-hero-vibrant mb-2 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[#5865F2]" aria-hidden />
        Discord — News & Updates
      </h2>
      <p className="font-libre text-sm text-gray-400 mb-4 leading-relaxed">
        Veröffentlichte News-Beiträge werden automatisch an den konfigurierten
        Plattform-Kanal gesendet (voller Text + Bild).
      </p>

      <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
        <div>
          <label
            htmlFor="platform_discord_webhook"
            className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1"
          >
            Webhook-URL (Plattform-Kanal)
          </label>
          <input
            id="platform_discord_webhook"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/…"
            className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-mono text-sm text-gray-100 focus:border-hero-vibrant outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Speichern
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !webhookUrl.trim()}
            className="inline-flex items-center gap-2 rounded border border-[#5865F2]/50 bg-[#5865F2]/10 px-4 py-2 font-barlow font-bold uppercase text-sm text-[#aeb4ff] hover:bg-[#5865F2]/20 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Test senden
          </button>
        </div>
      </form>
    </div>
  );
}
