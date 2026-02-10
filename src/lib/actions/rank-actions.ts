"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CampaignSchema } from "@/src/lib/validations/schemas";

export async function updatePlayerRank(
  targetUserId: string,
  rankId: string | null,
  campaignId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  const parsed = CampaignSchema.pick({
    id: true,
    gm_id: true,
  }).safeParse(campaignRaw);

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM.");
  }

  const { error } = await (supabase.from("users") as any)
    .update({ rank_id: rankId })
    .eq("id", targetUserId);

  if (error) {
    console.error("Update Player Rank Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  revalidatePath("/profile/[username]", "page");
}
