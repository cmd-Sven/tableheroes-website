"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CampaignSchema } from "@/src/lib/validations/schemas";

export async function togglePublishStatus(
  campaignId: string,
  currentState: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  const parsed = CampaignSchema.pick({ id: true, gm_id: true }).safeParse(
    campaignRaw,
  );

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM of this campaign.");
  }

  const { error } = await (supabase.from("campaigns") as any)
    .update({ is_published: !currentState })
    .eq("id", campaignId);

  if (error) {
    console.error("Toggle Publish Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/");
}

export async function updateCampaignDetails(
  campaignId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  const parsed = CampaignSchema.pick({ id: true, gm_id: true }).safeParse(
    campaignRaw,
  );

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM of this campaign.");
  }

  const nameRaw = formData.get("name") as string;
  const name = nameRaw?.trim();
  const banner_url = formData.get("banner_url") as string;
  const frequency = formData.get("frequency") as string;
  const looking_for = formData.get("looking_for") as string;
  const house_rules = formData.get("house_rules") as string;

  if (!name || name.length < 2) {
    throw new Error("Kampagnenname muss mindestens 2 Zeichen lang sein.");
  }

  const { error } = await (supabase.from("campaigns") as any)
    .update({
      name,
      banner_url: banner_url || null,
      frequency: frequency || null,
      looking_for: looking_for || null,
      house_rules: house_rules || null,
    })
    .eq("id", campaignId);

  if (error) {
    console.error("Update Campaign Details Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
}
