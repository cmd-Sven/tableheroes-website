/**
 * Shared helpers for session-actions modules (live-state insert + chronicle snapshot).
 */
/** PostgREST: Spalte im API-Schema-Cache nicht (Migration fehlt / Cache veraltet). */
export function isPostgrestUnknownColumnError(insertError: unknown): boolean {
  const e = insertError as { code?: string; message?: string };
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

export function logSupabaseInsertError(context: string, insertError: unknown) {
  const e = insertError as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };
  console.error(`${context} Supabase Insert Error Message:`, e?.message ?? insertError);
  console.error(`${context} Supabase Insert Error Details:`, e?.details ?? "No details");
  console.error(`${context} Supabase Insert Error Hint:`, e?.hint ?? "No hint");
  console.error(`${context} Supabase Insert Error Code:`, e?.code ?? "No code");
  if (insertError && typeof insertError === "object") {
    console.error(
      `${context} Supabase Insert Error keys:`,
      Object.getOwnPropertyNames(insertError),
    );
    try {
      console.error(
        `${context} Supabase Insert Error JSON:`,
        JSON.stringify(insertError, null, 2),
      );
    } catch {
      console.error(`${context} Supabase Insert Error (not JSON-serializable)`);
    }
  }
}

/** Kernfelder ohne neuere Spalten (z. B. temperature) — für sehr alte PostgREST-Caches / DBs. */
export function buildSessionPrepCoreInsertPayload(
  sessionId: string,
  scribeUserId: string,
): Record<string, unknown> {
  return {
    session_id: sessionId,
    scribe_id: scribeUserId,
    weather: "Klar",
    current_time: "Tag",
    current_location: null,
    journal_text: null,
    system_logs: [],
    visible_npc_ids: [],
    visible_faction_ids: [],
    is_background_manual_override: false,
    is_combat_mode: false,
    current_turn_index: 0,
  };
}

/** Kein undefined im Insert — PostgREST/JS-Client; optionale FK/JSON explizit null / {}. */
export function buildSessionPrepLiveStateInsertPayload(
  sessionId: string,
  scribeUserId: string,
): Record<string, unknown> {
  return {
    session_id: sessionId,
    weather: "Klar",
    temperature: "normal",
    temperature_value: 15,
    current_time: "Tag",
    current_location: null,
    current_location_lore_id: null,
    current_location_id: null,
    current_loot_id: null,
    journal_text: null,
    system_logs: [],
    visible_npc_ids: [],
    visible_faction_ids: [],
    is_background_manual_override: false,
    is_combat_mode: false,
    current_turn_index: 0,
    scribe_id: scribeUserId,
    fate_coins: [],
    destroyed_fate_coins: 0,
    downtime_active: false,
    downtime_type: "travel",
    downtime_current_day: 1,
    downtime_total_days: 1,
    fap_allocations: {},
    physically_present_user_ids: [],
    loot_hide_npcs: false,
    dummy_player_count: 0,
    active_shop_id: null,
    active_merchant_npc_id: null,
    background_url: null,
    in_game_date: null,
    in_game_time: null,
    weather_intensity: null,
    weather_preset: null,
    weather_temperature: null,
  };
}

type ChronicleEntry = {
  id: string;
  at: string;
  text: string;
  type: string;
  author_name: string;
};

export function normalizeStringIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

export function normalizeChronicleSnapshot(systemLogs: unknown, journalText: unknown): ChronicleEntry[] {
  const entries: ChronicleEntry[] = [];

  if (Array.isArray(systemLogs)) {
    for (const item of systemLogs) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const text = String(row.text ?? "").trim();
      if (!text) continue;
      entries.push({
        id: String(row.id ?? `system-${entries.length}`),
        at: String(row.at ?? new Date().toISOString()),
        text,
        type: String(row.type ?? "system"),
        author_name: String(row.author_name ?? "System"),
      });
    }
  }

  const manualText = String(journalText ?? "").trim();
  if (manualText) {
    entries.push({
      id: `journal-${Date.now()}`,
      at: new Date().toISOString(),
      text: manualText,
      type: "journal",
      author_name: "Chronik",
    });
  }

  return entries.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}
