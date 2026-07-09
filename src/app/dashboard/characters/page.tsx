import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import {
  CharacterCard,
  type CharacterCardData,
} from "@/src/app/dashboard/characters/CharacterCard";
import { evaluateCharacterDeletionState } from "@/src/lib/characters/character-deletion";

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

  const { data: charactersRaw, error } = await (supabase.from("characters") as any)
    .select("id, name, status, level, class, race, biography, campaign_id, sheet_data")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching characters:", error);
  }

  const chars = (charactersRaw as any[]) || [];
  const campaignIds = [...new Set(chars.map((c: any) => c.campaign_id).filter(Boolean))];
  let campaignMap = new Map<string, { id: string; name: string; system: string | null }>();
  if (campaignIds.length > 0) {
    const { data: campRows } = await (supabase.from("campaigns") as any)
      .select("id, name, system")
      .in("id", campaignIds);
    campaignMap = new Map(
      ((campRows as any[]) || []).map((c: any) => [
        c.id,
        { id: c.id, name: c.name ?? "", system: c.system ?? null },
      ]),
    );
  }

  const { data: memberRows } = await (supabase.from("campaign_members") as any)
    .select("campaign_id, character_id, status")
    .eq("user_id", user.id);

  const memberByCampaign = new Map<string, { character_id?: string | null; status?: string | null }>();
  for (const row of (memberRows as any[]) ?? []) {
    memberByCampaign.set(String(row.campaign_id), row);
  }

  const characterList = chars
    .map((char: any) => {
      const member = char.campaign_id
        ? memberByCampaign.get(String(char.campaign_id)) ?? null
        : null;
      const deletion = evaluateCharacterDeletionState(
        { id: String(char.id), status: char.status, campaign_id: char.campaign_id },
        member,
      );
      return {
        id: char.id,
        name: char.name,
        status: char.status,
        level: char.level ?? 1,
        class: char.class ?? "",
        race: char.race ?? "",
        biography: char.biography ?? null,
        isCampaignLinked: deletion.isCampaignLinked,
        canDelete: deletion.canDelete,
        deleteBlockedReason: deletion.reason,
        hasSheet: char.sheet_data != null,
        campaigns: char.campaign_id ? campaignMap.get(char.campaign_id) ?? null : null,
      };
    })
    .sort((a, b) => {
      if (a.isCampaignLinked !== b.isCampaignLinked) {
        return a.isCampaignLinked ? -1 : 1;
      }
      return String(a.name).localeCompare(String(b.name), "de");
    });

  const activeCount = characterList.filter((c) => c.isCampaignLinked).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant mb-2">
          Meine Charaktere
        </h1>
        <p className="font-libre text-gray-400">
          Übersicht aller deiner Charaktere über alle Kampagnen hinweg.
          {activeCount > 0 ? (
            <span className="text-hero-vibrant">
              {" "}
              {activeCount} aktive{activeCount === 1 ? "r" : ""} Held
              {activeCount === 1 ? "" : "en"} in Kampagnen.
            </span>
          ) : null}
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
              isCampaignLinked: char.isCampaignLinked,
              canDelete: char.canDelete,
              deleteBlockedReason: char.deleteBlockedReason,
              hasSheet: char.hasSheet,
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
                allowDelete={char.canDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
