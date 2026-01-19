"use client";

import { Check, X, UserX, Shield, Sparkles, FileEdit, Eye, Settings } from "lucide-react";
import { acceptApplication, rejectApplication, removeMember } from "./actions";
import { useState } from "react";
import { IntegrationReportModal } from "./IntegrationReportModal";
import { CharacterApplicationForm } from "@/src/components/dashboard/CharacterApplicationForm";
import { GMCharacterReview } from "@/src/components/dashboard/GMCharacterReview";
import { CharacterChangesView } from "@/src/components/dashboard/CharacterChangesView";
import { GMCharacterEditor } from "@/src/components/dashboard/campaigns/GMCharacterEditor";

type Member = {
  id: string;
  user_id: string;
  status: string;
  application_message: string | null;
  character_id?: string | null;
  user: {
    username: string;
    avatar_url: string | null;
  };
  character?: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    status?: string;
    modification_log?: any[] | null;
    [key: string]: any;
  } | null;
};

type Faction = { id: string; name: string };
type Location = { id: string; name: string };
type NPC = { id: string; name: string; faction_id?: string | null; factions?: { name: string } | null };

type MembersManagementProps = {
  campaignId: string;
  pendingApplications: Member[];
  draftingMembers: Member[];
  inReviewMembers: Member[];
  acceptedMembers: Member[];
  isGM: boolean;
  factions: Faction[];
  locations: Location[];
  npcs: NPC[];
};

export function MembersManagement({
  campaignId,
  pendingApplications,
  draftingMembers,
  inReviewMembers,
  acceptedMembers,
  isGM,
  factions,
  locations,
  npcs,
}: MembersManagementProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [integrationReport, setIntegrationReport] = useState<{
    characterName: string;
    questTitle?: string;
    suggestedNPCs?: string[];
    suggestedLocations?: string[];
  } | null>(null);
  const [selectedCharacterForReview, setSelectedCharacterForReview] = useState<Member | null>(null);
  const [selectedCharacterForChanges, setSelectedCharacterForChanges] = useState<Member | null>(null);
  const [selectedCharacterForEdit, setSelectedCharacterForEdit] = useState<Member | null>(null);

  // Debug: Log character data in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 MembersManagement - Pending Applications:', pendingApplications);
    if (pendingApplications.length > 0) {
      console.log('🎭 Character Data Check:', pendingApplications.map(app => ({
        user: app.user?.username,
        has_character: !!app.character,
        character_id: app.character_id,
        character_name: app.character?.name,
        character_data: app.character
      })));
    }
  }

  async function handleAccept(memberId: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await acceptApplication(memberId, campaignId);
      // Show integration report if available
      if (result && typeof result === 'object' && 'characterName' in result) {
        setIntegrationReport({
          characterName: result.characterName as string,
          questTitle: result.questTitle as string | undefined,
          suggestedNPCs: result.suggestedNPCs as string[] | undefined,
          suggestedLocations: result.suggestedLocations as string[] | undefined,
        });
        setIsProcessing(false);
      } else {
        window.location.reload();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler");
      setIsProcessing(false);
    }
  }

  async function handleReject(memberId: string) {
    if (isProcessing) return;
    if (!confirm("Bewerbung wirklich ablehnen?")) return;
    setIsProcessing(true);
    try {
      await rejectApplication(memberId, campaignId);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler");
      setIsProcessing(false);
    }
  }

  async function handleRemove(memberId: string, username: string) {
    if (isProcessing) return;
    if (!confirm(`${username} wirklich aus der Kampagne entfernen?`)) return;
    setIsProcessing(true);
    try {
      await removeMember(memberId, campaignId);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler");
      setIsProcessing(false);
    }
  }

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-bold text-xl text-white uppercase mb-6 border-b border-hero-dark pb-2">
        Mitglieder & Bewerbungen
      </h2>

      {/* Pending Applications */}
      <div className="mb-8">
        <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-4">
          Offene Bewerbungen
        </h3>
        {pendingApplications.length === 0 ? (
          <p className="font-libre text-sm text-gray-400 text-center py-6 border border-hero-border/30 rounded bg-background-dark">
            Keine offenen Bewerbungen.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingApplications.map((app) => (
              <div
                key={app.id}
                className="rounded border border-yellow-700/50 bg-yellow-950/10 p-4"
              >
                {/* User Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-hero-dark text-white font-bold flex items-center justify-center">
                    {app.user.avatar_url ? (
                      <img
                        src={app.user.avatar_url}
                        alt={app.user.username}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{app.user.username[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-barlow font-bold text-white">
                      {app.user.username}
                    </p>
                    <p className="font-libre text-xs text-yellow-400">
                      Bewerbung eingereicht
                    </p>
                  </div>
                </div>

                {/* Character Info */}
                {app.character && app.character.name ? (
                  <div className="mb-3 rounded bg-background-dark p-3 border border-hero-border/20">
                    <p className="font-barlow text-xs uppercase text-gray-500 mb-2">
                      Bewirbt sich mit:
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-cinzel font-bold text-lg text-accent-gold">
                        {app.character.name}
                      </p>
                      <span className="rounded bg-hero-dark px-2 py-0.5 font-barlow text-xs text-gray-400">
                        Lvl {app.character.level || 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-accent-gold" />
                        {app.character.class || "Unbekannt"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-accent-gold" />
                        {app.character.race || "Unbekannt"}
                      </span>
                    </div>
                  </div>
                ) : app.character_id ? (
                  <div className="mb-3 rounded bg-yellow-950/10 p-3 border border-yellow-900/30">
                    <p className="font-libre text-xs text-yellow-400">
                      ⚠️ Charakter wird geladen... (ID: {app.character_id?.slice(0, 8)})
                    </p>
                  </div>
                ) : (
                  <div className="mb-3 rounded bg-red-950/10 p-3 border border-red-900/30">
                    <p className="font-libre text-xs text-red-400">
                      ⚠️ Kein Charakter zugeordnet (Legacy-Bewerbung)
                    </p>
                  </div>
                )}

                {/* Message */}
                {app.application_message && (
                  <div className="mb-4 rounded bg-background-dark p-3 border border-hero-border/20">
                    <p className="font-libre text-sm text-gray-300 leading-relaxed">
                      {app.application_message}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(app.id)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 rounded bg-green-900/50 border border-green-700 px-4 py-2 font-barlow font-bold uppercase text-xs text-green-400 hover:bg-green-900 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Akzeptieren
                  </button>
                  <button
                    onClick={() => handleReject(app.id)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 rounded bg-red-900/50 border border-red-700 px-4 py-2 font-barlow font-bold uppercase text-xs text-red-400 hover:bg-red-900 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drafting Members (Spieler erstellt Charakter) */}
      {isGM && draftingMembers.length > 0 && (
        <div className="mb-8">
          <h3 className="font-cinzel font-bold text-lg text-blue-400 mb-4">
            Charakter-Erstellung ({draftingMembers.length})
          </h3>
          <div className="space-y-4">
            {draftingMembers.map((member) => (
              <div
                key={member.id}
                className="rounded border border-blue-700/50 bg-blue-950/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-barlow font-bold text-white">{member.user.username}</p>
                    <p className="font-libre text-xs text-blue-400">Erstellt gerade den Charakter...</p>
                  </div>
                  <button
                    onClick={() => {
                      // Öffne CharacterApplicationForm für diesen Spieler
                      // (wird in einem Modal geöffnet)
                    }}
                    className="rounded border border-blue-700 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-blue-400 hover:bg-blue-900 transition-colors"
                  >
                    <FileEdit className="inline h-4 w-4 mr-1" />
                    Formular öffnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In Review Members (GM Review) */}
      {isGM && inReviewMembers.length > 0 && (
        <div className="mb-8">
          <h3 className="font-cinzel font-bold text-lg text-purple-400 mb-4">
            Zur Prüfung ({inReviewMembers.length})
          </h3>
          <div className="space-y-4">
            {inReviewMembers.map((member) => (
              <div
                key={member.id}
                className="rounded border border-purple-700/50 bg-purple-950/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-barlow font-bold text-white">{member.user.username}</p>
                    <p className="font-libre text-xs text-purple-400">
                      Status: {member.character?.status || member.status}
                    </p>
                    {member.character?.name && (
                      <p className="font-cinzel text-sm text-accent-gold mt-1">
                        {member.character.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedCharacterForReview(member)}
                    className="rounded border border-purple-700 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-purple-400 hover:bg-purple-900 transition-colors"
                  >
                    <Eye className="inline h-4 w-4 mr-1" />
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Members (The Party) */}
      <div>
        <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-4">
          Die Party ({acceptedMembers.filter((m) => m.character_id).length})
        </h3>
        {acceptedMembers.length === 0 ? (
          <p className="font-libre text-sm text-gray-400 text-center py-6 border border-hero-border/30 rounded bg-background-dark">
            Die Taverne ist noch leer. Akzeptiere Bewerbungen, um deine Gruppe zu bilden.
          </p>
        ) : (
          <div className="space-y-2">
            {acceptedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded border border-hero-border/30 bg-background-dark p-4 hover:border-hero-vibrant transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-full bg-hero-dark text-white font-bold flex items-center justify-center">
                    {member.user.avatar_url ? (
                      <img
                        src={member.user.avatar_url}
                        alt={member.user.username}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{member.user.username[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-barlow font-bold text-white group-hover:text-hero-vibrant transition-colors">
                      {member.user.username}
                    </p>
                    {member.character && member.character.name ? (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded bg-hero-dark/50 border border-hero-border px-2 py-0.5">
                          <Shield className="h-3 w-3 text-accent-gold" />
                          <span className="font-cinzel font-bold text-sm text-accent-gold">
                            {member.character.name}
                          </span>
                          <span className="font-barlow text-xs text-gray-400">
                            Lvl {member.character.level || 1}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="font-libre text-xs text-gray-500">Noch kein Charakter</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isGM && member.character && member.character.id && (
                    <button
                      onClick={() => setSelectedCharacterForEdit(member)}
                      disabled={isProcessing}
                      className="rounded-md p-2 text-gray-500 hover:bg-hero-dark hover:text-accent-gold transition-colors disabled:opacity-50"
                      title="Charakter verwalten"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(member.id, member.user.username)}
                    disabled={isProcessing}
                    className="rounded-md p-2 text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Aus Kampagne entfernen"
                  >
                    <UserX className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Character Review Modal (GM) */}
      {isGM && selectedCharacterForReview && selectedCharacterForReview.character && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-lg border border-hero-dark bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex-none p-6 border-b border-hero-dark">
              <div className="flex items-center justify-between">
                <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant">
                  Charakter-Review
                </h2>
                <button
                  onClick={() => setSelectedCharacterForReview(null)}
                  className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <GMCharacterReview
                campaignId={campaignId}
                character={selectedCharacterForReview.character as any}
                factions={factions}
                locations={locations}
                npcs={npcs as any}
                onResolve={() => {
                  setSelectedCharacterForReview(null);
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Character Changes View (Player) */}
      {!isGM && selectedCharacterForChanges && selectedCharacterForChanges.character && (
        <CharacterChangesView
          campaignId={campaignId}
          character={selectedCharacterForChanges.character as any}
          onResolve={() => {
            setSelectedCharacterForChanges(null);
            window.location.reload();
          }}
          onBack={() => setSelectedCharacterForChanges(null)}
        />
      )}

      {/* Integration Report Modal */}
      {integrationReport && (
        <IntegrationReportModal
          isOpen={!!integrationReport}
          onClose={() => {
            setIntegrationReport(null);
            window.location.reload();
          }}
          characterName={integrationReport.characterName}
          questTitle={integrationReport.questTitle}
          suggestedNPCs={integrationReport.suggestedNPCs}
          suggestedLocations={integrationReport.suggestedLocations}
        />
      )}

      {/* GM Character Editor Modal */}
      {isGM && selectedCharacterForEdit && selectedCharacterForEdit.character && (
        <GMCharacterEditor
          isOpen={!!selectedCharacterForEdit}
          onClose={() => setSelectedCharacterForEdit(null)}
          character={selectedCharacterForEdit.character as any}
          campaignId={campaignId}
          npcs={npcs as any}
        />
      )}
    </div>
  );
}

