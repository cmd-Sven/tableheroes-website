/**
 * Hook wizard, secret AI modal, quest modal, and success toast.
 */
"use client";

import { Sparkles } from "lucide-react";
import { NPCHookWizard } from "@/src/components/dashboard/campaigns/npcs/NPCHookWizard";
import { UniversalSecretModal } from "@/src/components/dashboard/campaigns/secrets/UniversalSecretModal";
import { CreateQuestModal } from "@/src/components/dashboard/CreateQuestModal";
import type { NPCDetailController } from "./useNPCDetailPage";

export function NPCDetailModals({ c }: { c: NPCDetailController }) {
  const {
    npc,
    campaignId,
    isGM,
    factions,
    locations,
    selectedHook,
    setSelectedHook,
    setNarrativeHooks,
    setHookSuccessFeedback,
    hookSuccessFeedback,
    isSecretModalOpen,
    setIsSecretModalOpen,
    setSecretsRefreshKey,
    npcsForQuest,
    membersForQuest,
    isQuestModalOpen,
    setIsQuestModalOpen,
    router,
  } = c;

  return (
    <>
      {/* Hook Wizard Modal */}
      {selectedHook && (
        <NPCHookWizard
          hook={selectedHook}
          sourceNPC={{
            id: npc.id,
            name: npc.name,
            faction_id: npc.faction_id || null,
          }}
          campaignId={campaignId}
          factions={factions}
          locations={locations}
          onClose={() => setSelectedHook(null)}
          onSuccess={() => {
            // Entferne den Hook aus dem lokalen State, damit er sofort aus der Liste verschwindet
            setNarrativeHooks((prev) =>
              prev.filter(
                (h) =>
                  !(
                    (h.name === selectedHook.name ||
                      (!h.name && !selectedHook.name)) &&
                    h.role === selectedHook.role &&
                    h.description === selectedHook.description
                  )
              )
            );
            const hookName = selectedHook.name || "Unbenannt";
            setSelectedHook(null);
            // Visuelles Feedback: Zeige Erfolgs-Toast
            setHookSuccessFeedback(`NPC "${hookName}" erfolgreich erstellt!`);
            setTimeout(() => setHookSuccessFeedback(null), 3000);
            // Optional: Router refresh für vollständige Synchronisation
            router.refresh();
          }}
        />
      )}

      {/* Universal Secret AI Modal */}
      {isGM && (
        <UniversalSecretModal
          entityId={npc.id}
          entityType="npc"
          campaignId={campaignId}
          entityName={npc.name}
          isOpen={isSecretModalOpen}
          onClose={() => setIsSecretModalOpen(false)}
          onCreated={() => {
            // Trigger refresh der Secrets-Liste
            setSecretsRefreshKey((prev) => prev + 1);
            router.refresh();
          }}
        />
      )}

      {/* Quest-Modal (von NPC-Seite mit festem Questgeber) */}
      {isGM && npcsForQuest.length > 0 && (
        <CreateQuestModal
          campaignId={campaignId}
          isOpen={isQuestModalOpen}
          onClose={() => setIsQuestModalOpen(false)}
          npcs={npcsForQuest}
          locations={locations}
          members={membersForQuest}
          defaultQuestGiverId={npc.id}
          defaultQuestGiverName={npc.name}
        />
      )}

      {/* Success Toast für Hook-Generierung */}
      {hookSuccessFeedback && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
          <div className="rounded-lg bg-hero-vibrant/95 text-black px-6 py-4 shadow-2xl border-2 border-hero-vibrant flex items-center gap-3 min-w-[300px]">
            <div className="shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <p className="font-barlow font-bold text-base flex-1">
              {hookSuccessFeedback}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
