"use server";

import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { recordPlayerCharacterEditAdmin } from "@/src/lib/characters/player-character-edit-alerts";

export type SessionActivityEntry = {
  id: string;
  at: string;
  text: string;
  type: string;
  author_name?: string;
  author_user_id?: string;
  character_id?: string;
  meta?: Record<string, unknown>;
};

function normalizeLogs(value: unknown): SessionActivityEntry[] {
  return Array.isArray(value)
    ? value.filter((e): e is SessionActivityEntry => e != null && typeof e === "object")
    : [];
}

async function assertSessionParticipant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  userId: string,
): Promise<{ campaignId: string; isGm: boolean; username: string | null }> {
  const { data: sessionRaw, error } = await (supabase.from("sessions") as any)
    .select("id, campaign_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !sessionRaw) throw new Error("Session nicht gefunden.");

  const campaignId = String((sessionRaw as { campaign_id: string }).campaign_id);

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const campaign = campaignRaw as { gm_id?: string | null; owner_id?: string | null } | null;
  const isGm = isCampaignGm(campaign, userId);

  if (!isGm) {
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .maybeSingle();
    const status = String((member as { status?: string } | null)?.status ?? "");
    const ok = ["Approved", "Active", "Drafting", "Changes_Proposed"].includes(status);
    if (!ok) throw new Error("Keine Berechtigung für diese Session.");
  }

  const { data: userRaw } = await (supabase.from("users") as any)
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  return {
    campaignId,
    isGm,
    username: (userRaw as { username?: string | null } | null)?.username ?? null,
  };
}

export async function appendSessionActivity(input: {
  sessionId: string;
  type: string;
  text: string;
  characterId?: string;
  characterName?: string;
  meta?: Record<string, unknown>;
  notifyGm?: boolean;
  gmEditSummary?: string;
}): Promise<SessionActivityEntry | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const trimmed = input.text.trim();
  if (!trimmed) return null;

  const { campaignId, isGm, username } = await assertSessionParticipant(
    supabase,
    input.sessionId,
    user.id,
  );

  let writeClient = supabase;
  try {
    writeClient = createAdminClient();
  } catch {
    writeClient = supabase;
  }

  const { data: liveRaw, error: liveErr } = await (writeClient.from("session_live_states") as any)
    .select("system_logs")
    .eq("session_id", input.sessionId)
    .maybeSingle();

  if (liveErr) throw new Error(liveErr.message || "Live-State nicht gefunden.");

  const authorName = input.characterName?.trim() || username || "Spieler";
  const entry: SessionActivityEntry = {
    id: `${input.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    text: trimmed,
    type: input.type,
    author_name: authorName,
    author_user_id: user.id,
    character_id: input.characterId,
    meta: input.meta,
  };

  const nextLogs = [...normalizeLogs(liveRaw?.system_logs), entry].slice(-120);

  const { error: upErr } = await (writeClient.from("session_live_states") as any)
    .update({ system_logs: nextLogs })
    .eq("session_id", input.sessionId);

  if (upErr) throw new Error(upErr.message || "Aktivität konnte nicht gespeichert werden.");

  if (input.notifyGm && input.characterId && input.gmEditSummary) {
    try {
      await recordPlayerCharacterEditAdmin({
        characterId: input.characterId,
        campaignId,
        playerUserId: user.id,
        editSource: "live_session",
        editSummary: input.gmEditSummary,
      });
    } catch (err) {
      console.warn("[appendSessionActivity] GM alert failed:", err);
    }
  }

  return entry;
}

export async function resolveCombatRequest(input: {
  sessionId: string;
  requestId: string;
  hit: boolean;
  critical?: boolean;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { isGm } = await assertSessionParticipant(supabase, input.sessionId, user.id);
  if (!isGm) throw new Error("Nur der SL kann Angriffe bestätigen.");

  const { data: liveRaw } = await (supabase.from("session_live_states") as any)
    .select("system_logs")
    .eq("session_id", input.sessionId)
    .maybeSingle();

  const logs = normalizeLogs(liveRaw?.system_logs);
  const req = logs.find((l) => l.id === input.requestId && l.type === "attack_pending");
  if (!req) throw new Error("Anfrage nicht gefunden.");

  const name = req.author_name ?? "Spieler";
  const resultText = input.hit
    ? input.critical
      ? `${name} trifft KRITISCH! — Schaden würfeln.`
      : `${name} trifft! — Schaden würfeln.`
    : `${name} verfehlt das Ziel.`;

  await appendSessionActivity({
    sessionId: input.sessionId,
    type: input.hit ? "attack_hit" : "attack_miss",
    text: resultText,
    characterId: req.character_id,
    characterName: name,
    meta: { requestId: input.requestId, hit: input.hit, critical: input.critical },
  });
}
