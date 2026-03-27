"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions für Spieler-NPC-Anträge (player_npc_requests).
 * Lese-Funktionen: player-npc-requests-queries.ts
 */

export async function approvePlayerNpcRequest(
  requestId: string,
  campaignId: string,
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
    throw new Error("Nur der GM kann Anträge freigeben.");
  }

  const { error } = await (supabase.from("player_npc_requests") as any)
    .update({ status: "approved" })
    .eq("id", requestId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
}
