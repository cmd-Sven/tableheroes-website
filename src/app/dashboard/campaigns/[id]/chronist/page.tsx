import { redirect } from "next/navigation";
import { getCampaignAccess } from "../campaign-access";
import { ChronicleDashboard } from "@/src/components/dashboard/campaigns/ChronicleDashboard";
import { loadCampaignChronicleOverview } from "@/src/lib/session-chronicle/campaign-chronicle-load";
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import { getNPCs } from "../npc-queries";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignChronistPage({ params }: Props) {
  const { id: campaignId } = await params;
  const { isGM, worldId, userId } = await getCampaignAccess(campaignId);
  if (!isGM) redirect(`/dashboard/campaigns/${campaignId}`);

  const [rows, npcs] = await Promise.all([
    loadCampaignChronicleOverview(campaignId),
    getNPCs(campaignId, userId, true),
  ]);

  const npcNames = (npcs ?? []).map((npc: { id: string; name: string }) => ({
    id: String(npc.id),
    name: String(npc.name),
  }));

  return (
    <div className="container mx-auto p-6">
      <ChronicleDashboard
        campaignId={campaignId}
        worldId={worldId}
        npcNames={serializeForClient(npcNames) as typeof npcNames}
        rows={serializeForClient(rows) as typeof rows}
      />
    </div>
  );
}
