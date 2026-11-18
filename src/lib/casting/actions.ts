"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { insertOwnCastingSignup } from "@/src/lib/casting/join";
import { CASTING_CALL_SLUG } from "@/src/lib/casting/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireUser();
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as { primary_role?: string; is_super_admin?: boolean } | null;
  const isAdmin = profile?.primary_role === "Admin" || Boolean(profile?.is_super_admin);
  return { supabase, user, isAdmin };
}

function revalidateCasting() {
  revalidatePath("/");
  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard/admin/events");
}

export async function joinCastingCall(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Bitte zuerst registrieren oder einloggen." };

  const result = await insertOwnCastingSignup(supabase as any, user.id);
  if (!result.ok) return result;
  revalidateCasting();
  return { ok: true };
}

export async function setCastingCallActive(
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "Nur Admins dürfen die Spielersuche schalten." };

  const { error } = await (supabase.from("casting_calls") as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("slug", CASTING_CALL_SLUG);

  if (error) return { ok: false, error: "Der Schalter hat nicht gespeichert." };
  revalidateCasting();
  return { ok: true };
}

export async function setCastingDateSent(
  userId: string,
  dateSent: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "Nur Admins dürfen das notieren." };

  const { data: call } = await (supabase.from("casting_calls") as any)
    .select("id")
    .eq("slug", CASTING_CALL_SLUG)
    .maybeSingle();
  const callId = (call as { id: string } | null)?.id;
  if (!callId) return { ok: false, error: "Die Spielersuche fehlt." };

  const { error } = await (supabase.from("casting_signups") as any)
    .update({
      date_sent: dateSent,
      date_sent_at: dateSent ? new Date().toISOString() : null,
    })
    .eq("casting_id", callId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "Die Notiz hat nicht gespeichert." };
  revalidateCasting();
  return { ok: true };
}
