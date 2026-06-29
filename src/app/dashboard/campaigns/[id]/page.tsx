import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import { getCampaignDiscordSettings } from "./campaign-discord-actions";
import { getCampaignFoundrySyncSettings } from "./foundry-sync-actions";
import { loadCampaignDetailPageData } from "./campaign-detail-load";
import { CampaignDetailPageContent } from "./CampaignDetailPageContent";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("🔍 [DashboardPage] Current User:", user?.id, user?.email);

  if (!user) return null;

  const data = await loadCampaignDetailPageData(id, user.id);

  const [discordSettings, foundrySyncSettings] = data.isGM
    ? await Promise.all([
        getCampaignDiscordSettings(id).then(
          (settings) =>
            settings ?? {
              webhookUrl: "",
              notificationsEnabled: true,
              configured: false,
            },
        ),
        getCampaignFoundrySyncSettings(id),
      ])
    : [null, null];

  return (
    <CampaignDetailPageContent
      campaignId={id}
      tab={tab}
      data={data}
      discordSettings={discordSettings}
      foundrySyncSettings={foundrySyncSettings}
    />
  );
}
