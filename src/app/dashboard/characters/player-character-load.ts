import { createClient } from "@/src/lib/supabase/server";
import { getCharacterWizardLoreData } from "@/src/app/dashboard/campaigns/[id]/character-queries";
import { getCharacterFactionReputations } from "@/src/app/dashboard/campaigns/[id]/reputation-queries";
import { serializeCharacterForEditorClient } from "@/src/lib/characters/serialize-character-for-editor-client";
import { resolveFoundryProgressionLock } from "@/src/lib/foundry-sync/progression-lock-server";
import { evaluateCharacterDeletionState } from "@/src/lib/characters/character-deletion";

export type PlayerCharacterEditorPayload = {
  campaignId: string;
  campaignName: string;
  campaignSystem: string | null;
  isCampaignLinked: boolean;
  character: Record<string, unknown>;
  playerUserId: string;
  playerUsername: string | null;
  cultures: { id: string; name: string }[];
  languages: { id: string; name: string }[];
  factions: { id: string; name: string }[];
  locations: { id: string; name: string; type: string }[];
  factionReputations: Array<{
    id: string;
    faction_id: string;
    faction_name: string;
    reputation: number;
    rank?: string | null;
  }>;
  progressionLocked: boolean;
  progressionLockMessage: string;
};

async function buildPlayerCharacterEditorPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterData: Record<string, unknown>,
  campaign: {
    id: string;
    name: string;
    system: string | null;
    world_id: string | null;
  },
  playerUserId: string,
): Promise<PlayerCharacterEditorPayload> {
  const campaignId = campaign.id;
  const charId = String(characterData.id);

  const { data: member } = await (supabase.from("campaign_members") as any)
    .select("character_id, status")
    .eq("campaign_id", campaignId)
    .eq("user_id", playerUserId)
    .maybeSingle();

  const memberRow = member as { character_id?: string | null; status?: string } | null;
  const deletionState = evaluateCharacterDeletionState(
    {
      id: charId,
      status: String(characterData.status ?? ""),
      campaign_id: campaignId,
    },
    memberRow,
  );

  const { data: relRows } = await (supabase.from("character_relationships") as any)
    .select("relationship_type, description, npc_id")
    .eq("character_id", charId)
    .order("id", { ascending: false });

  const npcIds = [...new Set(((relRows as any[]) ?? []).map((r) => r.npc_id).filter(Boolean))];
  let npcMap = new Map<string, { id: string; name: string; role: string | null; title: string | null }>();
  if (npcIds.length > 0) {
    const { data: npcRows } = await (supabase.from("npcs") as any)
      .select("id, name, role, title")
      .in("id", npcIds);
    npcMap = new Map(
      ((npcRows as any[]) ?? []).map((n) => [
        n.id,
        { id: n.id, name: n.name, role: n.role, title: n.title },
      ]),
    );
  }
  characterData.character_relationships = ((relRows as any[]) ?? []).map((r) => ({
    relationship_type: r.relationship_type,
    description: r.description,
    npcs: r.npc_id ? npcMap.get(r.npc_id) ?? null : null,
  }));

  const cultureId = characterData.culture_lore_id as string | null;
  const factionId = characterData.faction_membership as string | null;
  const locationId = characterData.current_location_id as string | null;
  const langIds = (characterData.languages as string[]) ?? [];

  if (cultureId) {
    const { data: cultureRow } = await (supabase.from("world_lore") as any)
      .select("name")
      .eq("id", cultureId)
      .single();
    characterData.culture_name = (cultureRow as { name: string } | null)?.name ?? null;
  }
  if (factionId) {
    const { data: factionRow } = await (supabase.from("factions") as any)
      .select("name")
      .eq("id", factionId)
      .single();
    characterData.faction_name = (factionRow as { name: string } | null)?.name ?? null;
  }
  if (locationId) {
    const { data: locRow } = await (supabase.from("world_lore") as any)
      .select("name")
      .eq("id", locationId)
      .single();
    characterData.location_name = (locRow as { name: string } | null)?.name ?? null;
  }
  if (langIds.length > 0) {
    const { data: langRows } = await (supabase.from("world_lore") as any)
      .select("id, name")
      .in("id", langIds);
    const langMap = new Map(((langRows as { id: string; name: string }[]) ?? []).map((l) => [l.id, l.name]));
    characterData.language_names = langIds.map((lid) => langMap.get(lid) ?? lid);
  }

  const loreData = await getCharacterWizardLoreData(campaignId);
  const factionReputations = await getCharacterFactionReputations(charId, campaignId);

  const { data: factionRows } = await (supabase.from("factions") as any)
    .select("id, name")
    .eq("campaign_id", campaignId)
    .order("name");

  let locations: { id: string; name: string; type: string }[] = [];
  if (campaign.world_id) {
    const { data: locRows } = await (supabase.from("world_lore") as any)
      .select("id, name, type")
      .eq("world_id", campaign.world_id)
      .in("type", ["Stadt", "Region", "Ort", "Akademie", "Tempel", "Gilde"])
      .order("name");
    locations = ((locRows as any[]) ?? []).map((l) => ({
      id: String(l.id),
      name: String(l.name ?? ""),
      type: String(l.type ?? ""),
    }));
  }

  const progressionLock = await resolveFoundryProgressionLock(supabase, campaignId, charId);

  const { data: playerUser } = await (supabase.from("users") as any)
    .select("username")
    .eq("id", playerUserId)
    .maybeSingle();

  return {
    campaignId,
    campaignName: campaign.name,
    campaignSystem: campaign.system,
    isCampaignLinked: deletionState.isCampaignLinked,
    playerUserId,
    playerUsername: (playerUser as { username?: string } | null)?.username ?? null,
    character: serializeCharacterForEditorClient(characterData),
    cultures: loreData.cultures.map((c) => ({ id: c.id, name: c.name })),
    languages: loreData.languages.map((l) => ({ id: l.id, name: l.name })),
    factions: ((factionRows as any[]) ?? []).map((f) => ({
      id: String(f.id),
      name: String(f.name ?? ""),
    })),
    locations,
    factionReputations,
    progressionLocked: progressionLock.locked,
    progressionLockMessage: progressionLock.message,
  };
}

export async function loadPlayerCharacterEditor(
  characterId: string,
  userId: string,
): Promise<PlayerCharacterEditorPayload | null> {
  const supabase = await createClient();

  const { data: charRaw } = await (supabase.from("characters") as any)
    .select("*")
    .eq("id", characterId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!charRaw) return null;

  const characterData = charRaw as Record<string, unknown>;
  const campaignId = String(characterData.campaign_id ?? "");
  if (!campaignId) return null;

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, system, world_id")
    .eq("id", campaignId)
    .maybeSingle();
  const campaign = campaignRaw as {
    id: string;
    name: string;
    system: string | null;
    world_id: string | null;
  } | null;
  if (!campaign) return null;

  return buildPlayerCharacterEditorPayload(supabase, characterData, campaign, userId);
}

/** GM/Admin: Spieler-Charakter in derselben Ansicht wie der Spieler (zum Testen). */
export async function loadPlayerCharacterViewForGm(
  campaignId: string,
  characterId: string,
  viewerUserId: string,
): Promise<PlayerCharacterEditorPayload | null> {
  const supabase = await createClient();

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", viewerUserId)
    .maybeSingle();

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, system, world_id, gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();

  const campaign = campaignRaw as {
    id: string;
    name: string;
    system: string | null;
    world_id: string | null;
    gm_id: string;
    owner_id?: string | null;
  } | null;

  if (!campaign) return null;

  const isGm =
    campaign.gm_id === viewerUserId ||
    (campaign.owner_id != null && String(campaign.owner_id) === viewerUserId);
  const isAdmin = (profile as { primary_role?: string } | null)?.primary_role === "Admin";
  if (!isGm && !isAdmin) return null;

  const { data: charRaw } = await (supabase.from("characters") as any)
    .select("*")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!charRaw) return null;

  const characterData = charRaw as Record<string, unknown>;
  const playerUserId = String(characterData.user_id ?? "");
  if (!playerUserId) return null;

  return buildPlayerCharacterEditorPayload(supabase, characterData, campaign, playerUserId);
}
