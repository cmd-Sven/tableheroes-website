"use server";

import { createClient, createAdminClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";
import { getGmCampaignMembersWithCharacters } from "./members-actions";
import { getCharacterWizardLoreData as loadCharacterWizardLoreData } from "./character-queries";
import { updateCharacterRowWithSchemaFallback } from "@/src/lib/characters/character-update-fallback";
import {
  resolveFoundryProgressionLock,
  stripFoundryLockedCharacterFields,
} from "@/src/lib/foundry-sync/progression-lock-server";
import { setCharacterGoldGp } from "@/src/lib/character-gold";
import { recordPlayerCharacterEditAdmin } from "@/src/lib/characters/player-character-edit-alerts";

/**
 * GM: Charakter eines Spielers laden (user_id + campaign_id) für Ruf-Verwaltung.
 * Falls character_id in campaign_members fehlt, wird der Charakter trotzdem gefunden.
 */
export async function getCharacterForMemberByUserId(
  campaignId: string,
  userId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) {
    throw new Error("Nur der GM kann Charaktere laden.");
  }

  let { data: char } = await (supabase.from("characters") as any)
    .select("id, name, class, race, level, status, biography, avatar_url, modification_log")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .in("status", ["Active", "Approved", "Pending_Approval"])
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!char) {
    const res = await (supabase.from("characters") as any)
      .select("id, name, class, race, level, status, biography, avatar_url, modification_log")
      .eq("user_id", userId)
      .in("status", ["Active", "Approved", "Pending_Approval"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    char = res.data;
  }

  return char as { id: string; name: string; class: string; race: string; level: number; status?: string } | null;
}

const GM_CHARACTER_BASE_SELECT =
  "id, name, class, race, level, status, biography, avatar_url, avatar_storage_path, avatar_display, modification_log, culture_lore_id, languages, faction_membership, current_location_id";

/**
 * Lädt eine Charakterzeile für die GM-Ansicht.
 * Ohne Service Role blockiert RLS oft die Batch-Abfrage in getGmCampaignMembersWithCharacters —
 * dann ist character_id gesetzt, aber member.character fehlt. Direkter Select umgeht das
 * zuverlässig mit Admin-Client; sonst Session (falls RLS GM-Lesen erlaubt).
 */
async function fetchCharacterRowForGm(
  campaignId: string,
  characterId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const admin = createAdminClient();
    const { data } = await (admin.from("characters") as any)
      .select(GM_CHARACTER_BASE_SELECT)
      .eq("id", characterId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (data) return data as Record<string, unknown>;
  } catch {
    /* kein SUPABASE_SERVICE_ROLE_KEY */
  }
  const supabase = await createClient();
  const { data, error } = await (supabase.from("characters") as any)
    .select(GM_CHARACTER_BASE_SELECT)
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

/**
 * GM: Charakter für die Bearbeitungsseite laden.
 * Nutzt die Members-Liste, falls der Charakter dort mit Daten ankommt; sonst direkter Fetch
 * (wichtig, wenn RLS die Batch-Charaktere aus campaign_members ausblendet).
 */
export async function getCharacterFromMembersForGM(
  campaignId: string,
  characterId: string
): Promise<Record<string, unknown> | null> {
  try {
    const { drafting, inReview, accepted } = await getGmCampaignMembersWithCharacters(campaignId);
    const allMembers = [...drafting, ...inReview, ...accepted];
    const idNorm = String(characterId).toLowerCase();
    const member = allMembers.find(
      (m) => m.character_id && String(m.character_id).toLowerCase() === idNorm
    );

    /** Vollständige Zeile (Kultur, Sprachen, Fraktion, Ort) — Batch aus members liefert oft nur Teilmenge. */
    let char: Record<string, unknown> | null = await fetchCharacterRowForGm(
      campaignId,
      characterId,
    );
    if (!char && member?.character) {
      char = { ...(member.character as Record<string, unknown>) };
    }

    if (!char) return null;

    let admin: ReturnType<typeof createAdminClient> | null = null;
    try {
      admin = createAdminClient();
    } catch {
      admin = null;
    }

    if (char.modification_log == null && admin) {
      const { data: charFull } = await (admin.from("characters") as any)
        .select("modification_log")
        .eq("id", characterId)
        .maybeSingle();
      if (charFull?.modification_log != null) char.modification_log = charFull.modification_log;
    }

    const relClient = admin ?? (await createClient());
    const { data: relRows } = await (relClient.from("character_relationships") as any)
      .select("id, relationship_type, description, npc_id")
      .eq("character_id", characterId);
    const npcIds = [...new Set(((relRows as any[]) ?? []).map((r: any) => r.npc_id).filter(Boolean))];
    let npcMap = new Map<string, { id: string; name: string; role: string | null; title: string | null }>();
    if (npcIds.length > 0) {
      const { data: npcRows } = await (relClient.from("npcs") as any)
        .select("id, name, role, title")
        .in("id", npcIds);
      npcMap = new Map(((npcRows as any[]) ?? []).map((n: any) => [n.id, { id: n.id, name: n.name, role: n.role, title: n.title }]));
    }
    char.character_relationships = ((relRows as any[]) ?? []).map((r: any) => ({
      id: r.id,
      relationship_type: r.relationship_type,
      description: r.description,
      npcs: r.npc_id ? npcMap.get(r.npc_id) ?? null : null,
    }));

    return char;
  } catch (err) {
    console.error("[getCharacterFromMembersForGM] error:", err);
    return null;
  }
}

/**
 * Rassen, Kulturen und Sprachen für den Character-Wizard (Server Action für Client).
 * Implementierung: character-queries.ts
 */
export async function getCharacterWizardLoreData(campaignId: string) {
  return loadCharacterWizardLoreData(campaignId);
}

/** Spieler: Auswahl nur gültig, wenn campaign_visibility für genau diese campaignId is_revealed ist (GM überspringt). */
async function validatePlayerSelectionsAgainstCampaignVisibility(
  supabase: any,
  params: {
    campaignId: string;
    worldId: string;
    actorUserId: string;
    campaignGmId: string;
    faction_id?: string | null;
    location_id?: string | null;
    culture_lore_id?: string | null;
    languages?: string[];
    existing_contacts?: Array<{ npc_id: string; relationship_type?: string }>;
  },
) {
  if (params.actorUserId === params.campaignGmId) return;

  const { getVisibilityForCampaign } = await import("./campaign-visibility-queries");
  const [loreVis, facVis, npcVis] = await Promise.all([
    getVisibilityForCampaign(params.campaignId, "lore"),
    getVisibilityForCampaign(params.campaignId, "faction"),
    getVisibilityForCampaign(params.campaignId, "npc"),
  ]);

  if (params.faction_id) {
    if (facVis[params.faction_id] !== true) {
      throw new Error("Diese Fraktion ist in dieser Kampagne nicht freigegeben.");
    }
    const { data: fRow } = await (supabase.from("factions") as any)
      .select("world_id, allow_pc_join_on_creation")
      .eq("id", params.faction_id)
      .single();
    if (!fRow || fRow.world_id !== params.worldId || fRow.allow_pc_join_on_creation !== true) {
      throw new Error("Ungültige Fraktionswahl.");
    }
  }

  if (params.location_id) {
    if (loreVis[params.location_id] !== true) {
      throw new Error("Dieser Ort ist in dieser Kampagne nicht freigegeben.");
    }
    const { data: lRow } = await (supabase.from("world_lore") as any)
      .select("world_id, allow_pc_origin")
      .eq("id", params.location_id)
      .single();
    if (!lRow || lRow.world_id !== params.worldId || lRow.allow_pc_origin !== true) {
      throw new Error("Ungültige Ortswahl.");
    }
  }

  if (params.culture_lore_id) {
    if (loreVis[params.culture_lore_id] !== true) {
      throw new Error("Diese Kultur ist in dieser Kampagne nicht freigegeben.");
    }
    const { data: cRow } = await (supabase.from("world_lore") as any)
      .select("world_id, type")
      .eq("id", params.culture_lore_id)
      .single();
    if (!cRow || cRow.world_id !== params.worldId || cRow.type !== "Kultur") {
      throw new Error("Ungültige Kulturwahl.");
    }
  }

  if (params.languages?.length) {
    for (const langId of params.languages) {
      if (loreVis[langId] !== true) {
        throw new Error("Eine gewählte Sprache ist in dieser Kampagne nicht freigegeben.");
      }
    }
  }

  if (params.existing_contacts?.length) {
    for (const c of params.existing_contacts) {
      if (c.npc_id && npcVis[c.npc_id] !== true) {
        throw new Error("Ein gewählter NPC ist in dieser Kampagne nicht freigegeben.");
      }
    }
  }
}

/**
 * Server Actions für Charakter-Erstellung mit Beziehungen
 */

type MembershipResult = {
  id: string;
  status: string;
  character_id: string | null;
  characters: { status: string | null } | null;
};

export async function createCharacterWithRelations(data: {
  campaign_id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  biography?: string | null;
  avatar_url?: string | null;
  avatar_storage_path?: string | null;
  faction_id?: string | null;
  location_id?: string | null;
  culture_lore_id?: string | null;
  languages?: string[];
  existing_contacts: Array<{ npc_id: string; relationship_type: string }>;
  new_contacts: Array<{
    name: string;
    role: string;
    relationship_to_character: string;
    description?: string | null;
    status: "Alive" | "Deceased" | "Missing" | "Unknown";
  }>;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Check if user is approved member (ohne characters-Join – FK kann fehlen)
  const { data: membershipRaw, error: membershipError } = await (
    supabase.from("campaign_members") as any
  )
    .select("id, status, character_id")
    .eq("campaign_id", data.campaign_id)
    .eq("user_id", user.id)
    .single();

  if (membershipError) {
    console.error("[createCharacterWithRelations] membership error:", membershipError);
  }

  const membership = membershipRaw as { id: string; status: string; character_id: string | null } | null;

  if (!membership) {
    throw new Error("Du bist kein Mitglied dieser Kampagne.");
  }

  const validStatuses = ["Approved", "Active", "Drafting", "In_Review", "Changes_Proposed"];
  if (!validStatuses.includes(membership.status)) {
    throw new Error(
      "Nur akzeptierte Mitglieder (oder im Entwurf-Status) können Charaktere erstellen.",
    );
  }

  // For Drafting/In_Review: allow creating. For Approved/Active: allow if no character OR character is Dead/Archived
  let characterStatus: string | null = null;
  if (membership.character_id) {
    const { data: charRow } = await (supabase.from("characters") as any)
      .select("status")
      .eq("id", membership.character_id)
      .single();
    characterStatus = (charRow as { status: string } | null)?.status ?? null;
  }

  if (["Approved", "Active"].includes(membership.status) && membership.character_id) {
    const isDeadOrArchived =
      characterStatus === "Dead" || characterStatus === "Archived";

    if (!isDeadOrArchived) {
      throw new Error(
        "Du hast bereits einen aktiven Charakter für diese Kampagne.",
      );
    }
    // If character is Dead or Archived, allow creating a new one
  }

  const { data: campaignCtxRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, world_id")
    .eq("id", data.campaign_id)
    .single();
  const campaignCtx = campaignCtxRaw as { gm_id: string; world_id: string | null } | null;
  if (!campaignCtx?.world_id) {
    throw new Error("Kampagne hat keine Welt.");
  }

  await validatePlayerSelectionsAgainstCampaignVisibility(supabase, {
    campaignId: data.campaign_id,
    worldId: campaignCtx.world_id,
    actorUserId: user.id,
    campaignGmId: campaignCtx.gm_id,
    faction_id: data.faction_id,
    location_id: data.location_id,
    culture_lore_id: data.culture_lore_id,
    languages: data.languages,
    existing_contacts: data.existing_contacts,
  });

  // 3. Start transaction-like operations
  try {
    // 3a. Create Character (Status: Active – sofort spielbar, kein GM-Freischaltungs-Workflow)
    // current_location_id = world_lore.id (Heimatort aus Wizard)
    const { data: character, error: charError } = await (
      supabase.from("characters") as any
    )
      .insert({
        user_id: user.id,
        campaign_id: data.campaign_id,
        name: data.name,
        class: data.class,
        race: data.race,
        level: data.level || 1,
        biography: data.biography || null,
        avatar_url: data.avatar_url || null,
        avatar_storage_path: data.avatar_storage_path || null,
        faction_membership: data.faction_id || null,
        current_location_id: data.location_id || null,
        culture_lore_id: data.culture_lore_id || null,
        languages: data.languages && data.languages.length > 0 ? data.languages : [],
        status: "Active",
      })
      .select()
      .single();

    if (charError) {
      console.error("Create Character Error:", charError);
      throw new Error(
        charError.message || "Fehler beim Erstellen des Charakters.",
      );
    }

    // 3b. Update campaign_members: Link character AND set status to Approved
    console.log("🔍 [ServerAction] Updating membership for user:", user.id);
    console.log("🔍 [ServerAction] Campaign ID:", data.campaign_id);
    console.log("🔍 [ServerAction] Character ID:", character.id);

    const { data: updateData, error: updateError } = await (
      supabase.from("campaign_members") as any
    )
      .update({
        character_id: character.id,
        status: "Approved", // WICHTIG: Status muss auf Approved wechseln!
      })
      .eq("campaign_id", data.campaign_id)
      .eq("user_id", user.id)
      .select(); // WICHTIG: .select() hinzufügen, um zu sehen ob was passiert ist!

    if (updateError) {
      console.error("❌ [ServerAction] Critical Update Error:", updateError);
      throw new Error("Fehler beim Verknüpfen: " + updateError.message);
    }

    if (!updateData || updateData.length === 0) {
      console.error(
        "❌ [ServerAction] Update Success but NO ROWS changed. Check RLS Policies!",
      );
      console.error(
        "❌ [ServerAction] This usually means RLS blocked the update or no matching row was found.",
      );
      throw new Error(
        "Keine Berechtigung zum Update des Mitglieder-Status. Bitte prüfe die RLS-Policies.",
      );
    } else {
      console.log(
        "✅ [ServerAction] Membership updated successfully:",
        updateData,
      );
    }

    // 3c. NPC-Wünsche als Anträge speichern (player_npc_requests), keine direkten NPC-Inserts
    if (data.new_contacts.length > 0) {
      const requestsToInsert = data.new_contacts.map((c) => ({
        campaign_id: data.campaign_id,
        player_id: user.id,
        character_id: character.id,
        name: c.name,
        relationship_type: c.relationship_to_character,
        description: c.description || null,
        status: "pending",
      }));
      const { error: reqError } = await (
        supabase.from("player_npc_requests") as any
      ).insert(requestsToInsert);
      if (reqError) {
        console.error("Create Player NPC Requests Error:", reqError);
        console.warn(
          "Charakter wurde erstellt, aber NPC-Anträge konnten nicht gespeichert werden.",
        );
      }
    }

    // 3d. Beziehungen nur für bestehende Kontakte (revealed NPCs)
    const relationshipsToInsert: Array<{
      character_id: string;
      npc_id: string;
      relationship_type: string;
    }> = [];
    for (const contact of data.existing_contacts) {
      if (contact.npc_id && contact.relationship_type) {
        relationshipsToInsert.push({
          character_id: character.id,
          npc_id: contact.npc_id,
          relationship_type: contact.relationship_type,
        });
      }
    }
    if (relationshipsToInsert.length > 0) {
      const { error: relError } = await (
        supabase.from("character_relationships") as any
      ).insert(relationshipsToInsert);
      if (relError) {
        console.error("Create Relationships Error:", relError);
        console.warn(
          "Charakter wurde erstellt, aber Beziehungen konnten nicht gespeichert werden.",
        );
      }
    }

    revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
    return character;
  } catch (error: any) {
    console.error("Create Character With Relations Error:", error);
    throw error;
  }
}

/**
 * Server Action für Spieler: Eigenen Charakter bearbeiten
 */
export async function updateCharacterPlayer(data: {
  character_id: string;
  campaign_id: string;
  name?: string;
  class?: string;
  race?: string;
  level?: number;
  biography?: string | null;
  culture_lore_id?: string | null;
  languages?: string[];
  faction_membership?: string | null;
  current_location_id?: string | null;
  avatar_url?: string | null;
  avatar_storage_path?: string | null;
  /** Zuschnitt Porträt (JSON wie npcs.image_display) */
  avatar_display?: unknown | null;
  experience_points?: number;
  pocket_gold?: number;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: charRow } = await (supabase.from("characters") as any)
    .select("id, user_id, campaign_id")
    .eq("id", data.character_id)
    .single();

  if (!charRow || (charRow as any).user_id !== user.id) {
    throw new Error("Du kannst nur deinen eigenen Charakter bearbeiten.");
  }
  if ((charRow as any).campaign_id !== data.campaign_id) {
    throw new Error("Charakter gehört nicht zu dieser Kampagne.");
  }

  const { data: campaignMeta } = await (supabase.from("campaigns") as any)
    .select("gm_id, world_id")
    .eq("id", data.campaign_id)
    .single();
  const cmeta = campaignMeta as { gm_id: string; world_id: string | null } | null;
  if (!cmeta?.world_id) throw new Error("Kampagne hat keine Welt.");

  await validatePlayerSelectionsAgainstCampaignVisibility(supabase, {
    campaignId: data.campaign_id,
    worldId: cmeta.world_id,
    actorUserId: user.id,
    campaignGmId: cmeta.gm_id,
    faction_id: data.faction_membership !== undefined ? data.faction_membership : undefined,
    location_id: data.current_location_id !== undefined ? data.current_location_id : undefined,
    culture_lore_id: data.culture_lore_id !== undefined ? data.culture_lore_id : undefined,
    languages: data.languages !== undefined ? data.languages : undefined,
  });

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.class !== undefined) updates.class = data.class;
  if (data.race !== undefined) updates.race = data.race;
  if (data.level !== undefined) updates.level = data.level;
  if (data.biography !== undefined) updates.biography = data.biography;
  if (data.culture_lore_id !== undefined) updates.culture_lore_id = data.culture_lore_id;
  if (data.languages !== undefined) updates.languages = data.languages;
  if (data.faction_membership !== undefined) updates.faction_membership = data.faction_membership;
  if (data.current_location_id !== undefined) updates.current_location_id = data.current_location_id;
  if (data.avatar_url !== undefined) {
    updates.avatar_url = data.avatar_url?.trim() ? data.avatar_url.trim() : null;
  }
  if (data.avatar_storage_path !== undefined) {
    updates.avatar_storage_path = data.avatar_storage_path?.trim()
      ? data.avatar_storage_path.trim()
      : null;
  }
  if (data.avatar_display !== undefined) {
    if (data.avatar_display == null) {
      updates.avatar_display = null;
    } else {
      updates.avatar_display = imageDisplayToJson(
        normalizeImageDisplay(data.avatar_display),
      );
    }
  }
  if (data.experience_points !== undefined) {
    const n = Math.max(0, Math.floor(Number(data.experience_points) || 0));
    updates.experience_points = n;
  }
  let pocketGoldToSet: number | undefined;
  if (data.pocket_gold !== undefined) {
    pocketGoldToSet = Math.max(0, Math.floor(Number(data.pocket_gold) || 0));
  }

  const safeUpdates = await stripFoundryLockedCharacterFields(
    supabase,
    data.campaign_id,
    data.character_id,
    updates,
  );

  const { error } = await updateCharacterRowWithSchemaFallback(
    supabase,
    data.character_id,
    safeUpdates,
  );

  if (error) throw new Error(error.message || "Fehler beim Speichern.");

  if (pocketGoldToSet !== undefined) {
    const goldResult = await setCharacterGoldGp(supabase, data.character_id, pocketGoldToSet);
    if (goldResult.error) throw new Error(goldResult.error);
  }

  await recordPlayerCharacterEditAdmin({
    characterId: data.character_id,
    campaignId: data.campaign_id,
    playerUserId: user.id,
    editSource: "profile",
    editSummary: "Charakterprofil bearbeitet",
  });

  revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${data.campaign_id}/characters/${data.character_id}`);
  revalidatePath("/dashboard/characters");
  revalidatePath(`/dashboard/characters/${data.character_id}`);
  return { success: true };
}

/**
 * Server Action für GM: Charakter verwalten
 * Nur der GM kann diese Funktion aufrufen.
 */
export async function updateCharacterByGM(data: {
  character_id: string;
  campaign_id: string;
  /** DB kann Active, Pending_Approval, Approved, … nutzen */
  status: string;
  level: number;
  name: string;
  class: string;
  race: string;
  biography?: string | null;
  culture_lore_id?: string | null;
  languages?: string[];
  faction_membership?: string | null;
  current_location_id?: string | null;
  avatar_url?: string | null;
  avatar_storage_path: string | null;
  /** Zuschnitt Porträt (JSON wie npcs.image_display) */
  avatar_display: unknown | null;
  relationships: Array<{
    id?: string;
    npc_id: string;
    relationship_type: string;
    description?: string;
  }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // 1. Auth Check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "Nicht authentifiziert." };
    }

    // 2. Kampagnen-SL oder owner_id (wie getCampaignAccess)
    const { data: campaignRaw } = await (supabase.from("campaigns") as any)
      .select("gm_id, owner_id, world_id")
      .eq("id", data.campaign_id)
      .single();

    const campaign = campaignRaw as {
      gm_id: string;
      owner_id?: string | null;
      world_id: string | null;
    } | null;

    if (!campaign) {
      return { ok: false, error: "Kampagne nicht gefunden." };
    }

    const ownerId = campaign.owner_id ?? null;
    const canManageCharacters =
      user.id === campaign.gm_id ||
      (ownerId != null && String(ownerId).trim() !== "" && user.id === ownerId);

    if (!canManageCharacters) {
      return { ok: false, error: "Nur der Spielleiter kann Charaktere verwalten." };
    }

    // 3. Verify character belongs to this campaign
    const { data: characterRaw, error: charCheckError } = await (
      supabase.from("characters") as any
    )
      .select("id, campaign_id")
      .eq("id", data.character_id)
      .eq("campaign_id", data.campaign_id)
      .single();

    const character = characterRaw as { id: string; campaign_id: string } | null;

    if (charCheckError || !character) {
      return {
        ok: false,
        error: "Charakter nicht gefunden oder gehört nicht zu dieser Kampagne.",
      };
    }

    const langArr = Array.isArray(data.languages) ? data.languages.map(String) : [];

    const avatarDisplayJson =
      data.avatar_display == null
        ? null
        : imageDisplayToJson(normalizeImageDisplay(data.avatar_display));

    const progressionLock = await resolveFoundryProgressionLock(
      supabase,
      data.campaign_id,
      data.character_id,
    );

    let level = data.level;
    let characterClass = data.class;
    if (progressionLock.locked) {
      const { data: currentRaw } = await (supabase.from("characters") as any)
        .select("level, class")
        .eq("id", data.character_id)
        .single();
      level = Number((currentRaw as { level?: number } | null)?.level ?? data.level);
      characterClass = String(
        (currentRaw as { class?: string } | null)?.class ?? data.class,
      );
    }

    const rowUpdate: Record<string, unknown> = {
      status: data.status,
      level,
      name: (data.name ?? "").trim() || "Unbenannt",
      class: characterClass,
      race: data.race,
      biography: data.biography ?? null,
      culture_lore_id: data.culture_lore_id ?? null,
      languages: langArr,
      faction_membership: data.faction_membership ?? null,
      current_location_id: data.current_location_id ?? null,
      avatar_url: data.avatar_url?.trim() ? data.avatar_url.trim() : null,
      avatar_storage_path: data.avatar_storage_path?.trim()
        ? data.avatar_storage_path.trim()
        : null,
      avatar_display: avatarDisplayJson,
    };

    const { error: updateError } = await updateCharacterRowWithSchemaFallback(
      supabase,
      data.character_id,
      rowUpdate,
    );

    if (updateError) {
      console.error("Update Character Error:", updateError);
      throw new Error(
        "Fehler beim Aktualisieren des Charakters: " + updateError.message,
      );
    }

    // 5. Update relationships
    // First, get existing relationships
    const { data: existingRelationshipsRaw } = await (
      supabase.from("character_relationships") as any
    )
      .select("id")
      .eq("character_id", data.character_id);

    const existingRelationships = existingRelationshipsRaw as
      | { id: string }[]
      | null;

    const existingIds = (existingRelationships || []).map((r) => r.id);
    const incomingIds = data.relationships
      .filter((r) => r.id)
      .map((r) => r.id as string);

    // Delete relationships that are not in the incoming list
    const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await (
        supabase.from("character_relationships") as any
      )
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("Delete Relationships Error:", deleteError);
        // Don't throw - continue with updates
      }
    }

    // Update or insert relationships
    for (const rel of data.relationships) {
      if (!rel.npc_id || !rel.relationship_type) continue;

      if (rel.id) {
        // Update existing relationship
        const { error: updateRelError } = await (
          supabase.from("character_relationships") as any
        )
          .update({
            npc_id: rel.npc_id,
            relationship_type: rel.relationship_type,
            description: rel.description || null,
          })
          .eq("id", rel.id);

        if (updateRelError) {
          console.error("Update Relationship Error:", updateRelError);
          // Continue with other relationships
        }
      } else {
        // Insert new relationship
        const { error: insertRelError } = await (
          supabase.from("character_relationships") as any
        ).insert({
          character_id: data.character_id,
          npc_id: rel.npc_id,
          relationship_type: rel.relationship_type,
          description: rel.description || null,
        });

        if (insertRelError) {
          console.error("Insert Relationship Error:", insertRelError);
          // Continue with other relationships
        }
      }
    }

    try {
      revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
      revalidatePath(
        `/dashboard/campaigns/${data.campaign_id}/characters/${data.character_id}`,
      );
    } catch (revErr) {
      console.warn("[updateCharacterByGM] revalidatePath:", revErr);
    }
    return { ok: true };
  } catch (error: unknown) {
    console.error("[updateCharacterByGM]", error);
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Speichern fehlgeschlagen.";
    return { ok: false, error: msg };
  }
}

/**
 * GM: Charakter freischalten (Status -> Active). Sync mit campaign_members.
 * 1. characters.status -> Active
 * 2. campaign_members: Eintrag für user+campaign erstellen oder character_id/Status aktualisieren
 * 3. Optional: andere Charaktere dieses Users in dieser Kampagne auf Archived setzen
 */
export async function approveCharacter(
  characterId: string,
  campaignId: string,
) {
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  if (!campaign || (campaign as { gm_id: string }).gm_id !== currentUser.id) {
    throw new Error("Nur der GM kann Charaktere freischalten.");
  }

  const { data: char } = await (supabase.from("characters") as any)
    .select("id, campaign_id, user_id")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .single();
  if (!char)
    throw new Error(
      "Charakter nicht gefunden oder gehört nicht zu dieser Kampagne.",
    );

  const userId = (char as { user_id: string }).user_id;
  if (!userId) throw new Error("Charakter hat keinen Benutzer.");

  // 1. Charakter auf Active setzen
  const { error: charError } = await (supabase.from("characters") as any)
    .update({ status: "Active" })
    .eq("id", characterId);
  if (charError) throw new Error(charError.message);

  // 2. campaign_members: bestehenden Eintrag aktualisieren oder neuen anlegen
  const { data: existingMember } = await (
    supabase.from("campaign_members") as any
  )
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMember) {
    const { error: updateErr } = await (
      supabase.from("campaign_members") as any
    )
      .update({ character_id: characterId, status: "Approved" })
      .eq("id", (existingMember as { id: string }).id);
    if (updateErr) throw new Error(updateErr.message);
  } else {
    const { error: insertErr } = await (
      supabase.from("campaign_members") as any
    ).insert({
      campaign_id: campaignId,
      user_id: userId,
      character_id: characterId,
      status: "Approved",
      role: "Player",
    });
    if (insertErr) throw new Error(insertErr.message);
  }

  // 3. Alle anderen Charaktere dieses Users in dieser Kampagne auf Archived setzen
  const { error: archiveErr } = await (supabase.from("characters") as any)
    .update({ status: "Archived" })
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .neq("id", characterId);
  if (archiveErr) {
    console.warn("Archive other characters:", archiveErr);
    // nicht werfen – Hauptaktion war erfolgreich
  }

  const { awardAchievement } = await import(
    "@/src/lib/actions/achievement-actions"
  );
  const { ACHIEVEMENT_NAMES } = await import(
    "@/src/lib/constants/achievements"
  );
  await awardAchievement(userId, ACHIEVEMENT_NAMES.ERSTER_ATEMZUG);

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard");
}

/**
 * GM: Charakter-Bewerbung ablehnen (nur für Bewerbungen aus characters, ohne campaign_members-Eintrag).
 */
export async function rejectCharacter(characterId: string, campaignId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) {
    throw new Error("Nur der GM kann Bewerbungen ablehnen.");
  }

  const { data: char } = await (supabase.from("characters") as any)
    .select("id")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .single();
  if (!char)
    throw new Error(
      "Charakter nicht gefunden oder gehört nicht zu dieser Kampagne.",
    );

  const { error } = await (supabase.from("characters") as any)
    .update({ status: "Rejected" })
    .eq("id", characterId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
}

/**
 * GM: Spieler-Charakter aus der Kampagne entfernen (Verknüpfung lösen, archivieren).
 * Der Charakter bleibt im Spieler-Profil und kann dort ggf. gelöscht werden.
 */
export async function deleteCharacterByGM(characterId: string, campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();
  const c = campaign as { gm_id: string; owner_id?: string | null } | null;
  const ownerId = c?.owner_id ?? null;
  const canDelete =
    c &&
    (user.id === c.gm_id ||
      (ownerId != null && String(ownerId).trim() !== "" && user.id === ownerId));
  if (!canDelete) {
    throw new Error("Nur der GM kann Charaktere entfernen.");
  }

  const { data: char } = await (supabase.from("characters") as any)
    .select("id, campaign_id")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!char) {
    throw new Error("Charakter nicht gefunden oder gehört nicht zu dieser Kampagne.");
  }

  const detachFromCampaign = async (client: any) => {
    const c = client;
    const { error: cmErr } = await c
      .from("campaign_members")
      .update({ character_id: null })
      .eq("campaign_id", campaignId)
      .eq("character_id", characterId);
    if (cmErr) {
      console.error("[deleteCharacterByGM] campaign_members:", cmErr);
      throw cmErr;
    }

    const { error: archiveErr } = await c
      .from("characters")
      .update({ status: "Archived" })
      .eq("id", characterId)
      .eq("campaign_id", campaignId);
    if (archiveErr) {
      console.error("[deleteCharacterByGM] characters archive:", archiveErr);
      throw archiveErr;
    }

    const { error: mappingErr } = await c
      .from("foundry_character_mapping")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("character_id", characterId);
    if (mappingErr) {
      console.warn("[deleteCharacterByGM] foundry mapping:", mappingErr);
    }

    try {
      await c
        .from("character_player_edit_alerts")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("character_id", characterId)
        .eq("campaign_id", campaignId)
        .is("dismissed_at", null)
        .is("reviewed_at", null);
    } catch {
      /* Tabelle ggf. noch nicht migriert */
    }
  };

  try {
    await detachFromCampaign(supabase);
  } catch (firstErr) {
    console.warn("[deleteCharacterByGM] Anon-Detach fehlgeschlagen, versuche Service-Role:", firstErr);
    try {
      const admin = createAdminClient();
      await detachFromCampaign(admin);
    } catch (secondErr) {
      console.error("[deleteCharacterByGM]", secondErr);
      const msg =
        (secondErr as Error)?.message?.includes("SUPABASE_SERVICE_ROLE_KEY") ||
        (secondErr as Error)?.message?.includes("createAdminClient")
          ? (firstErr as Error)?.message
          : (secondErr as Error)?.message;
      throw new Error(
        msg ||
          "Charakter konnte nicht aus der Kampagne entfernt werden (Berechtigung oder Datenbank).",
      );
    }
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
  revalidatePath("/dashboard/characters");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard");
  return { success: true };
}
