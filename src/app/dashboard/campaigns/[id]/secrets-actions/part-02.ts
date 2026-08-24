/**
 * secrets-actions — part 2: toggleSecretForCharacter, getCampaignCharacters, getRelatedSecrets.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions für Secrets (Geheimnisse & Wissen)
 *
 * Unterstützt:
 * - Get Secrets für eine Entität
 * - Create Secret
 * - Delete Secret
 * - Toggle Global Reveal Status
 * - Toggle Secret für Charakter
 * - Get Campaign Characters
 */

// ============================================================================
// Get Secrets for Entity
// ============================================================================

export async function toggleSecretForCharacter(
  secretId: string,
  characterId: string,
  shouldShare: boolean
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Secret to verify GM ownership
  const { data: secretRaw } = await (supabase.from("secrets") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", secretId)
    .single();

  // Expliziter Cast gegen 'never'
  const secret = secretRaw as { campaign_id: string; campaigns: { gm_id: string } } | null;

  if (!secret) throw new Error("Secret nicht gefunden.");

  const campaigns = (secret as any).campaigns;
  if (!campaigns || campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Secrets für Charaktere freigeben.");
  }

  // 3. Verify character belongs to campaign
  const { data: characterRaw } = await (supabase.from("characters") as any)
    .select("campaign_id")
    .eq("id", characterId)
    .single();

  // Expliziter Cast gegen 'never'
  const character = characterRaw as { campaign_id: string } | null;

  if (!character || character.campaign_id !== (secret as any).campaign_id) {
    throw new Error("Charakter gehört nicht zu dieser Kampagne.");
  }

  // 4. Insert or Delete
  if (shouldShare) {
    // Insert (ignore if already exists)
    const { error } = await (supabase.from("secret_holders") as any)
      .insert({
        secret_id: secretId,
        character_id: characterId,
      })
      .select()
      .single();

    if (error && error.code !== "23505") {
      // 23505 = unique_violation (already exists, which is fine)
      console.error("❌ [toggleSecretForCharacter] Insert Error:", error);
      throw new Error("Fehler beim Freigeben des Secrets: " + error.message);
    }
  } else {
    // Delete
    const { error } = await (supabase.from("secret_holders") as any)
      .delete()
      .eq("secret_id", secretId)
      .eq("character_id", characterId);

    if (error) {
      console.error("❌ [toggleSecretForCharacter] Delete Error:", error);
      throw new Error("Fehler beim Entfernen des Secrets: " + error.message);
    }
  }

  revalidatePath(`/dashboard/campaigns/${(secret as any).campaign_id}`);
}

// ============================================================================
// Get Campaign Characters
// ============================================================================
export async function getCampaignCharacters(campaignId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch all characters for this campaign
  const { data: characters, error } = await (supabase.from("characters") as any)
    .select("id, name, user_id")
    .eq("campaign_id", campaignId)
    .order("name", { ascending: true });

  if (error) {
    console.error("❌ [getCampaignCharacters] Error:", error);
    return [];
  }

  return characters || [];
}

// ============================================================================
// Get Related Secrets for Context Selection
// ============================================================================
export async function getRelatedSecrets(
  campaignId: string,
  entityId: string,
  entityType: "npc" | "faction" | "lore"
): Promise<
  Array<{
    id: string;
    entity_id: string;
    entity_type: string;
    entity_name: string;
    title: string | null;
    content: string;
  }>
> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const relatedSecrets: Array<{
    id: string;
    entity_id: string;
    entity_type: string;
    entity_name: string;
    title: string | null;
    content: string;
  }> = [];

  if (entityType === "npc") {
    // Lade NPC-Daten (für Fraktion und Beziehungen)
    const { data: npc } = await (supabase.from("npcs") as any)
      .select("id, name, faction_id")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (!npc) return [];

    // 1. Geheimnisse der Fraktion
    if (npc.faction_id) {
      const { data: faction } = await (supabase.from("factions") as any)
        .select("name")
        .eq("id", npc.faction_id)
        .maybeSingle();

      const { data: factionSecrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "faction")
        .eq("entity_id", npc.faction_id);

      if (factionSecrets) {
        factionSecrets.forEach((s: any) => {
          relatedSecrets.push({
            id: s.id,
            entity_id: s.entity_id,
            entity_type: "faction",
            entity_name: faction?.name || "Unbekannte Fraktion",
            title: s.title,
            content: s.content,
          });
        });
      }
    }

    // 2. Geheimnisse der Partner-NPCs (via Relations)
    const { data: relations } = await (supabase.from("npc_relations") as any)
      .select("npc_id_1, npc_id_2")
      .eq("campaign_id", campaignId)
      .or(`npc_id_1.eq.${entityId},npc_id_2.eq.${entityId}`)
      .limit(20);

    if (relations && relations.length > 0) {
      const partnerIds = relations
        .map((rel: any) => (rel.npc_id_1 === entityId ? rel.npc_id_2 : rel.npc_id_1))
        .filter((id: string) => id !== entityId);

      if (partnerIds.length > 0) {
        // Lade Partner-NPC-Namen
        const { data: partnerNPCs } = await (supabase.from("npcs") as any)
          .select("id, name")
          .in("id", partnerIds);

        // Lade Geheimnisse der Partner
        const { data: partnerSecrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "npc")
          .in("entity_id", partnerIds);

        if (partnerSecrets && partnerNPCs) {
          const nameById: Record<string, string> = {};
          partnerNPCs.forEach((n: any) => {
            nameById[n.id] = n.name;
          });

          partnerSecrets.forEach((s: any) => {
            relatedSecrets.push({
              id: s.id,
              entity_id: s.entity_id,
              entity_type: "npc",
              entity_name: nameById[s.entity_id] || "Unbekannter NPC",
              title: s.title,
              content: s.content,
            });
          });
        }
      }
    }
  } else if (entityType === "faction") {
    // Lade alle NPCs dieser Fraktion
    const { data: memberNPCs } = await (supabase.from("npcs") as any)
      .select("id, name")
      .eq("campaign_id", campaignId)
      .eq("faction_id", entityId)
      .limit(30);

    if (memberNPCs && memberNPCs.length > 0) {
      const memberIds = memberNPCs.map((n: any) => n.id);
      const nameById: Record<string, string> = {};
      memberNPCs.forEach((n: any) => {
        nameById[n.id] = n.name;
      });

      // Lade Geheimnisse der Mitglieder
      const { data: memberSecrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "npc")
        .in("entity_id", memberIds);

      if (memberSecrets) {
        memberSecrets.forEach((s: any) => {
          relatedSecrets.push({
            id: s.id,
            entity_id: s.entity_id,
            entity_type: "npc",
            entity_name: nameById[s.entity_id] || "Unbekanntes Mitglied",
            title: s.title,
            content: s.content,
          });
        });
      }
    }
  }
  // Für "lore" gibt es aktuell keine verwandten Geheimnisse

  return relatedSecrets;
}
