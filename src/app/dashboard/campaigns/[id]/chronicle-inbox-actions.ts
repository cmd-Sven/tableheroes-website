"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import {
  markLocationImported,
  markNpcImported,
  markQuestImported,
} from "@/src/lib/session-chronicle/inbox";
import { parseChronicleStateRow } from "@/src/lib/session-chronicle/parse-db";
import type { SessionChronicleState } from "@/src/lib/session-chronicle/types";

export type MarkChronicleImportResult =
  | { ok: true }
  | { ok: false; error: string };

async function authorizeSessionGm(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Nicht authentifiziert." };

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string } | null;
  if (!session) return { ok: false as const, error: "Session nicht gefunden." };

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as { gm_id: string } | null;
  if (!campaign || campaign.gm_id !== user.id) {
    return { ok: false as const, error: "Nur der GM kann Importe markieren." };
  }

  return { ok: true as const, supabase, sessionId, campaignId: session.campaign_id };
}

export async function markChronicleInboxItemImported(
  sessionId: string,
  kind: "npc" | "location" | "quest",
  index: number,
  entityId: string,
): Promise<MarkChronicleImportResult> {
  const auth = await authorizeSessionGm(sessionId);
  if (!auth.ok) return auth;

  const trimmedId = entityId.trim();
  if (!trimmedId) return { ok: false, error: "Entitäts-ID fehlt." };

  const { data: stateRaw } = await (auth.supabase as any)
    .from("session_chronicle_state")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const state = parseChronicleStateRow(stateRaw);
  if (!state) return { ok: false, error: "Chronist-Zustand nicht gefunden." };

  let updated: SessionChronicleState;
  if (kind === "npc") {
    updated = markNpcImported(state, index, trimmedId);
  } else if (kind === "location") {
    updated = markLocationImported(state, index, trimmedId);
  } else {
    updated = markQuestImported(state, index, trimmedId);
  }

  const { error } = await (auth.supabase as any)
    .from("session_chronicle_state")
    .update({
      spontaneous_npcs: updated.spontaneous_npcs,
      spontaneous_locations: updated.spontaneous_locations,
      spontaneous_quests: updated.spontaneous_quests,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/campaigns/${auth.campaignId}/chronist`);
  revalidatePath(`/session/${sessionId}`);

  return { ok: true };
}
