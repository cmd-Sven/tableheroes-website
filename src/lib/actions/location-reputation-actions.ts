"use server";

import { createClient } from "@/src/lib/supabase/server";

export async function adjustLocationReputation(
  campaignId: string,
  locationId: string,
  amount: number,
) {
  const supabase = await createClient();

  const delta = Math.trunc(Number(amount));
  if (!campaignId || !locationId || !Number.isFinite(delta) || delta === 0) {
    throw new Error("Ungültige Ortsruf-Anpassung.");
  }

  const { data, error } = await supabase.rpc(
    "adjust_campaign_location_reputation",
    {
      p_campaign_id: campaignId,
      p_location_id: locationId,
      p_amount: delta,
    },
  );

  if (error) {
    console.error("[adjustLocationReputation]", error);
    throw new Error(error.message || "Ortsruf konnte nicht angepasst werden.");
  }

  return data;
}
