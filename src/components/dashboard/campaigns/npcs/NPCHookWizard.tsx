"use client";

import { useState } from "react";
import { X, Sparkles, User } from "lucide-react";
import { NarrativeHook } from "@/src/types/npc";
import { AIGenerationWizard } from "./AIGenerationWizard";

type Props = {
  hook: NarrativeHook;
  sourceNPC: {
    id: string;
    name: string;
    faction_id?: string | null;
  };
  campaignId: string;
  factions: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; type: string }>;
  onClose: () => void;
  onSuccess?: () => void;
};

// Mapping von Rollen zu Relationship-Types (falls vorhanden)
const ROLE_TO_RELATIONSHIP_MAP: Record<string, string> = {
  "Schwester": "Family",
  "Bruder": "Family",
  "Vater": "Family",
  "Mutter": "Family",
  "Sohn": "Family",
  "Tochter": "Family",
  "Cousin": "Family",
  "Onkel": "Family",
  "Tante": "Family",
  "Erzfeind": "Rival",
  "Rivale": "Rival",
  "Feind": "Enemy",
  "Mentor": "Mentor",
  "Lehrling": "Apprentice",
  "Freund": "Friend",
  "Verbündeter": "Ally",
  "Vorgesetzter": "Superior",
  "Untergebener": "Subordinate",
};

export function NPCHookWizard({
  hook,
  sourceNPC,
  campaignId,
  factions,
  locations,
  onClose,
  onSuccess,
}: Props) {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <AIGenerationWizard
      campaignId={campaignId}
      factions={factions}
      locations={locations}
      onClose={onClose}
      onSuccess={handleSuccess}
      hookContext={{
        sourceNPCId: sourceNPC.id,
        sourceNPCName: sourceNPC.name,
        hook: {
          name: hook.name,
          role: hook.role,
          description: hook.description,
          is_alive: hook.is_alive,
        },
      }}
    />
  );
}

