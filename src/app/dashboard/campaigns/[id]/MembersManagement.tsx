"use client";

import Link from "next/link";
import {
  Check,
  X,
  UserX,
  Shield,
  Sparkles,
  FileEdit,
  Eye,
  Settings,
  Award,
  Info,
  Trash2,
} from "lucide-react";
import {
  acceptApplication,
  rejectApplication,
  removeMember,
  updateMemberRank,
  repairMemberCharacterLink,
} from "./actions";
import {
  approveCharacter,
  rejectCharacter,
  deleteCharacterByGM,
} from "./character-actions";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { IntegrationReportModal } from "./IntegrationReportModal";
import {
  getAllAchievements,
  awardAchievementAsGm,
} from "@/src/lib/actions/achievement-actions";
import { getAchievementImageSrc } from "@/src/types/achievement";
import { CharacterApplicationForm } from "@/src/components/dashboard/CharacterApplicationForm";
import { GMCharacterReview } from "@/src/components/dashboard/GMCharacterReview";
import { CharacterChangesView } from "@/src/components/dashboard/CharacterChangesView";
import { MemberDetailManager } from "@/src/components/campaigns/MemberDetailManager";
import { getMemberDetails, type MemberDetailData } from "@/src/lib/actions/point-actions";
import { updateMemberPlayerTableName } from "./members-actions";

type Member = {
  id: string;
  user_id: string;
  status: string;
  application_message: string | null;
  character_id?: string | null;
  player_table_name?: string | null;
  user: {
    username: string;
    avatar_url: string | null;
    campaign_rank?: string | null;
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
type NPC = {
  id: string;
  name: string;
  faction_id?: string | null;
  factions?: { name: string } | null;
};

function MemberTableNameField({
  campaignId,
  memberId,
  initialValue,
  characterName,
  platformUsername,
}: {
  campaignId: string;
  memberId: string;
  initialValue: string | null | undefined;
  characterName: string;
  platformUsername: string;
}) {
  const [value, setValue] = useState(initialValue?.trim() ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(initialValue?.trim() ?? "");
  }, [initialValue, memberId]);

  async function save(nextValue: string) {
    setSaving(true);
    try {
      const result = await updateMemberPlayerTableName(
        campaignId,
        memberId,
        nextValue.trim() || null,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tischname gespeichert.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded border border-hero-border/20 bg-background-card/40 px-3 py-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <span className="font-barlow text-[10px] font-bold uppercase text-gray-500">
            Echter Name am Tisch
          </span>
          <input
            type="text"
            value={value}
            disabled={saving}
            placeholder="z. B. Sonja"
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              const trimmed = value.trim();
              if (trimmed === (initialValue?.trim() ?? "")) return;
              void save(value);
            }}
            className="rounded border border-hero-border bg-background-dark px-2 py-1.5 font-libre text-sm text-white placeholder:text-gray-600 focus:border-accent-gold outline-none disabled:opacity-60"
          />
        </label>
        <p className="pb-1 font-libre text-[10px] text-gray-500 leading-snug">
          Profil: <span className="text-gray-400">{platformUsername}</span>
          {" · "}
          Figur: <span className="text-accent-gold">{characterName}</span>
        </p>
      </div>
      <p className="mt-1.5 font-libre text-[10px] text-gray-600">
        Für Chronist &amp; Recap: Ansprachen wie „Sonja" werden der Figur zugeordnet.
      </p>
    </div>
  );
}

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
  const [selectedCharacterForReview, setSelectedCharacterForReview] =
    useState<Member | null>(null);
  const [selectedCharacterForChanges, setSelectedCharacterForChanges] =
    useState<Member | null>(null);
  const [selectedMemberForAchievement, setSelectedMemberForAchievement] =
    useState<Member | null>(null);
  const [allAchievements, setAllAchievements] = useState<
    {
      id: string;
      name: string;
      points_awarded: number;
      image_url?: string | null;
      description?: string | null;
      is_custom?: boolean;
    }[]
  >([]);
  const [achievementSearch, setAchievementSearch] = useState("");
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [awardingAchievement, setAwardingAchievement] = useState(false);
  const [selectedMemberForDetails, setSelectedMemberForDetails] =
    useState<MemberDetailData | null>(null);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);

  const RANK_TITLES = [
    "Rang 1",
    "Rang 2",
    "Rang 3",
    "Rang 4",
    "Rang 5",
    "Rang 6",
    "Rang 7",
    "Rang 8",
    "Rang 9",
    "Rang 10",
    "Rang 11",
    "Rang 12",
    "Rang 13",
    "Rang 14",
    "Rang 15",
    "Rang 16",
    "Rang 17",
    "Rang 18",
    "Rang 19",
    "Rang 20",
  ];

  useEffect(() => {
    if (selectedMemberForAchievement && allAchievements.length === 0) {
      setLoadingAchievements(true);
      getAllAchievements().then((list) => {
        setAllAchievements(list);
        setLoadingAchievements(false);
      });
    }
  }, [selectedMemberForAchievement]);

  // Debug: Log character data in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      "🔍 MembersManagement - Pending Applications:",
      pendingApplications
    );
    if (pendingApplications.length > 0) {
      console.log(
        "🎭 Character Data Check:",
        pendingApplications.map((app) => ({
          user: app.user?.username,
          has_character: !!app.character,
          character_id: app.character_id,
          character_name: app.character?.name,
          character_data: app.character,
        }))
      );
    }
  }

  async function handleAccept(memberId: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // Bewerbung aus characters (Pending_Approval) → approveCharacter
      if (memberId.startsWith("char-")) {
        const characterId = memberId.slice(5);
        await approveCharacter(characterId, campaignId);
        window.location.reload();
        return;
      }
      const result = await acceptApplication(memberId, campaignId);
      if (result && typeof result === "object" && "characterName" in result) {
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
      if (memberId.startsWith("char-")) {
        await rejectCharacter(memberId.slice(5), campaignId);
        window.location.reload();
        return;
      }
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

  async function handleOpenMemberDetails(userId: string) {
    setLoadingMemberDetails(true);
    try {
      const result = await getMemberDetails(userId, campaignId);
      if (result.success && result.data) {
        setSelectedMemberForDetails(result.data);
      } else {
        toast.error(result.error ?? "Fehler beim Laden der Details.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden.");
    } finally {
      setLoadingMemberDetails(false);
    }
  }

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-bold text-xl text-white uppercase mb-6 border-b border-hero-dark pb-2">
        Teilnehmer & Bewerbungen
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
                      ⚠️ Charakter wird geladen... (ID:{" "}
                      {app.character_id?.slice(0, 8)})
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
                    <p className="font-barlow font-bold text-white">
                      {member.user.username}
                    </p>
                    <p className="font-libre text-xs text-blue-400">
                      Erstellt gerade den Charakter...
                    </p>
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
                    <p className="font-barlow font-bold text-white">
                      {member.user.username}
                    </p>
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
        {isGM && acceptedMembers.some((m) => m.character_id || m.character?.name) ? (
          <div className="mb-4 rounded-lg border border-purple-900/40 bg-purple-950/15 px-4 py-3">
            <p className="font-barlow text-xs font-bold uppercase text-purple-200">
              Namen für Audio-Auswertung
            </p>
            <p className="mt-1 font-libre text-sm text-gray-300 leading-relaxed">
              Trage pro Spieler den <strong className="text-white">echten Namen am Tisch</strong> ein
              (z. B. Sonja). Der Plattform-Profilname muss das nicht sein. Der Chronist ordnet
              Transkript-Ansprachen dann der Figur zu (z. B. Sajeri).
            </p>
          </div>
        ) : null}
        <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-4">
          Die Party ({acceptedMembers.filter((m) => m.character_id).length})
        </h3>
        {acceptedMembers.length === 0 ? (
          <p className="font-libre text-sm text-gray-400 text-center py-6 border border-hero-border/30 rounded bg-background-dark">
            Die Taverne ist noch leer. Akzeptiere Bewerbungen, um deine Gruppe
            zu bilden.
          </p>
        ) : (
          <div className="space-y-2">
            {acceptedMembers.map((member) => (
              <div
                key={member.id}
                className="rounded border border-hero-border/30 bg-background-dark p-4 hover:border-hero-vibrant transition-colors group"
              >
                <div className="flex items-center justify-between gap-3">
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
                    ) : member.character_id ? (
                      <p className="font-libre text-xs text-gray-400">
                        Charakter verknüpft — über „Verwalten“ öffnen, falls der Name hier nicht erscheint.
                      </p>
                    ) : (
                      <p className="font-libre text-xs text-gray-500">
                        Noch kein Charakter
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isGM && (
                    <>
                      <select
                        className="rounded-md border border-hero-border bg-background-dark px-2 py-1 text-xs font-barlow uppercase text-gray-300 hover:border-hero-vibrant focus:border-hero-vibrant outline-none"
                        defaultValue={member.user.campaign_rank ?? ""}
                        onChange={async (e) => {
                          const newRank = e.target.value;
                          try {
                            await updateMemberRank(
                              campaignId,
                              member.user_id,
                              newRank === "" ? "" : newRank
                            );
                            toast.success("Rang aktualisiert.");
                          } catch (err) {
                            const msg =
                              err instanceof Error
                                ? err.message
                                : "Rang konnte nicht aktualisiert werden.";
                            toast.error(msg);
                          }
                        }}
                      >
                        <option value="">Kein Rang</option>
                        {RANK_TITLES.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSelectedMemberForAchievement(member)}
                        disabled={isProcessing}
                        className="rounded-md p-2 text-gray-500 hover:bg-hero-dark hover:text-accent-gold transition-colors disabled:opacity-50"
                        title="Achievement verleihen"
                      >
                        <Award className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleOpenMemberDetails(member.user_id)}
                        disabled={isProcessing || loadingMemberDetails}
                        className="rounded-md p-2 text-gray-500 hover:bg-hero-dark hover:text-hero-vibrant transition-colors disabled:opacity-50"
                        title="Spieler & Charakter: Punkte, Achievements, RSVP"
                      >
                        <Info className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  {isGM &&
                    (member.character?.id || member.character_id ? (
                      <>
                        <Link
                          href={`/dashboard/campaigns/${campaignId}/characters/${member.character?.id ?? member.character_id}`}
                          className="rounded-md p-2 text-gray-500 hover:bg-hero-dark hover:text-accent-gold transition-colors"
                          title="Charakter verwalten"
                        >
                          <Settings className="h-5 w-5" />
                        </Link>
                        <Link
                          href={`/dashboard/campaigns/${campaignId}/characters/${member.character?.id ?? member.character_id}/player-view`}
                          className="rounded-md p-2 text-gray-500 hover:bg-hero-dark hover:text-hero-vibrant transition-colors"
                          title="Spieler-Ansicht (Profil & Datenblatt)"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            if (isProcessing) return;
                            const charId = member.character?.id ?? member.character_id;
                            if (!charId) return;
                            const name = member.character?.name || "diesen Charakter";
                            if (
                              !confirm(
                                `Charakter „${name}" aus der Kampagne entfernen? Der Charakter bleibt im Profil des Spielers und kann dort später gelöscht werden.`,
                              )
                            )
                              return;
                            setIsProcessing(true);
                            try {
                              await deleteCharacterByGM(charId, campaignId);
                              toast.success("Charakter wurde aus der Kampagne entfernt.");
                              window.location.reload();
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : "Charakter konnte nicht entfernt werden.",
                              );
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          disabled={isProcessing}
                          className="rounded-md p-2 text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Charakter entfernen"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          if (isProcessing) return;
                          setIsProcessing(true);
                          try {
                            const res = await repairMemberCharacterLink(campaignId, member.user_id, member.id);
                            if (res?.success) {
                              toast.success("Charakter verknüpft. Seite wird neu geladen.");
                              window.location.reload();
                            }
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Fehler");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                        className="rounded-md p-2 text-gray-500 hover:bg-hero-dark hover:text-accent-gold transition-colors disabled:opacity-50"
                        title="Charakter verwalten / Ruf einstellen"
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                    ))}
                  <button
                    onClick={() =>
                      handleRemove(member.id, member.user.username)
                    }
                    disabled={isProcessing}
                    className="rounded-md p-2 text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Aus Kampagne entfernen"
                  >
                    <UserX className="h-5 w-5" />
                  </button>
                </div>
                </div>
                {isGM && member.character?.name ? (
                  <MemberTableNameField
                    campaignId={campaignId}
                    memberId={member.id}
                    initialValue={member.player_table_name}
                    characterName={member.character.name}
                    platformUsername={member.user.username}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Character Review Modal (GM) */}
      {isGM &&
        selectedCharacterForReview &&
        selectedCharacterForReview.character && (
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
      {!isGM &&
        selectedCharacterForChanges &&
        selectedCharacterForChanges.character && (
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

      {/* GM: Achievement verleihen Modal */}
      {isGM && selectedMemberForAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border border-hero-dark bg-background-card shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex-none p-4 border-b border-hero-dark flex items-center justify-between">
              <h2 className="font-barlow font-bold text-xl uppercase text-hero-vibrant">
                Achievement verleihen
              </h2>
              <button
                onClick={() => {
                  setSelectedMemberForAchievement(null);
                  setAllAchievements([]);
                }}
                className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="px-4 py-2 font-libre text-sm text-gray-400 border-b border-hero-border/50">
              An{" "}
              <strong className="text-white">
                {selectedMemberForAchievement.user.username}
              </strong>
            </p>
            <div className="flex-none px-4 py-2 border-b border-hero-border/50">
              <input
                type="text"
                placeholder="Achievement suchen…"
                value={achievementSearch}
                onChange={(e) => setAchievementSearch(e.target.value)}
                className="w-full rounded border border-hero-border bg-background-dark px-3 py-2 font-libre text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAchievements ? (
                <p className="font-libre text-gray-500 text-center py-8">
                  Lade Achievements…
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {allAchievements
                    .filter(
                      (ach) =>
                        !achievementSearch.trim() ||
                        ach.name
                          .toLowerCase()
                          .includes(achievementSearch.trim().toLowerCase())
                    )
                    .map((ach) => (
                      <button
                        key={ach.id}
                        type="button"
                        disabled={awardingAchievement}
                        onClick={async () => {
                          setAwardingAchievement(true);
                          try {
                            const result = await awardAchievementAsGm(
                              selectedMemberForAchievement.user_id,
                              ach.name,
                              campaignId
                            );
                            if (result.success) {
                              toast.success(
                                `„${ach.name}“ an ${selectedMemberForAchievement.user.username} verliehen.`
                              );
                              setSelectedMemberForAchievement(null);
                              setAllAchievements([]);
                              window.location.reload();
                            } else {
                              toast.error(
                                result.error ?? "Vergabe fehlgeschlagen."
                              );
                            }
                          } finally {
                            setAwardingAchievement(false);
                          }
                        }}
                        className="group relative flex flex-col items-center rounded border border-hero-border/40 bg-hero-dark/30 p-3 font-libre text-gray-200 hover:border-accent-gold/50 hover:bg-accent-gold/10 transition-colors disabled:opacity-50"
                        title={
                          (ach.description ?? "").trim()
                            ? `${ach.description} · +${ach.points_awarded} Pkt`
                            : `${ach.name} · +${ach.points_awarded} Pkt`
                        }
                      >
                        <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded overflow-hidden bg-hero-dark/50 mb-1">
                          {(() => {
                            const src = getAchievementImageSrc(ach.image_url);
                            return src ? (
                              <img
                                src={src}
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <Award className="h-6 w-6 text-accent-gold/70" />
                            );
                          })()}
                        </div>
                        <span className="text-xs text-center line-clamp-2 w-full">
                          {ach.name}
                        </span>
                        <span className="text-[10px] font-barlow text-accent-gold mt-0.5">
                          +{ach.points_awarded} Pkt
                        </span>
                        {(ach.description ?? "").trim() && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 rounded bg-background-card border border-hero-border text-xs text-gray-300 whitespace-normal max-w-[200px] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                            {ach.description}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Details Modal (GM) */}
      {isGM && selectedMemberForDetails && (
        <MemberDetailManager
          member={selectedMemberForDetails}
          campaignId={campaignId}
          onClose={() => setSelectedMemberForDetails(null)}
        />
      )}
    </div>
  );
}
