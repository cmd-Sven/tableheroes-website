type SupabaseLike = {
  from: (table: string) => any;
};

/** PostgREST: Spalte im API-Schema-Cache nicht (Migration fehlt / Cache veraltet). */
export function isPostgrestUnknownColumnError(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  if (e?.code === "PGRST204") return true;
  const msg = String(e?.message ?? "");
  return (
    /could not find the '[^']+' column/i.test(msg) &&
    (/schema cache/i.test(msg) || /not in the schema cache/i.test(msg))
  );
}

export function parseUnknownColumnFromPostgrestMessage(message: string): string | null {
  const m = message.match(/Could not find the '([^']+)' column/i);
  if (m?.[1]) return m[1];
  const m2 = message.match(/"([^"]+)" column of 'session_live_states'/i);
  return m2?.[1] ?? null;
}

/**
 * session_live_states.update mit Strip-Retry bei fehlenden Spalten (ältere Remote-DBs).
 */
export async function resilientUpdateSessionLiveState(
  supabase: SupabaseLike,
  sessionId: string,
  patch: Record<string, unknown>,
): Promise<{ error: { message?: string } | null }> {
  let payload = { ...patch };

  for (let attempt = 0; attempt < 40; attempt++) {
    const { error } = await supabase
      .from("session_live_states")
      .update(payload)
      .eq("session_id", sessionId);

    if (!error) {
      return { error: null };
    }
    if (!isPostgrestUnknownColumnError(error)) {
      return { error };
    }

    const badCol = parseUnknownColumnFromPostgrestMessage(String(error.message ?? ""));
    if (!badCol || !Object.prototype.hasOwnProperty.call(payload, badCol)) {
      return { error };
    }

    const next = { ...payload };
    delete next[badCol];
    payload = next;
    console.warn(
      `[session_live_states] PostgREST kennt Spalte '${badCol}' nicht — Update ohne dieses Feld wiederholt.`,
    );
  }

  return { error: { message: "Update nach mehreren Versuchen fehlgeschlagen." } };
}
