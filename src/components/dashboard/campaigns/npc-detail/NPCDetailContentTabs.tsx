/**
 * Description / appearance / personality / combat tabs.
 */
"use client";

import { BookOpen, Eye, Heart, Loader2, Save, Swords } from "lucide-react";
import { toast } from "sonner";
import { GothicSpotlightDescription } from "@/src/components/dashboard/campaigns/lore/GothicSpotlightDescription";
import { MarkdownEditor } from "@/src/components/ui/MarkdownEditor";
import { SmartText } from "@/src/components/ui/SmartText";
import { NpcCombatStatsEditor } from "@/src/components/dashboard/campaigns/npcs/NpcCombatStatsEditor";
import { mergeNpcSheetWithDefaults } from "@/src/lib/npcs/npc-sheet-types";
import { generateNpcCombatSheet } from "@/src/app/dashboard/worlds/world-npc-actions";
import { updateNPC } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { InlineEditField } from "./InlineEditField";
import type { NPCDetailController } from "./useNPCDetailPage";

export function NPCDetailContentTabs({ c }: { c: NPCDetailController }) {
  const {
    npc,
    setNpc,
    campaignId,
    worldId,
    isGM,
    canEdit,
    isPending,
    startTransition,
    activeTab,
    setActiveTab,
    combatDraft,
    setCombatDraft,
    editingField,
    editValues,
    setEditValues,
    entities,
    npcWorldId,
    handleStartEdit,
    handleSaveField,
    handleCancelEdit,
  } = c;

  return (
    <>
          {/* Tabs Container - Pergament Design */}
          <div
            className="rounded-lg overflow-hidden shadow-xl transition-shadow duration-300 relative"
            style={{
              border: "2px solid rgba(202, 185, 38, 0.5)",
              backgroundImage: "url('/images/grunge-paper-background.webp')",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          >
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            {/* Tab Headers */}
            <div className="flex border-b border-hero-border bg-hero-dark/30 relative z-10">
              <button
                onClick={() => setActiveTab("description")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-barlow font-semibold uppercase transition-colors ${
                  activeTab === "description"
                    ? "bg-background-card text-hero-vibrant border-b-2 border-hero-vibrant"
                    : "text-gray-400 hover:text-gray-300 hover:bg-hero-dark/50"
                }`}
              >
                <BookOpen className="h-5 w-5" />
                Beschreibung
              </button>
              <button
                onClick={() => setActiveTab("appearance")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-barlow font-semibold uppercase transition-colors ${
                  activeTab === "appearance"
                    ? "bg-background-card text-hero-vibrant border-b-2 border-hero-vibrant"
                    : "text-gray-400 hover:text-gray-300 hover:bg-hero-dark/50"
                }`}
              >
                <Eye className="h-5 w-5" />
                Aussehen
              </button>
              <button
                onClick={() => setActiveTab("personality")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-barlow font-semibold uppercase transition-colors ${
                  activeTab === "personality"
                    ? "bg-background-card text-hero-vibrant border-b-2 border-hero-vibrant"
                    : "text-gray-400 hover:text-gray-300 hover:bg-hero-dark/50"
                }`}
              >
                <Heart className="h-5 w-5" />
                Persönlichkeit
              </button>
              {isGM ? (
                <button
                  onClick={() => setActiveTab("combat")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-barlow font-semibold uppercase transition-colors ${
                    activeTab === "combat"
                      ? "bg-background-card text-hero-vibrant border-b-2 border-hero-vibrant"
                      : "text-gray-400 hover:text-gray-300 hover:bg-hero-dark/50"
                  }`}
                >
                  <Swords className="h-5 w-5" />
                  Kampfwerte
                </button>
              ) : null}
            </div>

            {/* Tab Content */}
            {/* Description Tab */}
            {activeTab === "description" && (
              <GothicSpotlightDescription
                backgroundImageUrl={npc.image_url || undefined}
              >
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                  Beschreibung
                </h2>
                <InlineEditField
                  isEditing={editingField === "description"}
                  onEdit={() => handleStartEdit("description", npc.description)}
                  onSave={() => handleSaveField("description")}
                  onCancel={handleCancelEdit}
                  canEdit={canEdit}
                  isPending={isPending}
                  editComponent={
                    <MarkdownEditor
                      value={editValues.description || ""}
                      onChange={(v) => setEditValues({ ...editValues, description: v })}
                      minHeight="min-h-[450px]"
                      entities={entities}
                      campaignId={campaignId}
                      worldId={worldId ?? (npc as { world_id?: string }).world_id}
                    />
                  }
                >
                  <SmartText
                    text={npc.description || ""}
                    entities={entities}
                    campaignId={campaignId}
                    worldId={worldId ?? (npc as { world_id?: string }).world_id}
                    emptyMessage="Keine Beschreibung vorhanden."
                    largeImages
                  />
                </InlineEditField>
              </GothicSpotlightDescription>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <GothicSpotlightDescription
                backgroundImageUrl={npc.image_url || undefined}
              >
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                  Aussehen
                </h2>
                <InlineEditField
                  isEditing={editingField === "appearance"}
                  onEdit={() => handleStartEdit("appearance", npc.appearance)}
                  onSave={() => handleSaveField("appearance")}
                  onCancel={handleCancelEdit}
                  canEdit={canEdit}
                  isPending={isPending}
                  editComponent={
                    <MarkdownEditor
                      value={editValues.appearance || ""}
                      onChange={(v) => setEditValues({ ...editValues, appearance: v })}
                      minHeight="min-h-[450px]"
                      placeholder="Aussehen beschreiben… (Markdown möglich)"
                      entities={entities}
                      campaignId={campaignId}
                      worldId={worldId ?? (npc as { world_id?: string }).world_id}
                    />
                  }
                >
                  <SmartText
                    text={npc.appearance || ""}
                    entities={entities}
                    campaignId={campaignId}
                    worldId={worldId ?? (npc as { world_id?: string }).world_id}
                    emptyMessage="Keine Beschreibung vorhanden."
                    largeImages
                  />
                </InlineEditField>
              </GothicSpotlightDescription>
            )}

            {/* Personality Tab */}
            {activeTab === "personality" && (
              <GothicSpotlightDescription
                backgroundImageUrl={npc.image_url || undefined}
              >
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                  Persönlichkeit
                </h2>
                <InlineEditField
                  isEditing={editingField === "personality_traits"}
                  onEdit={() =>
                    handleStartEdit(
                      "personality_traits",
                      npc.personality_traits
                    )
                  }
                  onSave={() => handleSaveField("personality_traits")}
                  onCancel={handleCancelEdit}
                  canEdit={canEdit}
                  isPending={isPending}
                  editComponent={
                    <MarkdownEditor
                      value={editValues.personality_traits || ""}
                      onChange={(v) => setEditValues({ ...editValues, personality_traits: v })}
                      minHeight="min-h-[450px]"
                      placeholder="Persönlichkeit beschreiben… (Markdown möglich)"
                      entities={entities}
                      campaignId={campaignId}
                      worldId={worldId ?? (npc as { world_id?: string }).world_id}
                    />
                  }
                >
                  <SmartText
                    text={npc.personality_traits || ""}
                    entities={entities}
                    campaignId={campaignId}
                    worldId={worldId ?? (npc as { world_id?: string }).world_id}
                    emptyMessage="Keine Beschreibung vorhanden."
                    largeImages
                  />
                </InlineEditField>
              </GothicSpotlightDescription>
            )}

            {isGM && activeTab === "combat" ? (
              <div className="relative z-10 p-6 space-y-4">
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                  Kampfwerte (nur SL)
                </h2>
                <p className="font-libre text-sm text-gray-400">
                  D&amp;D-5e-Statblock für Battlemap und Live-Session. Spieler sehen diesen Reiter
                  nicht.
                </p>
                <NpcCombatStatsEditor
                  sheet={combatDraft}
                  onChange={setCombatDraft}
                  disabled={isPending}
                  onGenerateAi={
                    npcWorldId
                      ? async ({ classHint, powerTier }) =>
                          generateNpcCombatSheet(npcWorldId, {
                            name: npc.name,
                            role: npc.role,
                            race: npc.race,
                            appearance: npc.appearance,
                            description: npc.description,
                            alignment: npc.alignment,
                            classHint,
                            powerTier,
                          })
                      : undefined
                  }
                />
                <button
                  type="button"
                  disabled={isPending || !combatDraft}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        const payload = mergeNpcSheetWithDefaults(combatDraft);
                        await updateNPC(npc.id, {
                          sheet_data: payload,
                          sheet_source: "manual",
                          token_size_category: payload.sizeCategory ?? "medium",
                        });
                        setNpc((prev: typeof npc) => ({
                          ...prev,
                          sheet_data: payload,
                          token_size_category: payload.sizeCategory ?? "medium",
                        }));
                        toast.success("Kampfwerte gespeichert.");
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
                        );
                      }
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded border border-hero-vibrant px-4 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Kampfwerte speichern
                </button>
              </div>
            ) : null}
          </div>
    </>
  );
}
