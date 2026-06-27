"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/src/lib/supabase/server";
import {
  createGuestSessionCookieValue,
  guestSessionCookieOptions,
} from "@/src/lib/session-guest-auth";

export type JoinSessionAsGuestResult =
  | { ok: true; sessionId: string; displayName: string; slotIndex: number }
  | { ok: false; error: string };

export async function joinSessionAsGuest(
  joinToken: string,
  displayName: string,
  existingGuestId?: string | null,
): Promise<JoinSessionAsGuestResult> {
  const token = joinToken.trim();
  const name = displayName.trim();
  if (!token) return { ok: false, error: "Einladungslink ungültig." };
  if (name.length < 1 || name.length > 40) {
    return { ok: false, error: "Bitte einen Namen mit 1–40 Zeichen eingeben." };
  }

  const admin = createAdminClient();
  const guestId =
    existingGuestId && /^[0-9a-f-]{36}$/i.test(existingGuestId)
      ? existingGuestId
      : undefined;

  const { data, error } = await (admin as any).rpc("join_session_as_guest", {
    p_join_token: token,
    p_display_name: name,
    p_guest_id: guestId ?? randomUUID(),
  });

  if (error) {
    const msg = String(error.message ?? "Beitritt fehlgeschlagen.");
    return { ok: false, error: msg };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id) {
    return { ok: false, error: "Beitritt fehlgeschlagen." };
  }

  const sessionId = String(row.session_id);
  const resolvedGuestId = String(row.guest_id);
  const { value } = createGuestSessionCookieValue(sessionId, resolvedGuestId);
  const jar = await cookies();
  jar.set(guestSessionCookieOptions(value));

  return {
    ok: true,
    sessionId,
    displayName: String(row.display_name ?? name),
    slotIndex: Number(row.slot_index ?? 0),
  };
}

export async function touchGuestSession(guestId: string, sessionId: string): Promise<void> {
  const admin = createAdminClient();
  await (admin as any)
    .from("session_guest_participants")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", guestId)
    .eq("session_id", sessionId);
}
