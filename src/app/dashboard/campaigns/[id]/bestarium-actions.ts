"use server";

import { revalidatePath } from "next/cache";
import { setCampaignVisibility } from "./campaign-visibility-actions";

export async function toggleBestariumReveal(campaignId: string, creatureId: string, currentRevealed: boolean) {
  await setCampaignVisibility(campaignId, "bestarium", creatureId, !currentRevealed);
  revalidatePath(`/dashboard/campaigns/${campaignId}/bestarium`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}
