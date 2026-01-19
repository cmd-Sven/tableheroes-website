import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { Shield, User, Skull, Heart, Archive, Pause, ArrowRight } from "lucide-react";

export default async function MyCharactersPage() {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-libre text-gray-400">Bitte melde dich an.</p>
      </div>
    );
  }

  // 2. Fetch all characters for this user
  const { data: characters, error } = await supabase
    .from("characters")
    .select(
      `
      *,
      campaigns (
        id,
        name,
        system
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching characters:", error);
  }

  const characterList = characters || [];

  // Helper function to get status badge
  const getStatusBadge = (status: string | null | undefined) => {
    const statusValue = status || "Alive";
    const isAlive = statusValue === "Alive";
    const isDead = statusValue === "Dead";
    const isArchived = statusValue === "Archived";
    const isPaused = statusValue === "Paused";

    let bgColor = "bg-green-900/30";
    let textColor = "text-green-400";
    let borderColor = "border-green-700";
    let icon = <Heart className="h-3.5 w-3.5" />;
    let label = "Lebend";

    if (isDead) {
      bgColor = "bg-red-900/30";
      textColor = "text-red-400";
      borderColor = "border-red-700";
      icon = <Skull className="h-3.5 w-3.5" />;
      label = "Tot";
    } else if (isArchived) {
      bgColor = "bg-gray-700/30";
      textColor = "text-gray-400";
      borderColor = "border-gray-600";
      icon = <Archive className="h-3.5 w-3.5" />;
      label = "Archiviert";
    } else if (isPaused) {
      bgColor = "bg-yellow-900/30";
      textColor = "text-yellow-400";
      borderColor = "border-yellow-700";
      icon = <Pause className="h-3.5 w-3.5" />;
      label = "Pausiert";
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-barlow font-bold uppercase text-xs border ${bgColor} ${textColor} ${borderColor}`}
      >
        {icon}
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant mb-2">
          Meine Charaktere
        </h1>
        <p className="font-libre text-gray-400">
          Übersicht aller deiner Charaktere über alle Kampagnen hinweg.
        </p>
      </div>

      {/* Character Grid */}
      {characterList.length === 0 ? (
        <div className="rounded-lg border border-hero-dark bg-background-card p-12 text-center">
          <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="font-barlow font-bold text-xl text-white uppercase mb-2">
            Noch keine Charaktere
          </h2>
          <p className="font-libre text-gray-400 mb-6">
            Du hast noch keine Charaktere erstellt. Tritt einer Kampagne bei und erstelle deinen ersten Helden!
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-6 py-3 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
          >
            Zu den Kampagnen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {characterList.map((character: any) => {
            const campaign = character.campaigns;
            const status = character.status || "Alive";

            return (
              <div
                key={character.id}
                className="rounded-lg border border-hero-dark bg-background-card p-6 hover:border-hero-vibrant transition-colors"
              >
                {/* Character Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant flex-1">
                      {character.name}
                    </h3>
                    {getStatusBadge(status)}
                  </div>

                  {/* Level, Class, Race */}
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="inline-flex items-center gap-1 rounded bg-hero-dark px-2 py-1 font-barlow font-bold text-xs text-white">
                      <Shield className="h-3 w-3 text-accent-gold" />
                      Lvl {character.level || 1}
                    </span>
                    <span className="font-libre text-sm text-gray-300">
                      {character.class}
                    </span>
                    <span className="font-libre text-sm text-gray-400">
                      {character.race}
                    </span>
                  </div>
                </div>

                {/* Campaign Link */}
                {campaign && (
                  <div className="pt-4 border-t border-hero-border/30">
                    <p className="font-libre text-xs text-gray-500 mb-1">
                      Gespielt in:
                    </p>
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}?tab=character`}
                      className="inline-flex items-center gap-1.5 font-libre text-sm text-hero-vibrant hover:text-white transition-colors group"
                    >
                      <span>{campaign.name}</span>
                      {campaign.system && (
                        <span className="text-gray-500">({campaign.system})</span>
                      )}
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </div>
                )}

                {/* Biography Preview (if exists) */}
                {character.biography && (
                  <div className="pt-4 border-t border-hero-border/30 mt-4">
                    <p className="font-libre text-xs text-gray-500 mb-1">
                      Hintergrund:
                    </p>
                    <p className="font-libre text-sm text-gray-400 line-clamp-2">
                      {character.biography}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



