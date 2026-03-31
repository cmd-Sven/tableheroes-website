import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCampaignAccess } from "../campaign-access";
import { getCampaignShops } from "../shop-queries";
import { CampaignShopsManager } from "@/src/components/dashboard/campaigns/CampaignShopsManager";
import { ShopArchetypeCatalogBrowser } from "@/src/components/dashboard/campaigns/ShopArchetypeCatalogBrowser";
import {
  KASSANDRA_COINS,
  SHOP_ARCHETYPES,
} from "@/src/lib/shop-archetypes";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignShopsPage({ params }: Props) {
  const { id: campaignId } = await params;
  const { isGM } = await getCampaignAccess(campaignId);
  if (!isGM) redirect(`/dashboard/campaigns/${campaignId}`);

  const { shops, loadError } = await getCampaignShops(campaignId);

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
          eigener Katalog mit frei definierbaren Positionen (Erweiterung folgt).
        </p>
      </div>

      <ShopArchetypeCatalogBrowser />

      <div className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Währung (Kassandra)
        </h2>
        <p className="font-libre text-sm text-gray-300 leading-relaxed mb-3">
          Für Anzeige und spätere Buchungen: D&amp;D-Münzen mit
          Kassandra-Namen.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 font-libre text-sm text-gray-200">
          {KASSANDRA_COINS.map((c) => (
            <li key={c.code}>
              <span className="text-accent-gold">{c.name}</span>
              <span className="text-gray-500"> — {c.dnd}</span>
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
    </div>
  );
}
