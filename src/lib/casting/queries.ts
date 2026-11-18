import { createClient } from "@/src/lib/supabase/server";
import {
  CASTING_CALL_SLUG,
  type CastingAdminState,
  type CastingSignupRow,
  type LandingCastingCall,
} from "@/src/lib/casting/types";

type CallRow = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  min_players: number;
  is_active: boolean;
};

export async function getLandingCastingCall(
  userId: string | null,
): Promise<LandingCastingCall | null> {
  const supabase = await createClient();
  const { data } = await (supabase.from("casting_calls") as any)
    .select("id, title, subtitle, body, min_players, is_active")
    .eq("slug", CASTING_CALL_SLUG)
    .eq("is_active", true)
    .maybeSingle();

  const call = data as CallRow | null;
  if (!call?.is_active) return null;

  let joined = false;
  if (userId) {
    const { data: signup } = await (supabase.from("casting_signups") as any)
      .select("id")
      .eq("casting_id", call.id)
      .eq("user_id", userId)
      .maybeSingle();
    joined = Boolean(signup);
  }

  return {
    id: call.id,
    title: call.title,
    subtitle: call.subtitle,
    body: call.body,
    minPlayers: call.min_players,
    loggedIn: Boolean(userId),
    joined,
  };
}

export async function getCastingAdminState(): Promise<CastingAdminState | null> {
  const supabase = await createClient();
  const { data } = await (supabase.from("casting_calls") as any)
    .select("id, title, subtitle, body, min_players, is_active")
    .eq("slug", CASTING_CALL_SLUG)
    .maybeSingle();

  const call = data as CallRow | null;
  if (!call) return null;

  const { data: rows } = await (supabase.from("casting_signups") as any)
    .select("user_id, created_at, date_sent, date_sent_at, users(username, email)")
    .eq("casting_id", call.id)
    .order("created_at", { ascending: true });

  const signups: CastingSignupRow[] = ((rows ?? []) as Array<{
    user_id: string;
    created_at: string;
    date_sent: boolean;
    date_sent_at: string | null;
    users: { username: string | null; email: string | null } | { username: string | null; email: string | null }[] | null;
  }>).map((row) => {
    const profile = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      userId: row.user_id,
      username: profile?.username?.trim() || "Unbekannt",
      email: profile?.email?.trim() || "",
      createdAt: row.created_at,
      dateSent: Boolean(row.date_sent),
      dateSentAt: row.date_sent_at,
    };
  });

  return {
    id: call.id,
    title: call.title,
    subtitle: call.subtitle,
    minPlayers: call.min_players,
    isActive: call.is_active,
    signups,
  };
}
