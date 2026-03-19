import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { getLocationById, getNPCsByLocation, getLocationStats } from "../../location-actions";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, Home, MapPin } from "lucide-react";
import { MarkdownDisplay } from "@/src/components/ui/MarkdownDisplay";

type Props = {
  params: Promise<{ id: string; locationId: string }>;
};

export default async function LocationDetailPage({ params }: Props) {
  const { id: campaignId, locationId } = await params;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  // 2. Fetch Location
  const location = await getLocationById(locationId);

  if (!location) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // 3. Fetch NPCs
  const { residents, guests } = await getNPCsByLocation(campaignId, locationId);

  // 4. Fetch Location Stats (rekursive Zählung)
  let locationStats = null;
  try {
    locationStats = await getLocationStats(campaignId, locationId);
  } catch (error) {
    console.error("Fehler beim Laden der Location-Statistiken:", error);
    // Continue without stats
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/dashboard/campaigns/${campaignId}`}
            className="inline-flex items-center gap-2 text-hero-vibrant hover:text-hero-dark transition-colors font-barlow font-bold uppercase text-sm mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Kampagne
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
                {location.name}
              </h1>
              {location.type && (
                <p className="font-libre text-gray-400 text-lg mt-2">
                  {location.type}
                </p>
              )}
            </div>
            {/* Location Stats Badge */}
            {locationStats && (locationStats.totalResidents > 0 || locationStats.totalGuests > 0) && (
              <div className="flex items-center gap-2 rounded-lg border border-hero-border bg-background-card px-4 py-2">
                <Users className="h-5 w-5 text-accent-gold" />
                <div className="text-right">
                  <p className="font-barlow font-bold text-sm uppercase text-hero-vibrant">
                    Gesamtpopulation
                  </p>
                  <p className="font-libre text-gray-300 text-sm">
                    {locationStats.totalResidents + locationStats.totalGuests} NPCs in dieser Region
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {location.description && (
          <div className="rounded-lg border border-hero-border bg-background-card p-6 mb-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Beschreibung
            </h2>
            <MarkdownDisplay content={location.description} />
          </div>
        )}

        {/* Lore Link */}
        {location.lore_id && (location as any).lore && (
          <div className="rounded-lg border border-hero-border bg-background-card p-6 mb-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Verknüpfter Lore-Eintrag
            </h2>
            <Link
              href={`/dashboard/campaigns/${campaignId}/lore/${location.lore_id}`}
              className="inline-flex items-center gap-2 text-hero-vibrant hover:text-hero-dark transition-colors font-barlow font-bold"
            >
              {(location as any).lore.name} →
            </Link>
          </div>
        )}

        {/* Ansässige NPCs */}
        {residents.length > 0 && (
          <div className="rounded-lg border border-hero-border bg-background-card p-6 mb-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <Home className="h-6 w-6" />
              Ansässige NPCs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {residents.map((npc: any) => (
                <Link
                  key={npc.id}
                  href={`/dashboard/campaigns/${campaignId}/npcs/${npc.id}`}
                  className="group rounded-lg border border-hero-border bg-hero-dark/30 p-4 hover:bg-hero-dark/50 transition-colors"
                >
                  {npc.image_url ? (
                    <div className="relative w-full aspect-square mb-3 rounded overflow-hidden">
                      <Image
                        src={npc.image_url}
                        alt={npc.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square mb-3 rounded bg-hero-dark/50 flex items-center justify-center">
                      <Users className="h-12 w-12 text-gray-600" />
                    </div>
                  )}
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold group-hover:text-hero-vibrant transition-colors">
                    {npc.name}
                  </h3>
                  {npc.role && (
                    <p className="font-libre text-gray-400 text-sm mt-1">
                      {npc.role}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Aktuelle Gäste */}
        {guests.length > 0 && (
          <div className="rounded-lg border border-hero-border bg-background-card p-6 mb-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Aktuelle Gäste
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {guests.map((npc: any) => (
                <Link
                  key={npc.id}
                  href={`/dashboard/campaigns/${campaignId}/npcs/${npc.id}`}
                  className="group rounded-lg border border-hero-border bg-hero-dark/30 p-4 hover:bg-hero-dark/50 transition-colors"
                >
                  {npc.image_url ? (
                    <div className="relative w-full aspect-square mb-3 rounded overflow-hidden">
                      <Image
                        src={npc.image_url}
                        alt={npc.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square mb-3 rounded bg-hero-dark/50 flex items-center justify-center">
                      <Users className="h-12 w-12 text-gray-600" />
                    </div>
                  )}
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold group-hover:text-hero-vibrant transition-colors">
                    {npc.name}
                  </h3>
                  {npc.role && (
                    <p className="font-libre text-gray-400 text-sm mt-1">
                      {npc.role}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {residents.length === 0 && guests.length === 0 && (
          <div className="rounded-lg border border-hero-border bg-background-card p-6">
            <p className="font-libre text-gray-400 text-center">
              Keine NPCs an diesem Ort.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

