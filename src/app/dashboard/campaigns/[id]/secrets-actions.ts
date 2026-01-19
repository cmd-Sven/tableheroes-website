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

  // 2. Fetch Secrets with secret_holders
  const { data: secrets, error } = await (supabase.from("secrets") as any)
    .select(`
      *,
      secret_holders (
        character_id
      )
    `)
    .eq("entity_id", entityId)
    .eq("entity_type", entityType)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ [getSecrets] Error:", error);
    return [];
  }

  // 3. Transform secret_holders to array of character_ids
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

