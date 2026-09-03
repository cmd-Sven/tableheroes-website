"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  CommunityEvent,
  CommunityEventInsert,
  CommunityEventStatus,
} from "@/src/lib/community-events/types";

export type CommunityEventRsvpStatus = "Zusage" | "Absage" | "Via Online";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { primary_role?: string; is_super_admin?: boolean } | null)
    ?.primary_role;
  const isSuper = (profile as { is_super_admin?: boolean } | null)?.is_super_admin;
  if (role !== "Admin" && !isSuper) {
    throw new Error("Nur Admins können Community-Termine verwalten.");
  }
  return user;
}

async function requireApprovedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, error: "Nicht authentifiziert." as const };

  const { data: profile } = await (supabase.from("users") as any)
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  const status = (profile as { status?: string } | null)?.status ?? "approved";
  if (status !== "approved") {
    return {
      user: null,
      error: "Dein Account muss freigeschaltet sein, um dich anzumelden." as const,
    };
  }
  return { user, error: null };
}

function revalidateCommunityEventPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/gm/planning-events");
  revalidatePath("/");
}

async function requireGm(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { primary_role?: string; is_super_admin?: boolean } | null)
    ?.primary_role;
  const isSuper = (profile as { is_super_admin?: boolean } | null)?.is_super_admin;
  if (role !== "GameMaster" && role !== "Admin" && !isSuper) {
    throw new Error("Nur Spielleiter können Spielplanungs-Termine anlegen.");
  }
  return user;
}

export async function getAllCommunityEventsForAdmin(): Promise<CommunityEvent[]> {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { data, error } = await (supabase as any).from("community_events")
    .select("*")
    .order("start_time", { ascending: false });

  if (error) {
    console.error("[getAllCommunityEventsForAdmin]", error);
    return [];
  }
  return (data as CommunityEvent[]) ?? [];
}

export async function createCommunityEvent(
  input: CommunityEventInsert,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);

    if (!input.title.trim()) {
      return { success: false, error: "Titel fehlt." };
    }

    const { data, error } = await (supabase as any).from("community_events")
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        event_kind: input.event_kind,
        start_time: input.start_time,
        end_time: input.end_time,
        location: input.location?.trim() || null,
        image_url: input.image_url?.trim() || null,
        rsvp_deadline_days: input.rsvp_deadline_days ?? 2,
        is_live: input.is_live ?? true,
        visible_on_landing: input.visible_on_landing ?? false,
        status: "Scheduled",
        created_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createCommunityEvent]", error);
      return { success: false, error: error.message };
    }

    revalidateCommunityEventPaths();
    return { success: true, id: (data as { id: string }).id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateCommunityEvent(
  eventId: string,
  input: Partial<CommunityEventInsert> & { status?: CommunityEventStatus },
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase);

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.event_kind !== undefined) patch.event_kind = input.event_kind;
    if (input.start_time !== undefined) patch.start_time = input.start_time;
    if (input.end_time !== undefined) patch.end_time = input.end_time;
    if (input.location !== undefined) patch.location = input.location?.trim() || null;
    if (input.image_url !== undefined) patch.image_url = input.image_url?.trim() || null;
    if (input.rsvp_deadline_days !== undefined) patch.rsvp_deadline_days = input.rsvp_deadline_days;
    if (input.is_live !== undefined) patch.is_live = input.is_live;
    if (input.visible_on_landing !== undefined) patch.visible_on_landing = input.visible_on_landing;
    if (input.status !== undefined) patch.status = input.status;

    const { error } = await (supabase as any).from("community_events")
      .update(patch)
      .eq("id", eventId);

    if (error) return { success: false, error: error.message };
    revalidateCommunityEventPaths();
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteCommunityEvent(
  eventId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase);

    const { error } = await (supabase as any).from("community_events")
      .delete()
      .eq("id", eventId);

    if (error) return { success: false, error: error.message };
    revalidateCommunityEventPaths();
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setCommunityEventRsvp(
  eventId: string,
  rsvpStatus: CommunityEventRsvpStatus,
  context?: { isLive: boolean },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const auth = await requireApprovedUser(supabase);
  if (!auth.user) return { success: false, error: auth.error ?? undefined };

  let isLive = context?.isLive ?? true;
  if (context == null) {
    const { data: event } = await (supabase as any).from("community_events")
      .select("id, is_live, status")
      .eq("id", eventId)
      .maybeSingle();
    if (!event) return { success: false, error: "Termin nicht gefunden." };
    if ((event as { status?: string }).status !== "Scheduled") {
      return { success: false, error: "Für diesen Termin ist keine Rückmeldung mehr möglich." };
    }
    isLive = (event as { is_live?: boolean }).is_live !== false;
  }

  if (rsvpStatus === "Via Online" && isLive) {
    const { data: existingViaOnline } = await (supabase as any).from("community_event_rsvps")
      .select("id")
      .eq("event_id", eventId)
      .eq("rsvp_status", "Via Online")
      .neq("user_id", auth.user.id)
      .maybeSingle();
    if (existingViaOnline) {
      return { success: false, error: "Der Online-Platz ist bereits vergeben." };
    }
  }

  const nowIso = new Date().toISOString();
  const { data: existing } = await (supabase as any).from("community_event_rsvps")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const writeError = existing?.id
    ? (
        await (supabase as any).from("community_event_rsvps")
          .update({ rsvp_status: rsvpStatus, updated_at: nowIso })
          .eq("id", existing.id)
      ).error
    : (
        await (supabase as any).from("community_event_rsvps").insert({
          event_id: eventId,
          user_id: auth.user.id,
          rsvp_status: rsvpStatus,
          updated_at: nowIso,
        })
      ).error;

  if (writeError) {
    console.error("[setCommunityEventRsvp]", writeError);
    return { success: false, error: writeError.message };
  }

  revalidateCommunityEventPaths();
  return { success: true };
}

export async function getCommunityEventRsvpCounts(
  eventIds: string[],
): Promise<Map<string, { zusage: number; absage: number; viaOnline: number }>> {
  const map = new Map<string, { zusage: number; absage: number; viaOnline: number }>();
  if (eventIds.length === 0) return map;

  const supabase = await createClient();
  await requireAdmin(supabase);

  const { data } = await (supabase as any).from("community_event_rsvps")
    .select("event_id, rsvp_status")
    .in("event_id", eventIds);

  for (const row of (data as { event_id: string; rsvp_status: string }[]) ?? []) {
    const cur = map.get(row.event_id) ?? { zusage: 0, absage: 0, viaOnline: 0 };
    if (row.rsvp_status === "Zusage") cur.zusage += 1;
    else if (row.rsvp_status === "Absage") cur.absage += 1;
    else if (row.rsvp_status === "Via Online") cur.viaOnline += 1;
    map.set(row.event_id, cur);
  }
  return map;
}

export async function getGmPlanningEventsForCurrentUser(): Promise<CommunityEvent[]> {
  const supabase = await createClient();
  const user = await requireGm(supabase);

  const { data, error } = await (supabase as any)
    .from("community_events")
    .select("*")
    .eq("event_kind", "Spielplanung")
    .eq("created_by", user.id)
    .order("start_time", { ascending: false });

  if (error) {
    console.error("[getGmPlanningEventsForCurrentUser]", error);
    return [];
  }
  return (data as CommunityEvent[]) ?? [];
}

export async function createGmPlanningEvent(
  input: Omit<CommunityEventInsert, "event_kind">,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireGm(supabase);

    if (!input.title.trim()) {
      return { success: false, error: "Titel fehlt." };
    }

    const { data, error } = await (supabase as any).from("community_events").insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      event_kind: "Spielplanung",
      start_time: input.start_time,
      end_time: input.end_time,
      location: input.location?.trim() || null,
      image_url: input.image_url?.trim() || null,
      rsvp_deadline_days: input.rsvp_deadline_days ?? 2,
      is_live: input.is_live ?? true,
      visible_on_landing: input.visible_on_landing ?? true,
      status: "Scheduled",
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }).select("id").single();

    if (error) {
      console.error("[createGmPlanningEvent]", error);
      return { success: false, error: error.message };
    }

    revalidateCommunityEventPaths();
    return { success: true, id: (data as { id: string }).id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateGmPlanningEvent(
  eventId: string,
  input: Partial<Omit<CommunityEventInsert, "event_kind">> & { status?: CommunityEventStatus },
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireGm(supabase);

    const { data: existing } = await (supabase as any)
      .from("community_events")
      .select("id, created_by, event_kind")
      .eq("id", eventId)
      .maybeSingle();

    const row = existing as { id: string; created_by: string; event_kind: string } | null;
    if (!row || row.event_kind !== "Spielplanung" || row.created_by !== user.id) {
      return { success: false, error: "Termin nicht gefunden oder keine Berechtigung." };
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.start_time !== undefined) patch.start_time = input.start_time;
    if (input.end_time !== undefined) patch.end_time = input.end_time;
    if (input.location !== undefined) patch.location = input.location?.trim() || null;
    if (input.image_url !== undefined) patch.image_url = input.image_url?.trim() || null;
    if (input.rsvp_deadline_days !== undefined) patch.rsvp_deadline_days = input.rsvp_deadline_days;
    if (input.is_live !== undefined) patch.is_live = input.is_live;
    if (input.visible_on_landing !== undefined) patch.visible_on_landing = input.visible_on_landing;
    if (input.status !== undefined) patch.status = input.status;

    const { error } = await (supabase as any)
      .from("community_events")
      .update(patch)
      .eq("id", eventId);

    if (error) return { success: false, error: error.message };
    revalidateCommunityEventPaths();
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteGmPlanningEvent(
  eventId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireGm(supabase);

    const { data: existing } = await (supabase as any)
      .from("community_events")
      .select("id, created_by, event_kind")
      .eq("id", eventId)
      .maybeSingle();

    const row = existing as { id: string; created_by: string; event_kind: string } | null;
    if (!row || row.event_kind !== "Spielplanung" || row.created_by !== user.id) {
      return { success: false, error: "Termin nicht gefunden oder keine Berechtigung." };
    }

    const { error } = await (supabase as any).from("community_events").delete().eq("id", eventId);
    if (error) return { success: false, error: error.message };
    revalidateCommunityEventPaths();
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getPlanningEventRsvpCountsForGm(
  eventIds: string[],
): Promise<Record<string, { zusage: number; absage: number; viaOnline: number }>> {
  const result: Record<string, { zusage: number; absage: number; viaOnline: number }> = {};
  if (eventIds.length === 0) return result;

  const supabase = await createClient();
  const user = await requireGm(supabase);

  const { data: owned } = await (supabase as any)
    .from("community_events")
    .select("id")
    .in("id", eventIds)
    .eq("event_kind", "Spielplanung")
    .eq("created_by", user.id);

  const allowed = new Set(
    ((owned as { id: string }[]) ?? []).map((row) => row.id),
  );
  const filteredIds = eventIds.filter((id) => allowed.has(id));
  if (filteredIds.length === 0) return result;

  const { data } = await (supabase as any)
    .from("community_event_rsvps")
    .select("event_id, rsvp_status")
    .in("event_id", filteredIds);

  for (const row of (data as { event_id: string; rsvp_status: string }[]) ?? []) {
    const cur = result[row.event_id] ?? { zusage: 0, absage: 0, viaOnline: 0 };
    if (row.rsvp_status === "Zusage") cur.zusage += 1;
    else if (row.rsvp_status === "Absage") cur.absage += 1;
    else if (row.rsvp_status === "Via Online") cur.viaOnline += 1;
    result[row.event_id] = cur;
  }
  return result;
}
