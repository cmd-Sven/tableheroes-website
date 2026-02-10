"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteCampaign } from "@/src/app/dashboard/campaigns/[id]/actions";
import { useRouter } from "next/navigation";
import { HeroButton } from "@/src/components/ui/HeroButton";

type Campaign = {
  id: string;
  name: string | null;
  system: string | null;
  max_players: number | null;
};

type Props = {
  campaign: Campaign;
};

export function CampaignCard({ campaign }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (!confirm(`Möchtest du die Kampagne "${campaign.name || "Unbenannt"}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteCampaign(campaign.id);
        // Redirect to dashboard after successful deletion
        // Use replace to prevent back navigation to deleted campaign
        router.replace("/dashboard");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Löschen der Kampagne.";
        alert(errorMessage);
      }
    });
  };

  return (
    <div
      className="gothic-dashboard-card p-6 group relative"
    >
      <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] group-hover:text-accent-gold transition-colors">
        {campaign.name || "Unbenannt"}
      </h3>
      <p className="font-barlow font-bold text-gray-100 uppercase text-xs mb-4 drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]">
        {campaign.system || "System offen"} • {campaign.max_players || "?"} Plätze
      </p>
      <div className="flex gap-2 mt-4 items-center justify-between">
        <HeroButton
          href={`/dashboard/campaigns/${campaign.id}`}
          size="sm"
          ariaLabel="Kampagne verwalten"
          className="button-glint"
        >
          Kampagne öffnen
        </HeroButton>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-2 rounded-full bg-black/60 border border-red-900/60 text-red-400 hover:text-red-200 hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Kampagne löschen"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

