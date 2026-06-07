"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/src/lib/supabase/server";

export type MemberWithCharacter = {
  id: string;
  user_id: string;
  character_id: string | null;
  status: string;
  campaign_rank: string | null;
  player_table_name: string | null;
  application_message: string | null;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    email?: string;
    campaign_rank?: string | null;
  };
  character: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    status?: string;
    biography?: string | null;
    avatar_url?: string | null;
    culture_lore_id?: string | null;
    languages?: unknown;
    faction_membership?: string | null;
    current_location_id?: string | null;
  } | null;
};

/**
 * GM: Lädt alle Kampagnenmitglieder inkl. Charaktere (Service-Role, RLS-Bypass).
 * Ohne SUPABASE_SERVICE_ROLE_KEY: Fallback auf Session-Client — GM darf per RLS dieselben Zeilen lesen.
 */
export async function getGmCampaignMembersWithCharacters(
  campaignId: string
): Promise<{
  drafting: MemberWithCharacter[];
  inReview: MemberWithCharacter[];
  accepted: MemberWithCharacter[];
}> {
  let supabase: ReturnType<typeof createAdminClient>;
  let allowRepairWrites = true;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.warn(
      "[getGmCampaignMembersWithCharacters] Kein Admin-Client, nutze Session (RLS):",
      err
    );
    supabase = (await createClient()) as unknown as ReturnType<typeof createAdminClient>;
    allowRepairWrites = false;
  }

  const { data: members, error: membersError } = await supabase
    .from("campaign_members")
    .select(
      "id, user_id, character_id, status, application_message, campaign_rank, player_table_name",
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (membersError) {
    console.error("[getGmCampaignMembersWithCharacters] members error:", membersError);
    return { drafting: [], inReview: [], accepted: [] };
  }

  const memberList = (members || []) as {
    id: string;
    user_id: string;
    character_id: string | null;
    status: string;
    campaign_rank: string | null;
    player_table_name: string | null;
    application_message: string | null;
  }[];

  const userIds = [...new Set(memberList.map((m) => m.user_id).filter(Boolean))];
  let charIds: string[] = [
    ...new Set(
      memberList
        .map((m) => m.character_id)
        .filter((id): id is string => id != null && String(id).trim() !== ""),
    ),
  ];

  // Fallback: Accepted/Approved ohne character_id – Charakter per user_id + campaign_id laden
  const membersWithoutChar = memberList.filter(
    (m) => !m.character_id && ["Approved", "Active"].includes(m.status)
  );
  if (membersWithoutChar.length > 0) {
    const fallbackUserIds = membersWithoutChar.map((m) => m.user_id);
    let { data: fallbackChars } = await supabase
      .from("characters")
      .select("id, name, class, race, level, status, biography, avatar_url, user_id, campaign_id, culture_lore_id, languages, faction_membership, current_location_id")
      .in("user_id", fallbackUserIds)
      .in("status", ["Active", "Approved", "Pending_Approval"])
      .or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    const fallbackList = (fallbackChars || []) as { id: string; user_id: string }[];
    for (const m of membersWithoutChar) {
      const c = fallbackList.find((ch) => ch.user_id === m.user_id);
      if (c) {
        (m as any).character_id = c.id;
        charIds.push(c.id);
        if (allowRepairWrites) {
          await (supabase.from("campaign_members") as any)
            .update({ character_id: c.id })
            .eq("id", m.id);
        }
      }
    }
    charIds = [...new Set(charIds)];
  }

  const [usersRes, charsRes] = await Promise.all([
    supabase.from("users").select("id, username, avatar_url, email").in("id", userIds),
    charIds.length > 0
      ? supabase
          .from("characters")
          .select(
            "id, name, class, race, level, status, biography, avatar_url, culture_lore_id, languages, faction_membership, current_location_id",
          )
          .in("id", charIds)
      : { data: [] as any[], error: null },
  ]);

  let userRows = (usersRes.data || []) as { id: string; username: string; avatar_url: string | null; email?: string }[];
  if (userRows.length === 0 && userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    userRows = ((profileRows || []) as any[]).map((p: any) => ({
      id: p.id,
      username: p.username ?? "Unbekannt",
      avatar_url: null,
      email: undefined,
    }));
  }
  const charRows = (charsRes.data || []) as {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    status?: string;
    biography?: string | null;
    avatar_url?: string | null;
    culture_lore_id?: string | null;
    languages?: unknown;
    faction_membership?: string | null;
    current_location_id?: string | null;
  }[];

  const userMap = new Map(userRows.map((u) => [u.id, u]));
  const charMap = new Map(charRows.map((c) => [c.id.toLowerCase(), c]));

  const mapped: MemberWithCharacter[] = memberList.map((m) => {
    const u = userMap.get(m.user_id) ?? {
      id: m.user_id ?? "",
      username: "Unbekannt",
      avatar_url: null,
      email: undefined,
    };
    const char = m.character_id ? charMap.get(String(m.character_id).toLowerCase()) ?? null : null;
    return {
      ...m,
      user: {
        ...u,
        campaign_rank: (m as { campaign_rank?: string | null }).campaign_rank ?? null,
      },
      character: char,
    };
  });

  return {
    drafting: mapped.filter((m) => m.status === "Drafting"),
    inReview: mapped.filter((m) => m.status === "In_Review" || m.status === "Changes_Proposed"),
    accepted: mapped.filter((m) => m.status === "Approved" || m.status === "Active"),
  };
}

export async function updateMemberPlayerTableName(
  campaignId: string,
  memberId: string,
  playerTableName: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht authentifiziert." };
  }

  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { gm_id?: string | null; owner_id?: string | null } | null;
  if (
    !campaign ||
    (campaign.gm_id !== user.id &&
      !(campaign.owner_id && String(campaign.owner_id) === user.id))
  ) {
    return { ok: false, error: "Nur der Spielleiter kann Tischnamen pflegen." };
  }

  const normalized = playerTableName?.trim() ? playerTableName.trim().slice(0, 120) : null;

  const { error } = await (supabase.from("campaign_members") as any)
    .update({ player_table_name: normalized })
    .eq("id", memberId)
    .eq("campaign_id", campaignId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { ok: true };
}
