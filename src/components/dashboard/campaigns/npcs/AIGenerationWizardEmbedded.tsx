"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AIGenerationWizard } from "./AIGenerationWizard";
import { Loader2, Feather } from "lucide-react";
import { WorldContextSidebar } from "../world/WorldContextSidebar";

type Props = {
  campaignId: string;
  factions: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; type: string }>;
  world: any;
  /** Vorbefüllung aus GM Inbox (Spieler-NPC-Wunsch) */
  prefillName?: string;
  prefillRole?: string;
  prefillDescription?: string;
};

export function AIGenerationWizardEmbedded({ campaignId, factions, locations, world, prefillName, prefillRole, prefillDescription }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Simuliere einen kurzen Ladevorgang für den "Chronist"-Effekt
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    router.push(`/dashboard/campaigns/${campaignId}?tab=npcs`);
  };

  const handleSuccess = () => {
    router.push(`/dashboard/campaigns/${campaignId}?tab=npcs`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1f16]">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <Feather className="h-16 w-16 text-accent-gold animate-pulse" />
          </div>
          <h2 className="font-cinzel font-bold text-3xl text-hero-vibrant mb-4">
            Bereite die Feder vor...
          </h2>
          <p className="font-libre text-xl text-gray-300">
            der Chronist ist bereit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1f16] py-8">
      <div className="container mx-auto px-4">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="flex-1">
            <AIGenerationWizard
              campaignId={campaignId}
              factions={factions}
              locations={locations}
              worldId={world?.id}
              onClose={handleClose}
              onSuccess={handleSuccess}
              embedded={true}
              prefillName={prefillName}
              prefillRole={prefillRole}
              prefillDescription={prefillDescription}
            />
          </div>
          {/* World Context Sidebar */}
          <div className="hidden lg:block">
            <WorldContextSidebar world={world} />
          </div>
        </div>
      </div>
    </div>
  );
}

