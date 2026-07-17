"use server";

import { createAdminClient, createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";

export type SessionHandRaise = {
  id: string;
  userId: string;
  characterId?: string;
  displayName: string;
  urgent: boolean;
  at: string;
};

export function normalizeHandRaises(value: unknown): SessionHandRaise[] {
  if (!Array.isArray(value)) return [];
  const rows: SessionHandRaise[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const userId = String(row.userId ?? "").trim();
    const displayName = String(row.displayName ?? "").trim() || "Spieler";
    const at = String(row.at ?? "").trim();
    if (!id || !userId || !at) continue;
    rows.push({
      id,
      userId,
      characterId:
        row.characterId != null && String(row.characterId).trim()
          ? String(row.characterId).trim()
          : undefined,
      displayName,
      urgent: row.urgent === true,
      at,
    });
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

async function assertSessionParticipant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  userId: string,
): Promise<{ isGm: boolean; username: string | null }> {
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
    isGm,
    username: (userRaw as { username?: string | null } | null)?.username ?? null,
  };
}

function isMissingRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "");
  return (
    /Could not find the function/i.test(msg) ||
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /hand_raises/i.test(msg)
  );
}

async function writeHandRaisesAdmin(
  sessionId: string,
  next: SessionHandRaise[],
): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    throw new Error(
      "Meldung konnte nicht gespeichert werden (RPC fehlt und Service-Role nicht verfügbar).",
    );
  }
  const { data, error } = await (admin.from("session_live_states") as any)
    .update({ hand_raises: next })
    .eq("session_id", sessionId)
    .select("session_id")
    .maybeSingle();
  if (error) throw new Error(error.message || "Meldung konnte nicht gespeichert werden.");
  if (!data) throw new Error("Live-State nicht gefunden.");
}

async function readHandRaisesAdmin(sessionId: string): Promise<SessionHandRaise[]> {
  const admin = tryCreateAdminClient() ?? createAdminClient();
  const { data, error } = await (admin.from("session_live_states") as any)
    .select("hand_raises")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message || "Live-State nicht gefunden.");
  if (!data) throw new Error("Live-State nicht gefunden.");
  return normalizeHandRaises(data.hand_raises);
}

export async function raiseSessionHand(input: {
  sessionId: string;
  urgent?: boolean;
  displayName?: string;
  characterId?: string;
}): Promise<SessionHandRaise> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { username } = await assertSessionParticipant(supabase, input.sessionId, user.id);
  const displayName = input.displayName?.trim() || username || "Spieler";
  const urgent = Boolean(input.urgent);

  const { data, error } = await (supabase as any).rpc("raise_session_hand", {
    p_session_id: input.sessionId,
    p_urgent: urgent,
    p_display_name: displayName,
    p_character_id: input.characterId ?? null,
  });

  if (!error && data) {
    const normalized = normalizeHandRaises([data])[0];
    if (normalized) return normalized;
  }

  if (error && !isMissingRpc(error)) {
    throw new Error(error.message || "Meldung fehlgeschlagen.");
  }

  const current = await readHandRaisesAdmin(input.sessionId);
  const existing = current.find((r) => r.userId === user.id);
  const entry: SessionHandRaise = existing
    ? {
        ...existing,
        displayName,
        characterId: input.characterId?.trim() || existing.characterId,
        urgent: urgent || existing.urgent,
      }
    : {
        id: `hand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: user.id,
        characterId: input.characterId?.trim() || undefined,
        displayName,
        urgent,
        at: new Date().toISOString(),
      };

  const next = [...current.filter((r) => r.userId !== user.id), entry].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  await writeHandRaisesAdmin(input.sessionId, next);
  return entry;
}

export async function lowerSessionHand(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  await assertSessionParticipant(supabase, sessionId, user.id);

  const { error } = await (supabase as any).rpc("lower_session_hand", {
    p_session_id: sessionId,
  });

  if (!error) return;
  if (!isMissingRpc(error)) throw new Error(error.message || "Zurücknehmen fehlgeschlagen.");

  const current = await readHandRaisesAdmin(sessionId);
  await writeHandRaisesAdmin(
    sessionId,
    current.filter((r) => r.userId !== user.id),
  );
}

export async function dismissSessionHand(
  sessionId: string,
  raiseId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { isGm } = await assertSessionParticipant(supabase, sessionId, user.id);
  if (!isGm) throw new Error("Nur der Spielleiter kann Meldungen entfernen.");

  const trimmed = raiseId.trim();
  if (!trimmed) throw new Error("Ungültige Meldungs-ID.");

  const { error } = await (supabase as any).rpc("dismiss_session_hand", {
    p_session_id: sessionId,
    p_raise_id: trimmed,
  });

  if (!error) return;
  if (!isMissingRpc(error)) throw new Error(error.message || "Entfernen fehlgeschlagen.");

  const current = await readHandRaisesAdmin(sessionId);
  await writeHandRaisesAdmin(
    sessionId,
    current.filter((r) => r.id !== trimmed),
  );
}
