import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CreateLorePage({ params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;

  if (!campaign) redirect("/dashboard");
  if (campaign.gm_id !== user.id) redirect(`/dashboard/campaigns/${campaignId}`);

  // GM erstellt Lore nur in der Welt-Verwaltung → Redirect zu worlds/[worldId]/lore/new
  if (campaign.world_id) {
    redirect(`/dashboard/worlds/${campaign.world_id}/lore/new`);
  }

  redirect(`/dashboard/campaigns/${campaignId}?tab=lore`);
}



