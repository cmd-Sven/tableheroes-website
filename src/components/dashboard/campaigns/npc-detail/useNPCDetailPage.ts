/**
 * State and handlers for the campaign NPC detail page.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  normalizeImageDisplay,
  type ImageDisplaySettings,
} from "@/src/lib/image-display";
import { uploadNpcPortrait } from "@/src/lib/profile-media";
import { buildNpcPortraitMeta } from "@/src/lib/npc-portrait-meta";
import {
  parseNpcSheetData,
  type NpcSheetData,
} from "@/src/lib/npcs/npc-sheet-types";
import {
  updateNPC,
  updateNPCNotes,
  toggleNPCFavorite,
} from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import {
  toggleNPCReveal,
  deleteNPC,
} from "@/src/app/dashboard/campaigns/[id]/npc-campaign-actions";
import { sendCampaignEntityToDiscord } from "@/src/app/dashboard/campaigns/[id]/campaign-discord-actions";
import { upsertCampaignNote } from "@/src/app/dashboard/campaigns/[id]/campaign-notes-actions";
import { NarrativeHook } from "@/src/types/npc";
import { useWorldEntities } from "@/src/hooks/useWorldEntities";
import type { NPCDetailPageProps } from "./types";
import { useNpcHookRelations } from "./useNpcHookRelations";

export function useNPCDetailPage({
  npc: initialNpc,
  campaignId,
  worldId,
  isGM,
  canEdit,
  userId,
  initialCampaignPlayerNote = "",
  factions = [],
  locations = [],
  lastSeen = null,
  sceneAppearances = [],
  npcsForQuest = [],
  membersForQuest = [],
}: NPCDetailPageProps) {
  const router = useRouter();
  const { entities } = useWorldEntities(worldId ?? (initialNpc as { world_id?: string }).world_id);
  const [isPending, startTransition] = useTransition();
  const [npc, setNpc] = useState(initialNpc);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<
    "description" | "appearance" | "personality" | "combat"
  >("description");
  const [combatDraft, setCombatDraft] = useState<NpcSheetData | null>(() =>
    parseNpcSheetData((initialNpc as { sheet_data?: unknown }).sheet_data),
  );

  // Editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [imageDisplayEdit, setImageDisplayEdit] = useState<ImageDisplaySettings | null>(null);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [uploadRightsConfirmed, setUploadRightsConfirmed] = useState(false);
  const [portraitIsAiGenerated, setPortraitIsAiGenerated] = useState(false);
  const [urlRightsConfirmed, setUrlRightsConfirmed] = useState(false);
  const npcWorldId = worldId ?? (npc as { world_id?: string }).world_id ?? null;

  const [isEditingGMNotes, setIsEditingGMNotes] = useState(false);
  const [isEditingPlayerNotes, setIsEditingPlayerNotes] = useState(false);
  const [gmNotes, setGmNotes] = useState(npc.gm_notes || "");
  const [playerNotes, setPlayerNotes] = useState(initialCampaignPlayerNote ?? "");
  const [selectedHook, setSelectedHook] = useState<NarrativeHook | null>(null);
  const [hookSuccessFeedback, setHookSuccessFeedback] = useState<string | null>(
    null
  );
  const [isFavorite, setIsFavorite] = useState(npc.is_favorite || false);
  const [isRevealed, setIsRevealed] = useState(npc.is_revealed);
  // Lokaler State für narrative_hooks, damit wir sie sofort aktualisieren können
  const [narrativeHooks, setNarrativeHooks] = useState<NarrativeHook[]>(
    npc.narrative_hooks || []
  );
  // State für existierende NPCs (für Smart Links)
  const [existingNPCs, setExistingNPCs] = useState<
    Record<string, { id: string; name: string }>
  >({});
  // State für NPCs ohne Relation (für "Heilung")
  const [npcsWithoutRelation, setNpcsWithoutRelation] = useState<Set<string>>(
    new Set()
  );
  // State für Hooks, die durch Fuzzy-Matching bereits als verknüpft gelten (sollten ausgeblendet werden)
  const [hiddenHooks, setHiddenHooks] = useState<Set<string>>(new Set());
  const [isLinkingRelation, setIsLinkingRelation] = useState<string | null>(
    null
  );
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [secretsRefreshKey, setSecretsRefreshKey] = useState(0);

  useNpcHookRelations({
    narrativeHooks,
    campaignId,
    npcId: npc.id,
    setExistingNPCs,
    setNpcsWithoutRelation,
    setHiddenHooks,
  });

  const handleToggleFavorite = () => {
    startTransition(async () => {
      try {
        await toggleNPCFavorite(npc.id, isFavorite);
        setIsFavorite(!isFavorite);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Aktualisieren der Favoriten.";
        alert(errorMessage);
      }
    });
  };

  const handleSaveField = (field: string) => {
    startTransition(async () => {
      try {
        const updates: Record<string, string | null | ImageDisplaySettings | unknown> = {};
        const value = editValues[field];

        if (field === "image_url") {
          let nextImageUrl = value?.trim() || null;
          if (portraitFile) {
            if (!npcWorldId) throw new Error("Welt-Kontext fehlt für den Portrait-Upload.");
            const upload = await uploadNpcPortrait(portraitFile, {
              worldId: npcWorldId,
              npcId: npc.id,
            });
            if ("error" in upload) throw new Error(upload.error);
            nextImageUrl = upload.publicUrl;
          }
          updates.image_url = nextImageUrl;
          updates.image_display = nextImageUrl
            ? normalizeImageDisplay(imageDisplayEdit ?? npc.image_display)
            : null;

          if (portraitFile || !nextImageUrl) {
            const portraitMeta = buildNpcPortraitMeta({
              imageUrl: nextImageUrl,
              portraitFile,
              portraitIsAiGenerated: portraitFile ? false : portraitIsAiGenerated,
              uploadRightsConfirmed,
              urlRightsConfirmed,
            });
            updates.image_is_ai_generated = portraitMeta.image_is_ai_generated;
            updates.image_upload_rights_confirmed =
              portraitMeta.image_upload_rights_confirmed;
          } else if (nextImageUrl) {
            const portraitMeta = buildNpcPortraitMeta({
              imageUrl: nextImageUrl,
              portraitFile: null,
              portraitIsAiGenerated,
              uploadRightsConfirmed: false,
              urlRightsConfirmed,
            });
            updates.image_is_ai_generated = portraitMeta.image_is_ai_generated;
            updates.image_upload_rights_confirmed =
              portraitMeta.image_upload_rights_confirmed;
          }
        } else if (field === "faction_id" || field === "current_location_id") {
          updates[field] = value && value.trim() !== "" ? value : null;
        } else {
          updates[field] = value || null;
        }

        await updateNPC(npc.id, updates as Parameters<typeof updateNPC>[1]);

        // Update local state
        if (field === "faction_id") {
          const selectedFaction = factions.find((f) => f.id === value);
          setNpc((prev) => ({
            ...prev,
            faction_id: value || null,
            factions: selectedFaction
              ? { id: selectedFaction.id, name: selectedFaction.name, type: "" }
              : null,
          }));
        } else if (field === "current_location_id") {
          const selectedLocation = locations.find((l) => l.id === value);
          setNpc((prev) => ({
            ...prev,
            current_location_id: value || null,
            current_location: selectedLocation
              ? {
                  id: selectedLocation.id,
                  name: selectedLocation.name,
                  type: selectedLocation.type,
                }
              : null,
          }));
        } else if (field === "image_url") {
          const savedUrl =
            portraitFile && updates.image_url
              ? String(updates.image_url)
              : value?.trim() || null;
          setNpc((prev) => ({
            ...prev,
            image_url: savedUrl,
            image_display: savedUrl
              ? normalizeImageDisplay(imageDisplayEdit ?? prev.image_display)
              : null,
            image_is_ai_generated:
              portraitFile || !savedUrl
                ? (updates.image_is_ai_generated as boolean | undefined) ?? false
                : prev.image_is_ai_generated,
            image_upload_rights_confirmed:
              portraitFile || !savedUrl
                ? (updates.image_upload_rights_confirmed as boolean | null | undefined) ?? null
                : prev.image_upload_rights_confirmed,
          }));
          setPortraitFile(null);
          setUploadRightsConfirmed(false);
        } else {
          setNpc((prev) => ({ ...prev, [field]: value || null }));
        }

        setEditingField(null);
        setEditValues({});
        setImageDisplayEdit(null);
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Fehler beim Speichern.";
        alert(errorMessage);
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValues({});
    setImageDisplayEdit(null);
    setPortraitFile(null);
    setUploadRightsConfirmed(false);
  };

  const handleStartEdit = (field: string, currentValue: string | null) => {
    setEditingField(field);
    setEditValues({ [field]: currentValue || "" });
    if (field === "image_url") {
      setImageDisplayEdit(normalizeImageDisplay(npc.image_display));
      setPortraitFile(null);
      setUploadRightsConfirmed(false);
      setPortraitIsAiGenerated(npc.image_is_ai_generated === true);
      setUrlRightsConfirmed(npc.image_upload_rights_confirmed === true);
    } else {
      setImageDisplayEdit(null);
      setPortraitFile(null);
      setUploadRightsConfirmed(false);
      setPortraitIsAiGenerated(false);
      setUrlRightsConfirmed(false);
    }
  };

  const handleSaveGMNotes = () => {
    startTransition(async () => {
      try {
        await updateNPCNotes(npc.id, { gm_notes: gmNotes });
        setIsEditingGMNotes(false);
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Speichern der Notizen.";
        alert(errorMessage);
      }
    });
  };

  const handleSavePlayerNotes = () => {
    startTransition(async () => {
      try {
        await upsertCampaignNote(campaignId, "npc", npc.id, playerNotes);
        setIsEditingPlayerNotes(false);
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Speichern der Notizen.";
        alert(errorMessage);
      }
    });
  };

  const handleToggleVisibility = () => {
    startTransition(async () => {
      try {
        await toggleNPCReveal(campaignId, npc.id, isRevealed);
        setIsRevealed(!isRevealed);
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fehler beim Ändern der Sichtbarkeit.";
        alert(errorMessage);
      }
    });
  };

  const [discordSending, setDiscordSending] = useState(false);

  const handleSendDiscord = () => {
    setDiscordSending(true);
    void sendCampaignEntityToDiscord(campaignId, "npc", npc.id)
      .then((result) => {
        if (result.success) {
          if (result.error) toast.warning(result.error);
          else toast.success(`„${npc.name}" an Discord gesendet.`);
        } else toast.error(result.error ?? "Discord-Versand fehlgeschlagen.");
      })
      .finally(() => setDiscordSending(false));
  };

  const handleDelete = () => {
    if (
      !confirm(
        `Möchtest du "${npc.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteNPC(npc.id);
        router.push(`/dashboard/campaigns/${campaignId}?tab=npcs`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Fehler beim Löschen.";
        alert(errorMessage);
      }
    });
  };

  const activeQuests = (npc.all_quests || []).filter(
    (q) => q.status === "Active"
  );
  const completedQuests = (npc.all_quests || []).filter(
    (q) => q.status === "Completed"
  );

  return {
    router,
    entities,
    isPending,
    startTransition,
    npc,
    setNpc,
    isQuestModalOpen,
    setIsQuestModalOpen,
    activeTab,
    setActiveTab,
    combatDraft,
    setCombatDraft,
    editingField,
    editValues,
    setEditValues,
    imageDisplayEdit,
    setImageDisplayEdit,
    portraitFile,
    setPortraitFile,
    uploadRightsConfirmed,
    setUploadRightsConfirmed,
    portraitIsAiGenerated,
    setPortraitIsAiGenerated,
    urlRightsConfirmed,
    setUrlRightsConfirmed,
    npcWorldId,
    isEditingGMNotes,
    setIsEditingGMNotes,
    isEditingPlayerNotes,
    setIsEditingPlayerNotes,
    gmNotes,
    setGmNotes,
    playerNotes,
    setPlayerNotes,
    selectedHook,
    setSelectedHook,
    hookSuccessFeedback,
    setHookSuccessFeedback,
    isFavorite,
    isRevealed,
    narrativeHooks,
    setNarrativeHooks,
    existingNPCs,
    npcsWithoutRelation,
    setNpcsWithoutRelation,
    hiddenHooks,
    isLinkingRelation,
    setIsLinkingRelation,
    isSecretModalOpen,
    setIsSecretModalOpen,
    secretsRefreshKey,
    setSecretsRefreshKey,
    discordSending,
    campaignId,
    worldId,
    isGM,
    canEdit,
    userId,
    initialCampaignPlayerNote,
    factions,
    locations,
    lastSeen,
    sceneAppearances,
    npcsForQuest,
    membersForQuest,
    handleToggleFavorite,
    handleSaveField,
    handleCancelEdit,
    handleStartEdit,
    handleSaveGMNotes,
    handleSavePlayerNotes,
    handleToggleVisibility,
    handleSendDiscord,
    handleDelete,
    activeQuests,
    completedQuests,
  };
}

export type NPCDetailController = ReturnType<typeof useNPCDetailPage>;
