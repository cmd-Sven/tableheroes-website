import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCampaignAccess } from "../../campaign-access";
import { getCampaignShopWithItems } from "../../shop-queries";
import { UniqueShopItemEditor } from "@/src/components/dashboard/campaigns/UniqueShopItemEditor";

type Props = { params: Promise<{ id: string; shopId: string }> };

export default async function CampaignUniqueShopPage({ params }: Props) {
  const { id: campaignId, shopId } = await params;
  const { isGM } = await getCampaignAccess(campaignId);
  if (!isGM) redirect(`/dashboard/campaigns/${campaignId}`);

  const { shop, items, loadError } = await getCampaignShopWithItems(campaignId, shopId);
  if (!shop) notFound();
  if (shop.shop_mode !== "unique") {
    redirect(`/dashboard/campaigns/${campaignId}/shops`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href={`/dashboard/campaigns/${campaignId}/shops`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Shops
      </Link>

      <div>
        <p className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
          Unique-Shop
        </p>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          {shop.name}
        </h1>
        {shop.notes ? (
          <p className="mt-3 max-w-3xl font-libre text-gray-300 leading-relaxed">{shop.notes}</p>
        ) : (
          <p className="mt-3 font-libre text-sm text-gray-400">
            Eigener Warenkatalog — Items erscheinen in der Live-Session, wenn ein verknüpfter Händler-NPC geöffnet wird.
          </p>
        )}
      </div>

      {loadError ? (
        <div
          className="rounded border border-amber-600/50 bg-amber-950/30 p-4 font-libre text-sm text-amber-200"
          role="alert"
        >
          Items konnten nicht geladen werden.
        </div>
      ) : null}

      <div className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-6">
          Warenkatalog bearbeiten
        </h2>
        <UniqueShopItemEditor campaignId={campaignId} shopId={shopId} initialItems={items} />
      </div>
    </div>
  );
}
