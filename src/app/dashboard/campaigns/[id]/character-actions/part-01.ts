/**
 * character-actions — part 1: getCharacterForMemberByUserId, getCharacterFromMembersForGM, getCharacterWizardLoreData.
 */
"use server";

import { createClient, createAdminClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";
import { getGmCampaignMembersWithCharacters } from "../members-actions";
import { getCharacterWizardLoreData as loadCharacterWizardLoreData } from "../character-queries";
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
  "id, name, class, race, level, status, biography, avatar_url, avatar_storage_path, avatar_display, token_url, token_storage_path, condition_tokens, mood_state, mood_tokens, active_conditions, modification_log, culture_lore_id, languages, faction_membership, current_location_id";

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
export async function validatePlayerSelectionsAgainstCampaignVisibility(
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

  const { getVisibilityForCampaign } = await import("../campaign-visibility-queries");
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
