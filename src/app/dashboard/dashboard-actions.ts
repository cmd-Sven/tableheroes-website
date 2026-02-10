"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { LayoutItem } from "@/src/lib/utils/layout-engine";

/** Speichert das Dashboard-Layout (id, x_pos, y_pos, width) in der DB (JSONB). */
export async function updateDashboardLayout(layout: LayoutItem[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const payload = layout.map(({ id, x_pos, y_pos, width }) => ({ id, x_pos, y_pos, width }));

  const { error } = await (supabase.from("users") as any)
    .update({ dashboard_layout: payload })
    .eq("id", user.id);

  if (error) throw new Error(error.message || "Layout konnte nicht gespeichert werden.");
  revalidatePath("/dashboard");
}

export async function updatePrivacyPublicProfile(publicProfile: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const { error } = await (supabase.from("users") as any)
    .update({ privacy_public_profile: publicProfile })
    .eq("id", user.id);

  if (error) throw new Error(error.message || "Einstellung konnte nicht gespeichert werden.");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/profile/[username]", "page");
}
