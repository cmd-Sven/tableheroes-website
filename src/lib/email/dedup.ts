import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailNotificationKind } from "@/src/lib/email/notification-preferences";

export async function hasEmailNotificationBeenSent(
  supabase: SupabaseClient,
  userId: string,
  notificationType: EmailNotificationKind,
  referenceKey: string,
): Promise<boolean> {
  const { data } = await (supabase as any)
    .from("email_notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("notification_type", notificationType)
    .eq("reference_key", referenceKey)
    .maybeSingle();

  return Boolean(data);
}

export async function markEmailNotificationSent(
  supabase: SupabaseClient,
  userId: string,
  notificationType: EmailNotificationKind,
  referenceKey: string,
): Promise<void> {
  const { error } = await (supabase as any).from("email_notification_log").insert({
    user_id: userId,
    notification_type: notificationType,
    reference_key: referenceKey,
  });

  if (error && !String(error.message ?? "").includes("duplicate")) {
    console.error("[email] log insert failed", error);
  }
}
