import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import {
  CharacterCard,
  type CharacterCardData,
} from "@/src/app/dashboard/characters/CharacterCard";

export default async function MyCharactersPage() {
  const supabase = await createClient();

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

  const { data: characters, error } = await supabase
    .from("characters")
    .select(
      `
      id,
      name,
      status,
      level,
      class,
      race,
      biography,
      campaigns (
        id,
        name,
        system
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching characters:", error);
  }

  const characterList = (characters || []) as Array<{
    id: string;
    name: string;
    status: string | null;
    level: number;
    class: string;
    race: string;
    biography: string | null;
    campaigns: { id: string; name: string; system: string | null } | null;
  }>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant mb-2">
          Meine Charaktere
        </h1>
        <p className="font-libre text-gray-400">
          Übersicht aller deiner Charaktere über alle Kampagnen hinweg.
        </p>
      </div>

      {characterList.length === 0 ? (
        <div className="rounded-lg border border-hero-dark bg-background-card p-12 text-center">
          <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="font-barlow font-bold text-xl text-white uppercase mb-2">
            Noch keine Charaktere
          </h2>
          <p className="font-libre text-gray-400 mb-6">
            Du hast noch keine Charaktere erstellt. Tritt einer Kampagne bei und
            erstelle deinen ersten Helden!
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
          {characterList.map((char) => {
            const cardData: CharacterCardData = {
              id: char.id,
              name: char.name,
              status: char.status,
              level: char.level ?? 1,
              class: char.class ?? "",
              race: char.race ?? "",
              biography: char.biography ?? null,
              campaign: char.campaigns
                ? {
                    id: char.campaigns.id,
                    name: char.campaigns.name,
                    system: char.campaigns.system ?? null,
                  }
                : null,
            };
            return (
              <CharacterCard
                key={char.id}
                character={cardData}
                allowDelete={true}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
