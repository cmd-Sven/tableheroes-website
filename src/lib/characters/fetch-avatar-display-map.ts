/**
 * Lädt `avatar_display` nur in einem separaten Select.
 * Wenn die Spalte (Migration) noch fehlt oder die Abfrage fehlschlägt, leere Map –
 * die Hauptabfrage ohne `avatar_display` darf nicht scheitern.
 */
export async function fetchAvatarDisplayMapForCampaign(
  supabase: { from: (t: string) => any },
  campaignId: string,
  characterIds: string[],
): Promise<Map<string, unknown | null>> {
  const map = new Map<string, unknown | null>();
  const ids = [...new Set(characterIds.map(String).filter(Boolean))];
  if (ids.length === 0) return map;
  try {
    const { data, error } = await (supabase.from("characters") as any)
      .select("id, avatar_display")
      .eq("campaign_id", campaignId)
      .in("id", ids);
    if (error) return map;
    for (const row of (data as { id: string; avatar_display?: unknown }[]) ?? []) {
      map.set(String(row.id), row.avatar_display ?? null);
    }
  } catch {
    /* Spalte fehlt, RLS, o. Ä. */
  }
  return map;
}
