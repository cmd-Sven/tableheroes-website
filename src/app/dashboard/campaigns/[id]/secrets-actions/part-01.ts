/**
 * secrets-actions — part 1: getSecrets, createSecret, saveSecret, deleteSecret, updateSecret, toggleSecretGlobal.
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

export async function getSecrets(entityId: string, entityType: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Normalize entityType to lowercase (sicherstellen, dass es "npc", "faction" oder "lore" ist)
  const normalizedEntityType = entityType.toLowerCase();

  // 3. Fetch Secrets with secret_holders
  console.log("🔍 [getSecrets] Querying secrets:", { entityId, entityType: normalizedEntityType });
  const { data: secrets, error } = await (supabase.from("secrets") as any)
    .select(`
      *,
      secret_holders (
        character_id
      )
    `)
    .eq("entity_id", entityId)
    .eq("entity_type", normalizedEntityType)
    .order("created_at", { ascending: true });

  if (error) {
    // RLS oder andere Fehler (z. B. Aufruf ohne Kampagnenkontext auf Welt-NPC-Seite) → leere Liste, kein lauter Error
    const msg = (error as { message?: string }).message;
    const code = (error as { code?: string }).code;
    if (process.env.NODE_ENV === "development" && (msg || code)) {
      console.warn("[getSecrets] Keine Secrets geladen:", code ?? msg, { entityId, entityType: normalizedEntityType });
    }
    return [];
  }

  console.log("✅ [getSecrets] Found secrets:", secrets?.length || 0, "for", { entityId, entityType: normalizedEntityType });

  // 4. Transform secret_holders to array of character_ids
  const secretsWithHolders = (secrets || []).map((secret: any) => ({
    ...secret,
    character_ids: (secret.secret_holders || []).map((holder: any) => holder.character_id),
  }));

  return secretsWithHolders;
}

// ============================================================================
// Create Secret
// ============================================================================
export async function createSecret(
  campaignId: string,
  entityId: string,
  entityType: string,
  content: string,
  title?: string,
  skillCheck?: string
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Verify GM ownership of campaign
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Secrets erstellen.");
  }

  // 3. Insert Secret
  const { data: secret, error } = await (supabase.from("secrets") as any)
    .insert({
      campaign_id: campaignId, // WICHTIG: Muss vorhanden sein für RLS!
      entity_id: entityId,
      entity_type: entityType,
      content: content,
      title: title || null,
      skill_check: skillCheck || null,
      is_revealed: false, // Standardmäßig verborgen
    })
    .select()
    .single();

  if (error) {
    console.error("❌ [createSecret] Error:", error);
    throw new Error("Fehler beim Erstellen des Secrets: " + error.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return secret;
}

// ============================================================================
// Save Secret (Universal - für NPC, FACTION, LORE)
// ============================================================================
export async function saveSecret(
  campaignId: string,
  entityId: string,
  entityType: "npc" | "faction" | "lore",
  secret: {
    title: string;
    content: string;
    meaning?: string;
    secret_type?: string;
    discovery_dc?: number;
    is_ai_generated?: boolean;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Verify GM ownership of campaign
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Secrets erstellen.");
  }

  // 3. Validate entity exists and belongs to campaign
  let entityTable: "npcs" | "factions" | "world_lore";
  if (entityType === "npc") {
    entityTable = "npcs";
  } else if (entityType === "faction") {
    entityTable = "factions";
  } else {
    entityTable = "world_lore";
  }

  const { data: entityRaw } = await (supabase as any)
    .from(entityTable)
    .select("id, campaign_id")
    .eq("id", entityId)
    .maybeSingle();

  if (!entityRaw || entityRaw.campaign_id !== campaignId) {
    throw new Error(`${entityType === "npc" ? "NPC" : entityType === "faction" ? "Fraktion" : "Lore-Eintrag"} gehört nicht zu dieser Kampagne.`);
  }

  // 4. Validate required fields
  if (!campaignId || typeof campaignId !== "string" || campaignId.trim() === "") {
    throw new Error("Ungültige campaign_id.");
  }
  if (!entityId || typeof entityId !== "string" || entityId.trim() === "") {
    throw new Error("Ungültige entity_id.");
  }
  if (!secret.title || secret.title.trim() === "") {
    throw new Error("Titel darf nicht leer sein.");
  }
  if (!secret.content || secret.content.trim() === "") {
    throw new Error("Inhalt darf nicht leer sein.");
  }

  // 5. Normalize discovery_dc (10–25) - als Integer
  let dc = Number(secret.discovery_dc ?? 15);
  if (Number.isNaN(dc)) dc = 15;
  dc = Math.max(10, Math.min(25, Math.round(dc))); // Sicherstellen, dass es ein Integer ist

  // 6. Normalize entityType to lowercase (sicherstellen, dass es "npc", "faction" oder "lore" ist)
  const normalizedEntityType = entityType.toLowerCase();

  // 7. Build insert payload - WICHTIG: Alle Felder müssen gesetzt sein für RLS!
  // campaign_id ist KRITISCH für RLS-Policies!
  const insertPayload: any = {
    campaign_id: campaignId.trim(), // WICHTIG: Muss vorhanden sein für RLS!
    entity_id: entityId.trim(),
    entity_type: normalizedEntityType, // Normalisiert zu lowercase
    title: secret.title.trim(),
    content: secret.content.trim(),
    meaning: secret.meaning?.trim() || null,
    secret_type: secret.secret_type?.trim() || "Wissen",
    discovery_dc: Math.round(dc), // Explizit als Integer speichern
    is_ai_generated: secret.is_ai_generated ?? false,
    is_revealed: false,
    // Kompatibilität mit bestehendem UI: Skill-Check-Text aus discovery_dc ableiten
    skill_check: `Wissen (DC ${dc})`,
  };

  // Debug: Log payload für RLS-Debugging
  console.log("🔍 [saveSecret] Insert Payload:", {
    campaign_id: insertPayload.campaign_id,
    entity_id: insertPayload.entity_id,
    entity_type: insertPayload.entity_type,
    has_campaign_id: !!insertPayload.campaign_id,
    campaign_id_length: insertPayload.campaign_id?.length,
    entity_id_length: insertPayload.entity_id?.length,
  });

  // 8. Insert Secret
  const { data: inserted, error } = await (supabase.from("secrets") as any)
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("❌ [saveSecret] Error:", error);
    console.error("❌ [saveSecret] Payload:", JSON.stringify(insertPayload, null, 2));
    throw new Error("Fehler beim Speichern des Secrets: " + error.message);
  }

  // 9. Revalidate paths based on entity type
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  if (entityType === "npc") {
    revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${entityId}`);
  } else if (entityType === "faction") {
    revalidatePath(`/dashboard/campaigns/${campaignId}/factions/${entityId}`);
  } else {
    revalidatePath(`/dashboard/campaigns/${campaignId}/locations/${entityId}`);
  }

  return inserted;
}

// ============================================================================
// Delete Secret
// ============================================================================
export async function deleteSecret(secretId: string) {
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
    throw new Error("Nur der GM kann Secrets löschen.");
  }

  // 3. Delete secret_holders first (cascade should handle this, but explicit is better)
  await (supabase.from("secret_holders") as any).delete().eq("secret_id", secretId);

  // 4. Delete Secret
  const { error } = await (supabase.from("secrets") as any).delete().eq("id", secretId);

  if (error) {
    console.error("❌ [deleteSecret] Error:", error);
    throw new Error("Fehler beim Löschen des Secrets: " + error.message);
  }

  revalidatePath(`/dashboard/campaigns/${(secret as any).campaign_id}`);
}

// ============================================================================
// Update Secret
// ============================================================================
export async function updateSecret(
  secretId: string,
  updates: {
    title?: string | null;
    content?: string;
    meaning?: string | null;
    secret_type?: string;
    discovery_dc?: number;
  }
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

  const secret = secretRaw as { campaign_id: string; campaigns: { gm_id: string } } | null;

  if (!secret) throw new Error("Secret nicht gefunden.");

  const campaigns = (secret as any).campaigns;
  if (!campaigns || campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Secrets bearbeiten.");
  }

  // 3. Validate and normalize discovery_dc
  let dc: number | null = null;
  if (updates.discovery_dc !== undefined) {
    dc = Math.max(10, Math.min(25, Math.round(updates.discovery_dc)));
  }

  // 4. Build update payload
  const updatePayload: any = {};
  if (updates.title !== undefined) {
    updatePayload.title = updates.title?.trim() || null;
  }
  if (updates.content !== undefined) {
    if (!updates.content.trim()) {
      throw new Error("Der Inhalt darf nicht leer sein.");
    }
    updatePayload.content = updates.content.trim();
  }
  if (updates.meaning !== undefined) {
    updatePayload.meaning = updates.meaning?.trim() || null;
  }
  if (updates.secret_type !== undefined) {
    updatePayload.secret_type = updates.secret_type.trim() || "Wissen";
  }
  if (dc !== null) {
    updatePayload.discovery_dc = dc;
    // Update skill_check based on discovery_dc
    updatePayload.skill_check = `Wissen (DC ${dc})`;
  }

  // 5. Update Secret
  const { error } = await (supabase.from("secrets") as any)
    .update(updatePayload)
    .eq("id", secretId);

  if (error) {
    console.error("❌ [updateSecret] Error:", error);
    throw new Error("Fehler beim Aktualisieren des Secrets: " + error.message);
  }

  // 6. Revalidate paths
  revalidatePath(`/dashboard/campaigns/${secret.campaign_id}`);
}

// ============================================================================
// Toggle Secret Global Reveal
// ============================================================================
export async function toggleSecretGlobal(secretId: string, isRevealed: boolean) {
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
    throw new Error("Nur der GM kann den Global-Status ändern.");
  }

  // 3. Update
  const { error } = await (supabase.from("secrets") as any)
    .update({ is_revealed: isRevealed })
    .eq("id", secretId);

  if (error) {
    console.error("❌ [toggleSecretGlobal] Error:", error);
    throw new Error("Fehler beim Aktualisieren des Secrets: " + error.message);
  }

  revalidatePath(`/dashboard/campaigns/${(secret as any).campaign_id}`);
}

// ============================================================================
// Toggle Secret for Character
// ============================================================================
