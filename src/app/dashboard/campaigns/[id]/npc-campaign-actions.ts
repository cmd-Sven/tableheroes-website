"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { setCampaignVisibility } from "./campaign-visibility-actions";

/** Kampagne: NPC für Spieler sichtbar/verborgen schalten. */
export async function toggleNPCReveal(
  campaignId: string,
  npcId: string,
  currentRevealed: boolean,
) {
  await setCampaignVisibility(campaignId, "npc", npcId, !currentRevealed);
}

/** Welt-GM: NPC aus der Welt löschen. */
export async function deleteNPC(npcId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: npc } = await (supabase.from("npcs") as any)
    .select("world_id, worlds!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const worlds = npc.worlds as { gm_id: string } | undefined;
  if (!worlds || worlds.gm_id !== user.id) {
    throw new Error("Nur der GM der Welt kann NPCs löschen.");
  }

  const { error } = await (supabase.from("npcs") as any).delete().eq("id", npcId);

  if (error) {
    console.error("Delete NPC Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
}
