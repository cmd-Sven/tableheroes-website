import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCampaignAccess } from "../campaign-access";
import { getCampaignShops, getCampaignNpcsForMerchantAssignment } from "../shop-queries";
import { CampaignShopsManager } from "@/src/components/dashboard/campaigns/CampaignShopsManager";
import { CampaignMerchantAssignment } from "@/src/components/dashboard/campaigns/CampaignMerchantAssignment";
import { ShopArchetypeCatalogBrowser } from "@/src/components/dashboard/campaigns/ShopArchetypeCatalogBrowser";
import { DndCoinIcon } from "@/src/components/currency/DndCoinDisplay";
import {
  DND_COIN_TYPES,
  SHOP_ARCHETYPES,
} from "@/src/lib/shop-archetypes";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignShopsPage({ params }: Props) {
  const { id: campaignId } = await params;
  const { isGM } = await getCampaignAccess(campaignId);
  if (!isGM) redirect(`/dashboard/campaigns/${campaignId}`);

  const { shops, loadError } = await getCampaignShops(campaignId);
  const merchantNpcs = await getCampaignNpcsForMerchantAssignment(campaignId);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link
        href={`/dashboard/campaigns/${campaignId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kampagne
      </Link>

      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Shops und Handel
        </h1>
        <p className="mt-3 max-w-3xl font-libre text-gray-200 leading-relaxed">
          Hier legst du Händler und Läden für diese Kampagne an.{" "}
          <strong className="font-libre text-gray-100">Archetyp</strong> bezieht
          die Waren aus dem{" "}
          <strong className="font-libre text-gray-100">Standardkatalog</strong>{" "}
          unten (z. B. Waffenmeister, Rüstungsschmied, Alchemist) plus
          optionalem Preismodifikator in Prozent.{" "}
          <strong className="font-libre text-gray-100">Unique</strong> ist ein
          eigener Warenkatalog mit frei definierbaren Positionen (Item-Editor).
        </p>
      </div>

      <ShopArchetypeCatalogBrowser />

      <div className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Währung (D&amp;D 5e)
        </h2>
        <p className="font-libre text-sm text-gray-300 leading-relaxed mb-3">
          Offizielles Münzsystem des Spielerhandbuchs — Umtausch wie in D&amp;D 5e:
          1 Platin = 10 Gold = 100 Silber = 1.000 Kupfer; 1 Elektrum = 5 Silber.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 font-libre text-sm text-gray-200">
          {DND_COIN_TYPES.map((c) => (
            <li key={c.code} className="inline-flex items-center gap-2">
              <DndCoinIcon code={c.code} size="sm" />
              <span className="text-gray-500">{c.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Shop-Typen (Archetypen)
        </h2>
        <p className="font-libre text-sm text-gray-300 mb-4">
          Diese elf Typen stehen für Archetyp-Shops zur Auswahl:
        </p>
        <ul className="flex flex-wrap gap-2">
          {SHOP_ARCHETYPES.map((a) => (
            <li
              key={a.key}
              className="rounded border border-hero-border/50 bg-background-dark px-3 py-1 font-barlow text-xs font-bold uppercase text-gray-300"
            >
              {a.label}
            </li>
          ))}
        </ul>
      </div>

      {loadError ? (
        <div
          className="rounded border border-amber-600/50 bg-amber-950/30 p-4 font-libre text-sm text-amber-200"
          role="alert"
        >
          Shops konnten nicht geladen werden. Hast du die Supabase-Migration
          für <code className="text-amber-100">campaign_shops</code>{" "}
          ausgeführt?
        </div>
      ) : null}

      <CampaignShopsManager campaignId={campaignId} shops={shops} />

      <CampaignMerchantAssignment
        campaignId={campaignId}
        shops={shops}
        npcs={merchantNpcs}
      />
    </div>
  );
}
