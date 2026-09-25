"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { claimKnowledgeSuggestion } from "@/src/lib/dashboard/knowledge-suggestion";
import type { DashboardLoreEntry } from "@/src/lib/types/dashboard-widgets";

export async function openKnowledgeSuggestion(
  entry: Pick<DashboardLoreEntry, "id" | "type" | "campaignId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const result = await claimKnowledgeSuggestion(user.id, entry);
  if (result.ok) revalidatePath("/dashboard");
  return result;
}
