/**
 * quest-actions — part 2: getQuestParticipants, syncQuestParticipants, getQuestAnchors.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { QuestAnchor } from "@/src/types/quest";

/**
 * Server Actions für Quests (Journal)
 *
 * Unterstützt:
 * - Create Quest (with NPC/Location links)
 * - Update Quest
 * - Delete Quest
 * - Toggle Reveal Status
 * - Complete Quest
 * - Get Quests (with NPC & Location Joins)
 */

// ============================================================================
// Create Quest
// ============================================================================


// Get Quest Participants
export async function getQuestParticipants(questId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Participants with NPC data
  const { data: participants, error } = await (
    supabase.from("quest_participants") as any
  )
    .select(
      `
      id,
      npc_id,
      role_description,
      npcs (
        id,
        name,
        title,
        role
      )
    `,
    )
    .eq("quest_id", questId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Get Quest Participants Error:", error);
    return [];
  }

  return participants || [];
}


// Sync Quest Participants (for Create/Update Quest)
export async function syncQuestParticipants(
  questId: string,
  participants: Array<{ npc_id: string; role_description: string | null }>,
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Quest to verify GM ownership
  const { data: quest } = await (supabase.from("quests") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", questId)
    .single();

  if (!quest) throw new Error("Quest nicht gefunden.");

  const campaigns = quest.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Teilnehmer verwalten.");
  }

  // 3. Get existing participants
  const { data: existing } = await (supabase.from("quest_participants") as any)
    .select("id, npc_id")
    .eq("quest_id", questId);

  const existingNPCIds = new Set((existing || []).map((p: any) => p.npc_id));
  const newNPCIds = new Set(participants.map((p: any) => p.npc_id));

  // 4. Delete removed participants
  const toDelete = (existing || []).filter(
    (p: any) => !newNPCIds.has(p.npc_id),
  );
  if (toDelete.length > 0) {
    const { error: deleteError } = await (
      supabase.from("quest_participants") as any
    )
      .delete()
      .in(
        "id",
        toDelete.map((p: any) => p.id),
      );

    if (deleteError) {
      console.error("Delete Participants Error:", deleteError);
      throw new Error(deleteError.message);
    }
  }

  // 5. Insert/Update participants
  for (const participant of participants) {
    const existingParticipant = (existing as any[])?.find(
      (p: any) => p.npc_id === participant.npc_id,
    );

    if (existingParticipant) {
      // Update existing
      const { error: updateError } = await (
        supabase.from("quest_participants") as any
      )
        .update({ role_description: participant.role_description || null })
        .eq("id", existingParticipant.id);

      if (updateError) {
        console.error("Update Participant Error:", updateError);
        throw new Error(updateError.message);
      }
    } else {
      // Insert new
      const { error: insertError } = await (
        supabase.from("quest_participants") as any
      ).insert({
        quest_id: questId,
        npc_id: participant.npc_id,
        role_description: participant.role_description || null,
      });

      if (insertError) {
        console.error("Insert Participant Error:", insertError);
        throw new Error(insertError.message);
      }
    }
  }

  revalidatePath(`/dashboard/campaigns/${quest.campaign_id}`);
}


// ============================================================================
// Get Quest Anchors (Erzählerische Anker für KI-Quest-Generierung)
// ============================================================================
export async function getQuestAnchors(
  campaignId: string,
  questGiverId?: string | null,
  locationId?: string | null,
): Promise<QuestAnchor[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const anchors: QuestAnchor[] = [];

  if (questGiverId) {
    const { data: npc } = await (supabase.from("npcs") as any)
      .select("id, name, faction_id, current_location_id")
      .eq("id", questGiverId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (npc) {
      const locId = locationId || npc.current_location_id;

      const { data: secrets } = await (supabase.from("secrets") as any)
        .select("id, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "npc")
        .eq("entity_id", questGiverId);

      if (secrets) {
        secrets.forEach((s: any) => {
          anchors.push({
            id: `secret:${s.id}`,
            type: "npc_secret",
            label: s.title || "Geheimnis",
            summary:
              (s.content || "").substring(0, 180) +
              ((s.content || "").length > 180 ? "…" : ""),
          });
        });
      }

      const { data: relations } = await (supabase.from("npc_relations") as any)
        .select("id, npc_id_1, npc_id_2, relation_type, description")
        .eq("campaign_id", campaignId)
        .or(`npc_id_1.eq.${questGiverId},npc_id_2.eq.${questGiverId}`);

      if (relations && relations.length > 0) {
        const partnerIds = relations
          .map((r: any) =>
            r.npc_id_1 === questGiverId ? r.npc_id_2 : r.npc_id_1,
          )
          .filter(Boolean);
        const { data: partnerNPCs } = await (supabase.from("npcs") as any)
          .select("id, name")
          .in("id", partnerIds);
        const nameById: Record<string, string> = {};
        (partnerNPCs || []).forEach((n: any) => {
          nameById[n.id] = n.name;
        });

        relations.forEach((r: any) => {
          const pid = r.npc_id_1 === questGiverId ? r.npc_id_2 : r.npc_id_1;
          if (!pid) return;
          anchors.push({
            id: `relation:${r.id}`,
            type: "npc_relation",
            label: `${nameById[pid] || "Unbekannt"} – ${r.relation_type}`,
            summary: r.description || `${r.relation_type}`,
          });
        });
      }

      if (npc.faction_id) {
        const { data: faction } = await (supabase.from("factions") as any)
          .select("id, name, description")
          .eq("id", npc.faction_id)
          .maybeSingle();
        if (faction) {
          anchors.push({
            id: `faction:${faction.id}`,
            type: "faction",
            label: faction.name,
            summary:
              (faction.description || "").substring(0, 150) +
              ((faction.description || "").length > 150 ? "…" : ""),
          });
        }

        const { data: factionRels } = await (
          supabase.from("faction_relations") as any
        )
          .select("faction_id_1, faction_id_2, relation_type, description")
          .eq("campaign_id", campaignId)
          .or(
            `faction_id_1.eq.${npc.faction_id},faction_id_2.eq.${npc.faction_id}`,
          )
          .limit(10);

        if (factionRels) {
          const rivalIds = factionRels
            .map((fr: any) =>
              fr.faction_id_1 === npc.faction_id
                ? fr.faction_id_2
                : fr.faction_id_1,
            )
            .filter(Boolean);
          if (rivalIds.length > 0) {
            const { data: rivals } = await (supabase.from("factions") as any)
              .select("id, name, description")
              .in("id", rivalIds);
            (rivals || []).forEach((f: any) => {
              anchors.push({
                id: `faction_rival:${f.id}`,
                type: "faction_rival",
                label: `${f.name} (Rivale)`,
                summary:
                  (f.description || "").substring(0, 120) +
                  ((f.description || "").length > 120 ? "…" : ""),
              });
            });
          }
        }
      }

      const { data: loreEntries } = await (supabase.from("world_lore") as any)
        .select("id, name, type, description")
        .eq("campaign_id", campaignId)
        .limit(15);
      if (loreEntries) {
        loreEntries.forEach((l: any) => {
          anchors.push({
            id: `lore:${l.id}`,
            type: "lore",
            label: `${l.name} (${l.type || "Lore"})`,
            summary:
              (l.description || "").substring(0, 120) +
              ((l.description || "").length > 120 ? "…" : ""),
          });
        });
      }
    }
  }

  if (!questGiverId && locationId) {
    const { data: loreEntries } = await (supabase.from("world_lore") as any)
      .select("id, name, type, description")
      .eq("campaign_id", campaignId)
      .limit(15);
    if (loreEntries) {
      loreEntries.forEach((l: any) => {
        anchors.push({
          id: `lore:${l.id}`,
          type: "lore",
          label: `${l.name} (${l.type || "Lore"})`,
          summary:
            (l.description || "").substring(0, 120) +
            ((l.description || "").length > 120 ? "…" : ""),
        });
      });
    }
  }

  return anchors;
}
