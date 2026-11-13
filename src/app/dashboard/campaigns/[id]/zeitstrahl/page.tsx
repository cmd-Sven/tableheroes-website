import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { getCampaignAccess } from "../campaign-access";
import { parseWorldChronicle } from "@/src/lib/world/chronicle";
import { WorldChronicleTimeline } from "@/src/components/worlds/WorldChronicleTimeline";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CampaignZeitstrahlPage({ params }: Props) {
  const { id } = await params;
  const access = await getCampaignAccess(id);
  const supabase = await createClient();

  let chronicle = null;
  if (access.worldId) {
    const { data: world } = await (supabase.from("worlds") as any)
      .select("blueprint")
      .eq("id", access.worldId)
      .single();
    chronicle = parseWorldChronicle(world?.blueprint);
  }

  const worldName = access.world?.name ?? "dieser Welt";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link
        href={`/dashboard/campaigns/${id}?tab=overview`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kampagne
      </Link>
      {chronicle ? (
        <WorldChronicleTimeline
          chronicle={chronicle}
          worldName={worldName}
          loreBasePath={`/dashboard/campaigns/${id}/lore`}
        />
      ) : (
        <p className="font-libre text-gray-300">
          {access.worldId
            ? `Für ${worldName} ist noch keine Weltrechnung hinterlegt.`
            : "Diese Kampagne hat noch keine Welt. Der Zeitstrahl braucht eine Welt mit Jahresrechnung."}
        </p>
      )}
    </div>
  );
}
