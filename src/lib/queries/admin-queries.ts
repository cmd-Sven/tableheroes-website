import { createClient } from "@/src/lib/supabase/server";

const SITE_SETTINGS_KEY_MAINTENANCE = "maintenance_mode";

/** Kein "use server" – für Dashboard-Layout / RSC. */
export async function getMaintenanceStatus(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await (supabase.from("site_settings") as any)
    .select("value")
    .eq("key", SITE_SETTINGS_KEY_MAINTENANCE)
    .maybeSingle();
  const value = (data as any)?.value;
  return value === "true" || value === true;
}
