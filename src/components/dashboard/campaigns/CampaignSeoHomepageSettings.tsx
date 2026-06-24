"use client";

import { useState, useTransition } from "react";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { setCampaignSeoHomepageEnabled } from "@/src/app/dashboard/campaigns/[id]/public-seo-actions";

type Props = {
  campaignId: string;
  initialEnabled: boolean;
};

export function CampaignSeoHomepageSettings({ campaignId, initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !enabled;
    startTransition(async () => {
      try {
        await setCampaignSeoHomepageEnabled(campaignId, next);
        setEnabled(next);
        toast.success(
          next
            ? "Öffentliche Lore-Einträge erscheinen auf der Startseite."
            : "Lore-Einträge werden nicht mehr auf der Startseite gelistet.",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  };

  return (
    <div
      id="seo-lore-homepage"
      className="rounded-lg border border-hero-dark bg-background-card p-6"
    >
      <h3 className="font-barlow font-bold text-lg text-white uppercase mb-2 flex items-center gap-2">
        <Globe className="h-5 w-5 text-accent-gold" />
        Lore-Datenbank &amp; SEO
      </h3>
      <p className="text-sm text-gray-400 font-libre mb-4">
        Freigegebene Lore-Einträge (NSC, Fraktionen, Weltwissen) können auf der Startseite
        unter „Neueste Einträge in der Lore-Datenbank“ erscheinen.
      </p>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          disabled={isPending}
          onChange={handleToggle}
        />
        <span className="text-sm text-gray-300">
          Diese Kampagne auf der Startseite in der Lore-Datenbank anzeigen
        </span>
      </label>
    </div>
  );
}
