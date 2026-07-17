"use server";

import { createAdminClient, createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
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

function entryToJson(entry: SessionActivityEntry): Record<string, unknown> {
  return {
    id: entry.id,
    at: entry.at,
    text: entry.text,
    type: entry.type,
    author_name: entry.author_name,
    author_user_id: entry.author_user_id,
    character_id: entry.character_id,
    meta: entry.meta ?? null,
  };
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

/** Fallback wenn RPC noch nicht deployed: Admin-Write mit Verify (Spieler haben kein UPDATE-RLS). */
async function appendWithAdminFallback(
  sessionId: string,
  entry: SessionActivityEntry,
): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    throw new Error(
      "Würfel/Chat konnte nicht gespeichert werden (RPC fehlt und Service-Role nicht verfügbar).",
    );
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: liveRaw, error: liveErr } = await (admin.from("session_live_states") as any)
      .select("system_logs")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (liveErr) throw new Error(liveErr.message || "Live-State nicht gefunden.");
    if (!liveRaw) throw new Error("Live-State nicht gefunden.");

    const current = normalizeLogs(liveRaw.system_logs);
    if (current.some((e) => e.id === entry.id)) return;

    const nextLogs = [...current, entry].slice(-120);
    const { data: updated, error: upErr } = await (admin.from("session_live_states") as any)
      .update({ system_logs: nextLogs })
      .eq("session_id", sessionId)
      .select("system_logs")
      .maybeSingle();

    if (upErr) throw new Error(upErr.message || "Aktivität konnte nicht gespeichert werden.");
    if (!updated) throw new Error("Aktivität konnte nicht gespeichert werden (0 Zeilen).");

    const saved = normalizeLogs(updated.system_logs);
    if (saved.some((e) => e.id === entry.id)) return;
  }

  throw new Error("Aktivität konnte nach mehreren Versuchen nicht gespeichert werden.");
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

  const { campaignId, username } = await assertSessionParticipant(
    supabase,
    input.sessionId,
    user.id,
  );

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

  const { error: rpcErr } = await (supabase as any).rpc("append_session_system_log", {
    p_session_id: input.sessionId,
    p_entry: entryToJson(entry),
  });

  if (rpcErr) {
    const msg = String(rpcErr.message ?? "");
    const missingRpc =
      /append_session_system_log/i.test(msg) ||
      /Could not find the function/i.test(msg) ||
      rpcErr.code === "PGRST202" ||
      rpcErr.code === "42883";
    if (!missingRpc) {
      throw new Error(msg || "Aktivität konnte nicht gespeichert werden.");
    }
    await appendWithAdminFallback(input.sessionId, entry);
  }

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

export async function clearSessionActivity(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { isGm } = await assertSessionParticipant(supabase, sessionId, user.id);
  if (!isGm) throw new Error("Nur der Spielleiter kann den Chat leeren.");

  const { error: rpcErr } = await (supabase as any).rpc("clear_session_system_logs", {
    p_session_id: sessionId,
  });

  if (!rpcErr) return;

  const msg = String(rpcErr.message ?? "");
  const missingRpc =
    /clear_session_system_logs/i.test(msg) ||
    /Could not find the function/i.test(msg) ||
    rpcErr.code === "PGRST202" ||
    rpcErr.code === "42883";
  if (!missingRpc) throw new Error(msg || "Chat konnte nicht geleert werden.");

  const admin = tryCreateAdminClient() ?? createAdminClient();
  const { data, error } = await (admin.from("session_live_states") as any)
    .update({ system_logs: [] })
    .eq("session_id", sessionId)
    .select("session_id")
    .maybeSingle();
  if (error) throw new Error(error.message || "Chat konnte nicht geleert werden.");
  if (!data) throw new Error("Live-State nicht gefunden.");
}

export async function deleteSessionActivityEntry(
  sessionId: string,
  entryId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { isGm } = await assertSessionParticipant(supabase, sessionId, user.id);
  if (!isGm) throw new Error("Nur der Spielleiter kann Nachrichten löschen.");

  const trimmedId = entryId.trim();
  if (!trimmedId) throw new Error("Ungültige Eintrags-ID.");

  const { error: rpcErr } = await (supabase as any).rpc("delete_session_system_log", {
    p_session_id: sessionId,
    p_entry_id: trimmedId,
  });

  if (!rpcErr) return;

  const msg = String(rpcErr.message ?? "");
  const missingRpc =
    /delete_session_system_log/i.test(msg) ||
    /Could not find the function/i.test(msg) ||
    rpcErr.code === "PGRST202" ||
    rpcErr.code === "42883";
  if (!missingRpc) throw new Error(msg || "Nachricht konnte nicht gelöscht werden.");

  const admin = tryCreateAdminClient() ?? createAdminClient();
  const { data: liveRaw, error: liveErr } = await (admin.from("session_live_states") as any)
    .select("system_logs")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (liveErr) throw new Error(liveErr.message || "Live-State nicht gefunden.");
  if (!liveRaw) throw new Error("Live-State nicht gefunden.");

  const nextLogs = normalizeLogs(liveRaw.system_logs).filter((e) => e.id !== trimmedId);
  const { data, error } = await (admin.from("session_live_states") as any)
    .update({ system_logs: nextLogs })
    .eq("session_id", sessionId)
    .select("session_id")
    .maybeSingle();
  if (error) throw new Error(error.message || "Nachricht konnte nicht gelöscht werden.");
  if (!data) throw new Error("Nachricht konnte nicht gelöscht werden (0 Zeilen).");
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

  const admin = tryCreateAdminClient() ?? supabase;
  const { data: liveRaw } = await (admin.from("session_live_states") as any)
    .select("system_logs")
    .eq("session_id", input.sessionId)
    .maybeSingle();

  const logs = normalizeLogs(liveRaw?.system_logs);
  const req = logs.find((l) => l.id === input.requestId && l.type === "attack_pending");
  if (!req) throw new Error("Anfrage nicht gefunden.");

  const reqMeta = (req.meta ?? {}) as {
    weaponName?: string;
    damage?: string;
    isCritical?: boolean;
  };
  const name = req.author_name ?? "Spieler";
  const critical = input.critical ?? Boolean(reqMeta.isCritical);
  const resultText = input.hit
    ? critical
      ? `${name} trifft KRITISCH mit ${reqMeta.weaponName ?? "Waffe"}! — Schaden würfeln (doppelte Würfel).`
      : `${name} trifft mit ${reqMeta.weaponName ?? "Waffe"}! — Schaden würfeln.`
    : `${name} verfehlt das Ziel.`;

  await appendSessionActivity({
    sessionId: input.sessionId,
    type: input.hit ? "attack_hit" : "attack_miss",
    text: resultText,
    characterId: req.character_id,
    characterName: name,
    meta: {
      requestId: input.requestId,
      hit: input.hit,
      critical,
      weaponName: reqMeta.weaponName,
      damage: reqMeta.damage,
      awaitsDamageRoll: input.hit,
    },
  });
}
