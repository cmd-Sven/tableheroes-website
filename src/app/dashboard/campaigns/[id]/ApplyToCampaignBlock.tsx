"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { applyToCampaign } from "@/src/lib/actions/application-actions";

type Props = {
  campaignId: string;
};

export function ApplyToCampaignBlock({ campaignId }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await applyToCampaign(
        campaignId,
        message.trim() || undefined,
      );
      if (result.success) {
        toast.success("Bewerbung gesendet.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Bewerbung konnte nicht gesendet werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-border pb-2 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-accent-gold" />
        Bei dieser Kampagne bewerben
      </h2>
      <p className="font-libre text-gray-300 mb-4">
        Du bist noch kein Mitglied. Sende eine Bewerbung an den Spielleiter.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="application_message"
            className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
          >
            Nachricht (optional)
          </label>
          <textarea
            id="application_message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Kurze Vorstellung oder warum du beitreten möchtest..."
            rows={3}
            className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none resize-none"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-hero-border bg-hero-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors disabled:opacity-60"
        >
          {loading ? "Bewerbung läuft..." : "Bewerben"}
        </button>
      </form>
    </div>
  );
}
