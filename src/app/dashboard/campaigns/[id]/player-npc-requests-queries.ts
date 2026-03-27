import { createClient } from "@/src/lib/supabase/server";
import type { PlayerNpcRequest } from "@/src/types/player-npc-request";

export async function getPlayerNpcRequestsByCharacter(
  characterId: string,
): Promise<PlayerNpcRequest[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await (supabase.from("player_npc_requests") as any)
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getPlayerNpcRequestsByCharacter Error:", error);
    return [];
  }
  return (data || []) as PlayerNpcRequest[];
}

export async function getPendingApprovalCharactersWithRequests(
  campaignId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) return [];

  const { data: characters, error: charError } = await (
    supabase.from("characters") as any
  )
    .select(
      "id, name, class, race, level, biography, status, faction_membership, campaign_id, user_id",
    )
    .eq("campaign_id", campaignId)
    .eq("status", "Pending_Approval");

  if (charError || !characters?.length) return [];

  const userIds = [
    ...new Set((characters as any[]).map((c: any) => c.user_id)),
  ];
  const { data: users } = await (supabase.from("users") as any)
    .select("id, username")
    .in("id", userIds);
  const userById = new Map((users || []).map((u: any) => [u.id, u]));

  const result = await Promise.all(
    (characters as any[]).map(async (c) => {
      const { data: requests } = await (
        supabase.from("player_npc_requests") as any
      )
        .select("*")
        .eq("character_id", c.id)
        .order("created_at", { ascending: true });
      return {
        ...c,
        user: userById.get(c.user_id) || null,
        player_npc_requests: (requests || []) as PlayerNpcRequest[],
      };
    }),
  );

  return result;
}
