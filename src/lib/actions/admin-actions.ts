"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

const SITE_SETTINGS_KEY_MAINTENANCE = "maintenance_mode";

/** Liest den Wartungsmodus aus site_settings (Key: maintenance_mode). */
export async function getMaintenanceStatus(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await (supabase.from("site_settings") as any)
    .select("value")
    .eq("key", SITE_SETTINGS_KEY_MAINTENANCE)
    .maybeSingle();
  const value = (data as any)?.value;
  return value === "true" || value === true;
}

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
    .select("id, email, username, status, primary_role, role, created_at")
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

/** Löscht einen User aus der users-Tabelle. Nur Admins. (Auth-User muss ggf. separat gelöscht werden.) */
export async function deleteUser(userId: string): Promise<{
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
    return { success: false, error: "Nur Admins können Nutzer löschen." };
  }

  const { error } = await (supabase.from("users") as any)
    .delete()
    .eq("id", userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}
