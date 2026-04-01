import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, MapPin, PawPrint } from "lucide-react";

type Props = {
  campaignId: string;
  name: string;
  bannerUrl: string | null;
  isGm: boolean;
};

/**
 * Immer sichtbarer Kontext unterhalb der globalen Sidebar:
 * in welcher Kampagne der Nutzer gerade arbeitet (alle Routen unter /campaigns/[id]/…).
 */
export function CampaignScopeBanner({
  campaignId,
  name,
  bannerUrl,
  isGm,
}: Props) {
  const hubHref = `/dashboard/campaigns/${campaignId}`;
  const bestariumHref = `/dashboard/campaigns/${campaignId}/bestarium`;

  return (
    <header
      className="sticky top-0 z-30 -mx-6 md:-mx-10 mb-6 border-b border-hero-border bg-background-card/95 shadow-md backdrop-blur-md supports-[backdrop-filter]:bg-background-card/90"
      aria-label="Aktiver Kampagnenkontext"
    >
      <div className="flex flex-wrap items-center gap-3 px-6 md:px-10 py-3">
        <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded border border-hero-dark bg-slate-900">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
              unoptimized={
                bannerUrl.startsWith("http://") || bannerUrl.startsWith("https://")
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-hero-dark/40">
              <MapPin className="h-5 w-5 text-hero-vibrant" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Aktive Kampagne
          </p>
          <p
            className="truncate font-barlow text-lg font-extrabold uppercase tracking-wide text-hero-vibrant md:text-xl"
            title={name}
          >
            {name}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide ${
              isGm
                ? "border border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
                : "border border-hero-border bg-hero-dark/40 text-gray-300"
            }`}
          >
            {isGm ? "Spielleitung" : "Spieler"}
          </span>
          <Link
            href={hubHref}
            className="inline-flex items-center gap-1.5 rounded border border-hero-border bg-hero-dark/50 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant transition-colors hover:border-hero-vibrant hover:bg-hero-dark"
          >
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            Kampagnenzentrale
          </Link>
          <Link
            href={bestariumHref}
            className="inline-flex items-center gap-1.5 rounded border border-hero-border bg-hero-dark/50 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant transition-colors hover:border-hero-vibrant hover:bg-hero-dark"
          >
            <PawPrint className="h-3.5 w-3.5" aria-hidden />
            Bestarium
          </Link>
          <Link
            href="/dashboard/my-campaigns"
            className="inline-flex items-center gap-1.5 rounded border border-transparent px-2 py-1.5 font-barlow text-xs font-bold uppercase text-gray-400 transition-colors hover:text-accent-white"
          >
            Alle Kampagnen
          </Link>
        </div>
      </div>
    </header>
  );
}
