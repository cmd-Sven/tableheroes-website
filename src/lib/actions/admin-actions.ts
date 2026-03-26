"use server";

import { createClient, createAdminClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getMaintenanceStatus } from "@/src/lib/queries/admin-queries";

const SITE_SETTINGS_KEY_MAINTENANCE = "maintenance_mode";

/** Schaltet den Wartungsmodus um. Nur Admins. */
export async function toggleMaintenanceMode(): Promise<{
  success: boolean;
  error?: string;
  enabled?: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if ((profile as any)?.primary_role !== "Admin") {
    return {
      success: false,
      error: "Nur Admins können den Wartungsmodus ändern.",
    };
  }

  const current = await getMaintenanceStatus();
  const nextValue = !current;

  const { error: upsertError } = await (
    supabase.from("site_settings") as any
  ).upsert(
    { key: SITE_SETTINGS_KEY_MAINTENANCE, value: String(nextValue) },
    { onConflict: "key" }
  );

  if (upsertError) return { success: false, error: upsertError.message };
  revalidatePath("/dashboard", "layout");
  return { success: true, enabled: nextValue };
}

/** Nutzer mit Status 'pending'. Nur Admins. */
export async function getPendingUsers(): Promise<
  {
    id: string;
    email: string | null;
    username: string | null;
    status: string;
    created_at: string | null;
  }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if ((profile as any)?.primary_role !== "Admin") return [];

  const { data, error } = await (supabase.from("users") as any)
    .select("id, email, username, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as any[]) || [];
}

/** Lädt alle Nutzer für die Admin-Übersicht (pending/approved). Nur Admins. */
export async function getAllUsersForAdmin(): Promise<
  {
    id: string;
    email: string | null;
    username: string | null;
    status: string;
    primary_role: string | null;
    role: string | null;
    created_at: string | null;
    experience_level: string | null;
    previous_games: string | null;
    motivation: string | null;
    codex_agreed: boolean | null;
  }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if ((profile as any)?.primary_role !== "Admin") return [];

  const { data, error } = await (supabase.from("users") as any)
    .select(
      "id, email, username, status, primary_role, role, created_at, experience_level, previous_games, motivation, codex_agreed"
    )
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as any[]) || [];
}

/** Setzt User-Status auf 'approved'. Nur Admins. */
export async function approveUser(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log("Updating User Status to approved for ID:", userId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if ((profile as any)?.primary_role !== "Admin") {
    return { success: false, error: "Nur Admins können Nutzer freigeben." };
  }

  const { error } = await (supabase.from("users") as any)
    .update({ status: "approved" })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

/** Setzt User-Status zurück auf 'pending' (Sperren). Nur Admins. */
export async function setUserPending(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if ((profile as any)?.primary_role !== "Admin") {
    return {
      success: false,
      error: "Nur Admins können Nutzer sperren.",
    };
  }

  const { error } = await (supabase.from("users") as any)
    .update({ status: "pending" })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

/** Setzt User-Status auf 'rejected'. Nur Admins. */
export async function rejectUser(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if ((profile as any)?.primary_role !== "Admin") {
    return { success: false, error: "Nur Admins können Nutzer ablehnen." };
  }

  const { error } = await (supabase.from("users") as any)
    .update({ status: "rejected" })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

/**
 * Löscht einen Nutzer inkl. Kampagnenmitgliedschaften, Charakteren, Nachrichten und Auth-Account.
 * Erfordert SUPABASE_SERVICE_ROLE_KEY (Service-Role). Nur Admins.
 */
export async function deleteUser(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  if (user.id === userId) {
    return { success: false, error: "Du kannst deinen eigenen Account hier nicht löschen." };
  }

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if ((profile as any)?.primary_role !== "Admin") {
    return { success: false, error: "Nur Admins können Nutzer löschen." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return {
      success: false,
      error:
        "Vollständiges Löschen ist nicht möglich: SUPABASE_SERVICE_ROLE_KEY fehlt in der Server-Umgebung.",
    };
  }

  const { data: gmCampaigns } = await (admin.from("campaigns") as any)
    .select("id")
    .eq("gm_id", userId)
    .limit(1);
  if (gmCampaigns && (gmCampaigns as any[]).length > 0) {
    return {
      success: false,
      error:
        "Dieser Nutzer ist noch Spielleiter mindestens einer Kampagne. Bitte zuerst Kampagnen löschen oder einen anderen GM setzen.",
    };
  }

  const { data: gmWorlds } = await (admin.from("worlds") as any)
    .select("id")
    .eq("gm_id", userId)
    .limit(1);
  if (gmWorlds && (gmWorlds as any[]).length > 0) {
    return {
      success: false,
      error:
        "Dieser Nutzer besitzt noch mindestens eine Welt. Bitte zuerst Welten löschen oder übertragen.",
    };
  }

  const { data: charRows } = await (admin.from("characters") as any)
    .select("id")
    .eq("user_id", userId);
  const charIds = ((charRows as any[]) || []).map((c: { id: string }) => c.id);

  /** Optionale Tabellen – Fehler nur loggen (z. B. leere Ergebnisse oder fehlende Tabelle in älteren DBs). */
  const tryDelete = async (label: string, fn: () => Promise<{ error: { message?: string } | null }>) => {
    const { error } = await fn();
    if (error?.message) {
      console.warn(`[deleteUser] ${label}:`, error.message);
    }
  };

  await tryDelete("session_rsvps", async () =>
    (admin.from("session_rsvps") as any).delete().eq("user_id", userId)
  );

  await tryDelete("messages", async () =>
    (admin.from("messages") as any)
      .delete()
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
  );

  if (charIds.length > 0) {
    await tryDelete("character_relationships", async () =>
      (admin.from("character_relationships") as any)
        .delete()
        .in("character_id", charIds)
    );
  }

  await tryDelete("user_achievements", async () =>
    (admin.from("user_achievements") as any).delete().eq("user_id", userId)
  );

  await tryDelete("points_log", async () =>
    (admin.from("points_log") as any).delete().eq("user_id", userId)
  );

  const { error: cmErr } = await (admin.from("campaign_members") as any)
    .delete()
    .eq("user_id", userId);
  if (cmErr) {
    console.error("[deleteUser] campaign_members", cmErr);
    return {
      success: false,
      error: `Kampagnenmitgliedschaften konnten nicht entfernt werden: ${cmErr.message}`,
    };
  }

  const { error: chErr } = await (admin.from("characters") as any)
    .delete()
    .eq("user_id", userId);
  if (chErr) {
    console.error("[deleteUser] characters", chErr);
    return {
      success: false,
      error: `Charaktere konnten nicht gelöscht werden: ${chErr.message}`,
    };
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    console.error("[deleteUser] auth.admin.deleteUser", authErr);
    const { error: usersErr } = await (admin.from("users") as any)
      .delete()
      .eq("id", userId);
    if (usersErr) {
      return {
        success: false,
        error: `Auth-Löschen fehlgeschlagen (${authErr.message}). Profil konnte nicht bereinigt werden: ${usersErr.message}`,
      };
    }
    return {
      success: false,
      error: `Auth-Account konnte nicht gelöscht werden: ${authErr.message}. Profil-Datensatz wurde entfernt.`,
    };
  }

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
