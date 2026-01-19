import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoreForm } from "@/src/components/dashboard/campaigns/lore/LoreForm";
import { getLoreEntries } from "../../lore-actions";
import { getWorldByCampaign } from "../../world-actions";
import { WorldContextSidebar } from "@/src/components/dashboard/campaigns/world/WorldContextSidebar";

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

  // 2. Check if user is GM
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign) redirect("/dashboard");
  if (campaign.gm_id !== user.id) redirect(`/dashboard/campaigns/${campaignId}`);

  // 3. Load world for this campaign
  let world = null;
  try {
    world = await getWorldByCampaign(campaignId);
  } catch (error) {
    console.error("Error fetching world:", error);
  }

  if (!world) {
    redirect(`/dashboard/campaigns/${campaignId}?tab=lore`);
  }

  // 4. Load all lore entries for parent dropdown
  const loreEntries = await getLoreEntries(campaignId);
  const parentOptions = (loreEntries || []).map((entry: any) => ({
    id: entry.id,
    name: entry.name,
    type: entry.type,
  }));

  return (
    <div className="container mx-auto p-6">
      <div className="flex gap-6 max-w-7xl mx-auto">
        {/* Main Content */}
        <div className="flex-1">
          <LoreForm 
            campaignId={campaignId} 
            parentOptions={parentOptions}
            world={{ id: (world as any).id, name: (world as any).name }}
          />
        </div>
        {/* World Context Sidebar */}
        <div className="hidden lg:block">
          <WorldContextSidebar world={world} />
        </div>
      </div>
    </div>
  );
}



