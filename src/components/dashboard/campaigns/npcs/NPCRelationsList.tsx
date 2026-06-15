"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, Trash2, Users, Loader2, UserPlus, Sparkles } from "lucide-react";
import {
  getNPCRelations,
  deleteNPCRelation,
  createNPCRelation,
} from "@/src/app/dashboard/campaigns/[id]/npc-relations-actions";
import { getNPCsByContext } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { useEffect, useState, useTransition } from "react";
import {
  ContextNPCsWidget,
  type ContextNPCsWidgetProps,
} from "./NPCForm";
import { AIGenerationWizard } from "./AIGenerationWizard";

type Relation = {
  id: string;
  partnerId: string | null; // null für Hooks
  partnerName: string;
  relationType: string;
  description: string | null;
  isHook?: boolean; // true, wenn es sich um einen Hook handelt
  partnerImageUrl?: string | null; // Avatar des Partners
};

type ContextNPCsState = ContextNPCsWidgetProps["contextNPCs"];

type Props = {
  campaignId: string;
  npcId: string;
  canEdit?: boolean;
  factionId?: string | null;
  currentLocationId?: string | null;
  sourceNPCName?: string; // Name des aktuellen NPCs (für Hook-Promotion)
  factions?: Array<{ id: string; name: string }>; // Für Wizard
  locations?: Array<{ id: string; name: string; type: string }>; // Für Wizard
};

export function NPCRelationsList({
  campaignId,
  npcId,
  canEdit = false,
  factionId,
  currentLocationId,
  sourceNPCName,
  factions = [],
  locations = [],
}: Props) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [showDialog, setShowDialog] = useState(false);
  const [contextNPCs, setContextNPCs] = useState<ContextNPCsState | null>(
    null
  );
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [selectedContextNPCs, setSelectedContextNPCs] = useState<
    Array<{ npcId: string; relationType: string }>
  >([]);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Hook Promotion Wizard State
  const [showPromotionWizard, setShowPromotionWizard] = useState(false);
  const [promotingHook, setPromotingHook] = useState<Relation | null>(null);

  useEffect(() => {
    const loadRelations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getNPCRelations(campaignId, npcId);
        setRelations(data);
      } catch (err: any) {
        console.error("Fehler beim Laden der Relationen:", err);
        setError(err.message || "Fehler beim Laden der Relationen");
      } finally {
        setIsLoading(false);
      }
    };

    loadRelations();
  }, [campaignId, npcId]);

  const handleDelete = (relationId: string) => {
    startTransition(async () => {
      try {
        await deleteNPCRelation(campaignId, relationId);
        setRelations((prev) => prev.filter((r) => r.id !== relationId));
      } catch (err: any) {
        alert(
          err instanceof Error
            ? err.message
            : "Fehler beim Löschen der Relation."
        );
      }
    });
  };

  const openDialog = () => {
    setShowDialog(true);
    setDialogError(null);
    setSelectedContextNPCs([]);

    // Wenn weder Ort noch Fraktion vorhanden sind, laden wir trotzdem (kann leere Ergebnisse geben)
    setIsLoadingContext(true);
    getNPCsByContext(
      campaignId,
      currentLocationId || null,
      factionId || null,
      npcId // Exclude current NPC
    )
      .then((result) => {
        setContextNPCs(result);
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Kontext-NPCs:", err);
        setContextNPCs({
          sameLocation: [],
          nearbyLocations: [],
          sameFaction: [],
        });
      })
      .finally(() => {
        setIsLoadingContext(false);
      });
  };

  const closeDialog = () => {
    setShowDialog(false);
    setDialogError(null);
    setSelectedContextNPCs([]);
  };

  const handleSaveRelations = () => {
    if (selectedContextNPCs.length === 0) {
      setDialogError("Bitte wähle mindestens einen NPC und Beziehungstyp aus.");
      return;
    }

    startTransition(async () => {
      try {
        await Promise.all(
          selectedContextNPCs.map((ctx) =>
            createNPCRelation(
              campaignId,
              npcId,
              ctx.npcId,
              ctx.relationType,
              null
            ).catch((err) => {
              console.error(
                `Fehler beim Erstellen der Relation zu NPC ${ctx.npcId}:`,
                err
              );
              return null;
            })
          )
        );

        const data = await getNPCRelations(campaignId, npcId);
        setRelations(data);
        closeDialog();
      } catch (err: any) {
        console.error("Fehler beim Speichern der Relationen:", err);
        setDialogError(
          err instanceof Error
            ? err.message
            : "Fehler beim Speichern der Relationen."
        );
      }
    });
  };

  if (isLoading) {
    return (
      <>
        <div className="mb-4 flex items-center justify-between border-b border-hero-border pb-2">
          <h2 className="flex items-center gap-2 font-barlow text-2xl font-semibold text-accent-blood">
            <Users className="h-6 w-6" />
            Beziehungen
          </h2>
        </div>
        <p className="font-libre text-sm text-gray-400">Lade Beziehungen...</p>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="mb-4 flex items-center justify-between border-b border-hero-border pb-2">
          <h2 className="flex items-center gap-2 font-barlow text-2xl font-semibold text-accent-blood">
            <Users className="h-6 w-6" />
            Beziehungen
          </h2>
        </div>
        <p className="font-libre text-sm text-red-400">{error}</p>
      </>
    );
  }

  if (relations.length === 0 && !canEdit) {
    return null; // Keine Beziehungen und kein Edit-Mode = nichts anzeigen
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between border-b border-hero-border pb-2">
        <h2 className="flex items-center gap-2 font-barlow text-2xl font-semibold text-accent-blood">
          <Users className="h-6 w-6" />
          Beziehungen
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={openDialog}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-3 py-1.5 font-barlow text-sm font-bold uppercase text-black shadow-md hover:bg-hero-vibrant/90"
          >
            <Plus className="h-4 w-4" />
            Beziehung hinzufügen
          </button>
        )}
      </div>

      {relations.length > 0 ? (
        <div className="space-y-3">
          {relations
            // Filter: Selbst-Beziehungen ausschließen (NPC zeigt sich nicht selbst an)
            .filter((relation) => relation.partnerId !== npcId)
            .map((relation) => (
            <div
              key={relation.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-hero-border bg-hero-dark/30 p-4 hover:bg-hero-dark/50 hover:shadow-lg hover:shadow-accent-gold/20 transition-all"
            >
              {relation.isHook && !relation.partnerId ? (
                // Hook (noch kein vollwertiger NPC)
                <div className="group flex flex-1 items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-libre text-gray-300">
                        <span className="font-semibold text-hero-vibrant">
                          {relation.relationType}:
                        </span>{" "}
                        <span className="text-accent-gold italic">
                          {relation.partnerName}
                        </span>
                      </p>
                      <span className="px-2 py-0.5 rounded bg-accent-gold/20 text-accent-gold text-xs font-barlow font-semibold uppercase border border-accent-gold/40">
                        Hook
                      </span>
                    </div>
                    {canEdit && relation.description && (
                      <p className="mt-1 font-libre text-sm text-gray-400">
                        <span className="text-[10px] font-barlow font-bold uppercase text-gray-600">
                          GM-Notiz:{" "}
                        </span>
                        {relation.description}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPromotingHook(relation);
                          setShowPromotionWizard(true);
                        }}
                        className="mt-1 rounded border border-accent-gold/60 bg-accent-gold/20 p-1.5 text-accent-gold hover:bg-accent-gold/40 hover:text-accent-gold transition-colors"
                        title="Diesen Charakter als vollen NPC anlegen"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(relation.id)}
                        className="mt-1 rounded border border-red-900/60 bg-red-900/20 p-1.5 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
                        title="Beziehung löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Vollwertiger NPC (mit Link und Avatar)
                <>
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/npcs/${relation.partnerId}`}
                    className="group flex flex-1 items-center gap-4"
                  >
                    {/* Avatar mit Gothik-Styling */}
                    <div className="relative flex-shrink-0">
                      {relation.partnerImageUrl ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-accent-gold/60 shadow-lg shadow-accent-gold/20 ring-2 ring-accent-gold/30">
                          <Image
                            src={relation.partnerImageUrl}
                            alt={relation.partnerName}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-hero-dark border-2 border-accent-gold/60 shadow-lg shadow-accent-gold/20 ring-2 ring-accent-gold/30 flex items-center justify-center">
                          <Users className="h-6 w-6 text-accent-gold/70" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-libre text-gray-300">
                        <span className="font-semibold text-hero-vibrant">
                          {relation.relationType}:
                        </span>{" "}
                        <span className="text-accent-gold transition-colors group-hover:text-hero-vibrant">
                          {relation.partnerName}
                        </span>
                      </p>
                      {canEdit && relation.description && (
                        <p className="mt-1 font-libre text-sm text-gray-400">
                          <span className="text-[10px] font-barlow font-bold uppercase text-gray-600">
                            GM-Notiz:{" "}
                          </span>
                          {relation.description}
                        </p>
                      )}
                    </div>
                    <div className="text-hero-vibrant opacity-0 transition-opacity group-hover:opacity-100">
                      →
                    </div>
                  </Link>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDelete(relation.id)}
                      className="mt-1 rounded border border-red-900/60 bg-red-900/20 p-1.5 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
                      title="Beziehung löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="font-libre text-sm text-gray-400">
          Noch keine Beziehungen eingetragen.
        </p>
      )}

      {/* Hook Promotion Wizard */}
      {showPromotionWizard && promotingHook && (
        <AIGenerationWizard
          campaignId={campaignId}
          factions={factions}
          locations={locations}
          onClose={() => {
            setShowPromotionWizard(false);
            setPromotingHook(null);
          }}
          onSuccess={async () => {
            // Lade Relationen neu, um den aktualisierten Status zu sehen
            try {
              const data = await getNPCRelations(campaignId, npcId);
              setRelations(data);
              
              // Zeige Erfolgs-Feedback
              if (promotingHook) {
                alert(`${promotingHook.partnerName} wurde erfolgreich in der Welt manifestiert und mit ${sourceNPCName || "dem NPC"} verknüpft!`);
              }
            } catch (err: any) {
              console.error("Fehler beim Neuladen der Relationen:", err);
              alert("Fehler beim Neuladen der Relationen. Bitte die Seite aktualisieren.");
            }
            setShowPromotionWizard(false);
            setPromotingHook(null);
          }}
          hookContext={{
            sourceNPCId: npcId,
            sourceNPCName: sourceNPCName || "Unbekannt",
            hook: {
              name: promotingHook.partnerName,
              role: promotingHook.relationType,
              description: promotingHook.description || undefined,
              is_alive: true,
            },
          }}
        />
      )}

      {/* Dialog für neue Beziehungen */}
      {canEdit && showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark/95 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-hero-border bg-background-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-hero-border bg-background-card p-4">
              <h3 className="font-barlow text-lg font-bold uppercase text-hero-vibrant">
                Beziehung hinzufügen
              </h3>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded p-1.5 text-gray-400 hover:bg-hero-dark hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingContext ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent-gold" />
                  <span className="ml-3 font-libre text-gray-400">
                    Lade mögliche Kontakte...
                  </span>
                </div>
              ) : contextNPCs ? (
                <ContextNPCsWidget
                  campaignId={campaignId}
                  contextNPCs={contextNPCs}
                  selectedContextNPCs={selectedContextNPCs}
                  onSelectNPC={(npcId, relationType) => {
                    setSelectedContextNPCs((prev) => {
                      const existing = prev.findIndex((s) => s.npcId === npcId);
                      if (existing >= 0) {
                        if (relationType) {
                          const updated = [...prev];
                          updated[existing] = { npcId, relationType };
                          return updated;
                        } else {
                          return prev.filter((s) => s.npcId !== npcId);
                        }
                      } else if (relationType) {
                        return [...prev, { npcId, relationType }];
                      }
                      return prev;
                    });
                  }}
                />
              ) : (
                <p className="font-libre text-sm text-gray-400">
                  Keine Kontext-NPCs gefunden. Wähle zuerst einen Ort oder eine
                  Fraktion für diesen NPC.
                </p>
              )}

              {dialogError && (
                <p className="mt-4 font-libre text-sm text-red-400">
                  {dialogError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-hero-border bg-background-card p-4">
              <button
                type="button"
                onClick={closeDialog}
                className="px-4 py-2 rounded bg-hero-dark text-white font-barlow font-bold uppercase hover:bg-hero-dark/80 transition-colors border border-hero-border"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSaveRelations}
                disabled={isPending || selectedContextNPCs.length === 0}
                className="px-6 py-2 rounded bg-hero-vibrant text-black font-barlow font-bold uppercase hover:bg-hero-vibrant/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                    Speichere...
                  </>
                ) : (
                  "Beziehungen speichern"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

