import { notFound } from "next/navigation";
import { LiveLitePlayerBoard } from "@/src/components/live-lite/LiveLitePlayerBoard";

const CAMPAIGN_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  params: Promise<{ campaignId: string }>;
};

export default async function LiveLitePlayerPage({ params }: Props) {
  const { campaignId } = await params;
  if (!CAMPAIGN_ID.test(campaignId)) notFound();
  return <LiveLitePlayerBoard campaignId={campaignId} />;
}
