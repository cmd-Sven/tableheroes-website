"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getCharacterFromMembersForGM } from "../character-actions";
import { getCharacterEditorLoreOptionsForGm } from "../character-queries";
import { getFactionsWithMembers } from "../factions-queries";
import { getNPCs } from "../npc-queries";
import { getCharacterFactionReputations } from "../reputation-queries";
import { serializeCharacterForEditorClient } from "@/src/lib/characters/serialize-character-for-editor-client";
import { resolveFoundryProgressionLock } from "@/src/lib/foundry-sync/progression-lock-server";
import { serializeForClient, toPlainJsonClone } from "@/src/lib/serialize-for-flight";
import type { GMCharacterEditorPageProps } from "@/src/components/dashboard/campaigns/GMCharacterEditorPage";

export type GmCharacterEditorLoadPayload = Omit<
  GMCharacterEditorPageProps,
  "campaignId" | "currentUserId"
>;

export type LoadGmCharacterEditorResult =
  | { ok: true; status: "not_found" }
  | { ok: true; status: "ready"; data: GmCharacterEditorLoadPayload }
  | { ok: false; error: string };

/**
 * Lädt alle Editor-Daten im Server-Action-Kontext (keine RSC-Flight-Payload).
 * Aufruf nur aus dem Client-Loader der GM-Charakterseite.
 */
export async function loadGmCharacterEditorData(
  campaignId: string,
  characterId: string,
): Promise<LoadGmCharacterEditorResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    const { data: campaignRaw } = await (supabase.from("campaigns") as any)
      .select("gm_id, owner_id, mode")
      .eq("id", campaignId)
      .maybeSingle();

    if (!campaignRaw) return { ok: false, error: "campaign_not_found" };

    const c = campaignRaw as { gm_id: string; owner_id?: string | null };
    const isGm = c.gm_id === user.id || c.owner_id === user.id;
    if (!isGm) return { ok: false, error: "forbidden" };

    const [character, editorOpts, factions, npcs] = await Promise.all([
      getCharacterFromMembersForGM(campaignId, characterId),
      getCharacterEditorLoreOptionsForGm(campaignId),
      getFactionsWithMembers(campaignId),
      getNPCs(campaignId, user.id, true),
    ]);

    const factionChoices =
      editorOpts.factions.length > 0
        ? editorOpts.factions
        : (factions as { id: string; name: string }[]).map((f) => ({
            id: f.id,
            name: f.name,
          }));

    if (!character) {
      return { ok: true, status: "not_found" };
    }

    /** Holzhammer: Row-Objekte / Dates / BigInt vor Editor-Serialisierung zu reinem JSON. */
    const characterPlain = toPlainJsonClone(character) as Record<string, unknown>;

    const factionReputations = await getCharacterFactionReputations(
      characterId,
      campaignId,
    );

    let characterForEditor: Record<string, unknown>;
    try {
      characterForEditor = toPlainJsonClone(
        serializeCharacterForEditorClient(characterPlain),
      ) as Record<string, unknown>;
    } catch (err) {
      console.error("[loadGmCharacterEditorData] serializeCharacterForEditorClient:", err);
      const ch = characterPlain;
      characterForEditor = serializeForClient({
        id: String(ch.id ?? characterId),
        name: String(ch.name ?? ""),
        class: String(ch.class ?? ""),
        race: String(ch.race ?? ""),
        level: 1,
        status: String(ch.status ?? "Active"),
        biography: ch.biography != null ? String(ch.biography) : "",
        avatar_url: ch.avatar_url != null ? String(ch.avatar_url) : "",
        avatar_storage_path: ch.avatar_storage_path ?? null,
        avatar_display: null,
        culture_lore_id: ch.culture_lore_id != null ? String(ch.culture_lore_id) : "",
        languages: [],
        faction_membership:
          ch.faction_membership != null ? String(ch.faction_membership) : "",
        current_location_id:
          ch.current_location_id != null ? String(ch.current_location_id) : "",
        character_relationships: [],
      }) as Record<string, unknown>;
    }

    const npcsForEditor = (npcs as any[]).map((n) => ({
      id: String(n.id),
      name: String(n.name ?? ""),
      role: n.role != null ? String(n.role) : null,
      title: n.title != null ? String(n.title) : null,
    }));

    const factionsSlim = (factions as any[]).map((f: any) => ({
      id: String(f.id),
      name: String(f.name ?? ""),
    }));

    const progressionLock = await resolveFoundryProgressionLock(
      supabase,
      campaignId,
      characterId,
    );

    const payload: GmCharacterEditorLoadPayload = {
      character: characterForEditor as GMCharacterEditorPageProps["character"],
      npcs: serializeForClient(npcsForEditor) as GMCharacterEditorPageProps["npcs"],
      factions: serializeForClient(factionsSlim) as GMCharacterEditorPageProps["factions"],
      cultures: serializeForClient(editorOpts.cultures) as GMCharacterEditorPageProps["cultures"],
      languages: serializeForClient(editorOpts.languages) as GMCharacterEditorPageProps["languages"],
      locations: serializeForClient(editorOpts.locations) as GMCharacterEditorPageProps["locations"],
      factionChoices: serializeForClient(factionChoices) as GMCharacterEditorPageProps["factionChoices"],
      initialFactionReputations: serializeForClient(
        factionReputations,
      ) as GMCharacterEditorPageProps["initialFactionReputations"],
      progressionLocked: progressionLock.locked,
      progressionLockMessage: progressionLock.message,
    };

    return {
      ok: true,
      status: "ready",
      data: toPlainJsonClone(serializeForClient(payload)) as GmCharacterEditorLoadPayload,
    };
  } catch (e) {
    console.error("FATAL ERROR LOAD CHARACTER:", e);
    return { ok: false, error: "load_failed" };
  }
}
