/**
 * Narrative hooks, relations, secrets, and quests on NPC detail.
 */
"use client";

import Link from "next/link";
import {
  BookOpen,
  Loader2,
  Plus,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { GothicSpotlightDescription } from "@/src/components/dashboard/campaigns/lore/GothicSpotlightDescription";
import { NPCRelationsList } from "@/src/components/dashboard/campaigns/npcs/NPCRelationsList";
import { SecretsManager } from "@/src/components/dashboard/campaigns/secrets/SecretsManager";
import { createNPCRelationManually } from "@/src/app/dashboard/campaigns/[id]/npc-relations-actions";
import type { NPCDetailController } from "./useNPCDetailPage";

export function NPCDetailStorySections({ c }: { c: NPCDetailController }) {
  const {
    npc,
    campaignId,
    isGM,
    canEdit,
    narrativeHooks,
    existingNPCs,
    npcsWithoutRelation,
    setNpcsWithoutRelation,
    hiddenHooks,
    isLinkingRelation,
    setIsLinkingRelation,
    setSelectedHook,
    setIsSecretModalOpen,
    secretsRefreshKey,
    factions,
    locations,
    activeQuests,
    completedQuests,
    npcsForQuest,
    setIsQuestModalOpen,
    router,
  } = c;

  return (
    <>
          {/* Narrative Hooks - Story Opportunities (nur GM) */}
          {isGM && narrativeHooks && narrativeHooks.length > 0 && (
            <div
              className="rounded-lg p-6 relative overflow-hidden shadow-xl transition-shadow duration-300"
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
              <div className="relative z-10">
                <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
                  <Sparkles className="h-6 w-6" />
                  Story Opportunities
                </h2>
                <p className="font-libre text-gray-400 text-sm mb-4">
                  Personen und Rollen, die in der Hintergrundgeschichte erwähnt
                  wurden und als NPCs erstellt werden können.
                </p>
                <div className="space-y-3">
                  {narrativeHooks
                    .filter((hook) => {
                      // Filtere Hooks heraus, die bereits verknüpft sind
                      if (!hook.name) return true; // Zeige unbenannte Hooks immer an
                      
                      // FUZZY-CHECK: Prüfe, ob Hook durch Fuzzy-Matching versteckt werden soll
                      if (hiddenHooks.has(hook.name)) {
                        // Hook ist bereits verknüpft (Fuzzy-Match) - nicht anzeigen
                        return false;
                      }
                      
                      // Prüfe, ob Hook bereits als NPC existiert
                      if (existingNPCs[hook.name]) {
                        // NPC existiert - prüfe, ob er bereits verknüpft ist
                        if (!npcsWithoutRelation.has(hook.name)) {
                          // NPC existiert und ist bereits verknüpft - nicht anzeigen
                          return false;
                        }
                        // NPC existiert, aber ist noch nicht verknüpft - anzeigen
                        return true;
                      }
                      
                      // Hook existiert noch nicht als NPC - anzeigen
                      return true;
                    })
                    .map((hook, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-4 ${
                        hook.is_alive
                          ? "border-hero-border bg-hero-dark/30"
                          : "border-gray-700 bg-gray-900/30 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-cinzel font-bold text-lg text-accent-gold">
                              {hook.name || "Unbenannter NPC"}
                            </h3>
                            {!hook.is_alive && (
                              <span className="px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase bg-red-900/50 text-red-300 border border-red-700">
                                Verstorben
                              </span>
                            )}
                          </div>
                          <p className="font-libre text-gray-300 mb-1">
                            <span className="text-gray-500">Beziehung:</span>{" "}
                            <span className="font-semibold text-hero-vibrant">
                              {hook.role}
                            </span>
                          </p>
                          <p className="font-libre text-gray-400 text-sm">
                            {hook.description}
                          </p>
                        </div>
                        {hook.is_alive && canEdit && (
                          <>
                            {hook.name && existingNPCs[hook.name] ? (
                              <div className="flex flex-col gap-2 items-end">
                                <Link
                                  href={`/dashboard/campaigns/${campaignId}/npcs/${
                                    existingNPCs[hook.name].id
                                  }`}
                                  className="px-4 py-2 rounded bg-hero-vibrant/20 text-hero-vibrant border border-hero-vibrant hover:bg-hero-vibrant/30 transition-colors font-barlow font-bold uppercase text-sm whitespace-nowrap flex items-center gap-2"
                                >
                                  <User className="h-4 w-4" />
                                  Profil von {existingNPCs[hook.name].name}{" "}
                                  ansehen
                                </Link>
                                {npcsWithoutRelation.has(hook.name) && (
                                  <button
                                    onClick={async () => {
                                      if (
                                        !hook.name ||
                                        !existingNPCs[hook.name]
                                      )
                                        return;
                                      setIsLinkingRelation(hook.name);
                                      try {
                                        await createNPCRelationManually(
                                          campaignId,
                                          npc.id,
                                          existingNPCs[hook.name].id,
                                          hook.role,
                                          hook.description
                                        );
                                        // Entferne aus "ohne Relation" Set
                                        setNpcsWithoutRelation((prev) => {
                                          const next = new Set(prev);
                                          next.delete(hook.name!);
                                          return next;
                                        });
                                        router.refresh();
                                      } catch (error: unknown) {
                                        const errorMessage =
                                          error instanceof Error
                                            ? error.message
                                            : "Fehler beim Verknüpfen der Relation.";
                                        alert(errorMessage);
                                      } finally {
                                        setIsLinkingRelation(null);
                                      }
                                    }}
                                    disabled={isLinkingRelation === hook.name}
                                    className="px-3 py-1.5 rounded bg-accent-gold/20 text-accent-gold border border-accent-gold/50 hover:bg-accent-gold/30 transition-colors font-barlow font-bold uppercase text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  >
                                    {isLinkingRelation === hook.name ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Verknüpfe...
                                      </>
                                    ) : (
                                      <>
                                        <Users className="h-3 w-3" />
                                        Relation jetzt manuell verknüpfen
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedHook(hook)}
                                className="px-4 py-2 rounded bg-hero-vibrant/20 text-hero-vibrant border border-hero-vibrant hover:bg-hero-vibrant/30 transition-colors font-barlow font-bold uppercase text-sm whitespace-nowrap"
                              >
                                NPC erstellen
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NPC Relations */}
          <div
            className="rounded-lg relative overflow-hidden shadow-xl transition-shadow duration-300"
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
            <GothicSpotlightDescription
              backgroundImageUrl={npc.image_url || undefined}
            >
              <NPCRelationsList
                campaignId={campaignId}
                npcId={npc.id}
                canEdit={isGM}
                factionId={npc.faction_id ?? null}
                currentLocationId={npc.current_location_id ?? null}
                sourceNPCName={npc.name}
                factions={factions}
                locations={locations}
              />
            </GothicSpotlightDescription>
          </div>

          {/* Secrets Manager */}
          <div
            className="rounded-lg relative overflow-hidden shadow-xl transition-shadow duration-300"
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
            <div className="relative z-10">
              <GothicSpotlightDescription
                backgroundImageUrl={npc.image_url || undefined}
              >
                {isGM && (
                  <div className="mb-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsSecretModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
                    >
                      <Sparkles className="h-4 w-4" />
                      ✨ Plot-Geheimnis mit KI weben
                    </button>
                  </div>
                )}
                <SecretsManager
                  entityId={npc.id}
                  entityType="npc"
                  campaignId={campaignId}
                  isGM={isGM}
                  refreshKey={secretsRefreshKey}
                />
              </GothicSpotlightDescription>
            </div>
          </div>

          {/* Quests Section */}
          {(isGM || activeQuests.length > 0 || completedQuests.length > 0) && (
            <div
              className="rounded-lg p-6 relative overflow-hidden shadow-xl transition-shadow duration-300"
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
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-hero-border">
                  <h2 className="font-barlow font-semibold text-2xl text-accent-blood flex items-center gap-2">
                    <BookOpen className="h-6 w-6" />
                    Quests
                  </h2>
                  {isGM && (
                    <>
                      {npcsForQuest.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setIsQuestModalOpen(true)}
                          className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          📜 Neue Quest in Auftrag geben
                        </button>
                      ) : (
                        <Link
                          href={`/dashboard/campaigns/${campaignId}/quests/new?quest_giver_id=${npc.id}`}
                          className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          📜 Neue Quest in Auftrag geben
                        </Link>
                      )}
                    </>
                  )}
                </div>

                {activeQuests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
                      Aktive Quests
                    </h3>
                    <div className="space-y-2">
                      {activeQuests.map((quest) => (
                        <Link
                          key={quest.id}
                          href={`/dashboard/campaigns/${campaignId}/quests/${quest.id}`}
                          className="block rounded border border-hero-border bg-hero-dark/50 p-3 hover:bg-hero-dark transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-cinzel font-bold text-white">
                                {quest.title}
                              </p>
                              {quest.participant_role && (
                                <p className="font-libre text-xs text-gray-400 mt-1">
                                  Rolle: {quest.participant_role}
                                </p>
                              )}
                            </div>
                            <span className="px-2 py-1 rounded text-xs font-barlow font-bold uppercase bg-blue-900/50 text-blue-300 border border-blue-700">
                              {quest.type}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {completedQuests.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
                      Abgeschlossene Quests
                    </h3>
                    <div className="space-y-2">
                      {completedQuests.map((quest) => (
                        <Link
                          key={quest.id}
                          href={`/dashboard/campaigns/${campaignId}/quests/${quest.id}`}
                          className="block rounded border border-hero-border bg-hero-dark/50 p-3 hover:bg-hero-dark transition-colors opacity-75"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-cinzel font-bold text-white">
                              {quest.title}
                            </p>
                            <span className="px-2 py-1 rounded text-xs font-barlow font-bold uppercase bg-green-900/50 text-green-300 border border-green-700">
                              Abgeschlossen
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
    </>
  );
}
