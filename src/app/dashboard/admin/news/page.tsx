import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getAllNewsPosts,
  getNewsImageFilenames,
} from "@/src/lib/actions/news-actions";
import { getDiscordPlatformNewsWebhook } from "@/src/lib/actions/discord-platform-actions";
import { DiscordPlatformSettings } from "@/src/components/dashboard/admin/DiscordPlatformSettings";
import { AdminNewsClient } from "./AdminNewsClient";

export default async function AdminNewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .single();

  const role = (profile as { primary_role?: string; is_super_admin?: boolean } | null)?.primary_role;
  const isSuperAdmin = (profile as { primary_role?: string; is_super_admin?: boolean } | null)?.is_super_admin;
  if (role !== "Admin" && !isSuperAdmin) {
    redirect("/dashboard");
  }

  const [posts, imageFilenames, platformDiscordWebhook] = await Promise.all([
    getAllNewsPosts(),
    getNewsImageFilenames(),
    getDiscordPlatformNewsWebhook(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          News verwalten
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Plattform-News erstellen, bearbeiten und auf Dashboard bzw.
          Landingpage anzeigen.
        </p>
      </div>
      <DiscordPlatformSettings initialWebhookUrl={platformDiscordWebhook} />
      <AdminNewsClient initialPosts={posts} imageOptions={imageFilenames} />
    </div>
  );
}
