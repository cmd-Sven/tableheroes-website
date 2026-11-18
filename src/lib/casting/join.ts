import { CASTING_CALL_SLUG } from "@/src/lib/casting/types";

type CastClient = {
  from: (table: string) => any;
};

export async function insertOwnCastingSignup(
  supabase: CastClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: call } = await supabase
    .from("casting_calls")
    .select("id, is_active")
    .eq("slug", CASTING_CALL_SLUG)
    .maybeSingle();

  const row = call as { id: string; is_active: boolean } | null;
  if (!row?.is_active) {
    return { ok: false, error: "Die Spielersuche ist gerade geschlossen." };
  }

  const { error } = await supabase.from("casting_signups").insert({
    casting_id: row.id,
    user_id: userId,
  });

  if (error && error.code !== "23505") {
    return { ok: false, error: "Die Warteliste hat dich gerade nicht angenommen." };
  }

  return { ok: true };
}
