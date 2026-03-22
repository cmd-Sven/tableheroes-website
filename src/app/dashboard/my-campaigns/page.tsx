import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Map as MapIcon, Sword, Plus } from "lucide-react";
import Image from "next/image";

const GM_MAX_CAMPAIGNS = 3;

type MembershipWithGm = {
  campaign: {
    id: string;
    name: string;
    system: string | null;
    banner_url: string | null;
    gm_id: string | null;
  };
  character: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    avatar_url: string | null;
  } | null;
  gmName: string;
};

export default async function MyCampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as { primary_role?: string } | null;
  const isGM =
    profile?.primary_role === "GameMaster" || profile?.primary_role === "Admin";

  if (isGM) {
    const { data: campaignsRaw } = await (supabase.from("campaigns") as any)
      .select("id, name, system, banner_url")
      .eq("gm_id", user.id)
      .order("created_at", { ascending: false });
    const campaigns = (campaignsRaw as any[]) || [];

    const canCreateMore = campaigns.length < GM_MAX_CAMPAIGNS;

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
              Meine Kampagnen
            </h1>
            <p className="mt-2 font-libre text-gray-400">
              Kampagnen, die du als Spielleiter leitest (max. {GM_MAX_CAMPAIGNS}).
            </p>
          </div>
          {canCreateMore ? (
            <Link
              href="/dashboard/campaigns/new"
              className="shrink-0 inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white text-sm shadow-lg hover:bg-hero-vibrant hover:border-hero-vibrant transition-colors"
            >
              <Plus className="h-4 w-4" />
              Kampagne erstellen
            </Link>
          ) : (
            <span className="shrink-0 font-libre text-sm text-gray-500">
              Limit erreicht ({campaigns.length}/{GM_MAX_CAMPAIGNS})
            </span>
          )}
        </div>
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hero-dark bg-background-card/50 py-16 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border border-hero-border">
              <MapIcon className="h-8 w-8 text-hero-vibrant" />
            </div>
            <h3 className="mb-2 font-cinzel font-bold text-xl text-white">
              Noch keine Kampagnen
            </h3>
            <p className="max-w-sm font-libre text-gray-400 mb-6">
              Erstelle deine erste Kampagne und lade Spieler ein.
            </p>
            <Link
              href="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white text-sm hover:bg-hero-vibrant transition-colors"
            >
              Kampagne erstellen
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c: any) => (
              <Link
                key={c.id}
                href={`/dashboard/campaigns/${c.id}`}
                className="block rounded-md border border-hero-border bg-background-card overflow-hidden shadow-lg hover:border-hero-vibrant transition-colors group"
              >
                {c.banner_url ? (
                  <div className="relative h-32 w-full bg-hero-dark">
                    <Image
                      src={c.banner_url}
                      alt=""
                      fill
                      className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-hero-dark/50 flex items-center justify-center">
                    <MapIcon className="h-10 w-10 text-hero-vibrant/50" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-cinzel font-bold text-lg text-white mb-1 group-hover:text-accent-gold transition-colors truncate">
                    {c.name || "Unbenannt"}
                  </h3>
                  <p className="font-barlow font-bold text-gray-500 uppercase text-xs">
                    {c.system || "System offen"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { data: membershipsRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select("campaign_id, status, character_id, campaigns ( id, name, system, banner_url, gm_id )")
    .eq("user_id", user.id)
    .in("status", ["Accepted", "Approved"]);

  const memberships = (membershipsRaw as any[]) || [];
  let characterIds = [...new Set(memberships.map((m: any) => m.character_id).filter(Boolean))];

  // Fallback: Wenn character_id fehlt, Charakter aus characters (user_id + campaign_id) laden
  const membershipsWithoutChar = memberships.filter((m: any) => !m.character_id && m.campaign_id);
  if (membershipsWithoutChar.length > 0) {
    const campaignIds = [...new Set(membershipsWithoutChar.map((m: any) => m.campaign_id))];
    const { data: fallbackChars } = await (supabase.from("characters") as any)
      .select("id, name, class, race, level, avatar_url, campaign_id")
      .eq("user_id", user.id)
      .in("campaign_id", campaignIds)
      .in("status", ["Active", "Alive"]);
    for (const m of membershipsWithoutChar) {
      const char = (fallbackChars as any[])?.find((c: any) => c.campaign_id === m.campaign_id);
      if (char) {
        (m as any).character_id = char.id;
        characterIds.push(char.id);
      }
    }
    characterIds = [...new Set(characterIds)];
  }

  let characterMap = new Map<string, { id: string; name: string; class: string; race: string; level: number; avatar_url: string | null }>();
  if (characterIds.length > 0) {
    const { data: charRows } = await (supabase.from("characters") as any)
      .select("id, name, class, race, level, avatar_url")
      .in("id", characterIds);
    characterMap = new Map(
      ((charRows as any[]) || []).map((c: any) => [
        c.id,
        {
          id: c.id,
          name: c.name ?? "",
          class: c.class ?? "",
          race: c.race ?? "",
          level: c.level ?? 1,
          avatar_url: c.avatar_url ?? null,
        },
      ])
    );
  }
  const membershipsWithChars = memberships.map((m: any) => ({
    ...m,
    characters: m.character_id ? characterMap.get(m.character_id) ?? null : null,
  }));
  const gmIds = [
    ...new Set(memberships.map((m: any) => m.campaigns?.gm_id).filter(Boolean)),
  ];
  let gmById: Record<string, string> = {};
  if (gmIds.length > 0) {
    const { data: gmUsers } = await (supabase.from("users") as any)
      .select("id, username")
      .in("id", gmIds);
    gmById = Object.fromEntries(
      ((gmUsers as any[]) || []).map((u: any) => [
        u.id,
        u.username || "Spielleiter",
      ]),
    );
  }

  const membershipsWithGm: MembershipWithGm[] = membershipsWithChars.map((m: any) => ({
    campaign: m.campaigns,
    character: m.characters
      ? {
          id: m.characters.id,
          name: m.characters.name,
          class: m.characters.class ?? "",
          race: m.characters.race ?? "",
          level: m.characters.level ?? 1,
          avatar_url: m.characters.avatar_url ?? null,
        }
      : null,
    gmName: m.campaigns?.gm_id
      ? gmById[m.campaigns.gm_id] ?? "Spielleiter"
      : "Spielleiter",
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Meine Kampagnen
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Kampagnen, in denen du als Spieler aktiv bist.
        </p>
      </div>
      {membershipsWithGm.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hero-dark bg-background-card/50 py-16 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border border-hero-border">
            <Sword className="h-8 w-8 text-accent-gold" />
          </div>
          <h3 className="mb-2 font-cinzel font-bold text-xl text-white">
            Noch keine Kampagnen
          </h3>
          <p className="max-w-sm font-libre text-gray-400 mb-6">
            Du nimmst noch an keiner Runde teil. Schau unter „Offene Kampagnen“
            auf dem Dashboard nach neuen Abenteuern.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white text-sm hover:bg-hero-vibrant transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {membershipsWithGm.map((m) => (
            <Link
              key={m.campaign.id}
              href={`/dashboard/campaigns/${m.campaign.id}`}
              className="block rounded-md border border-hero-border bg-background-card overflow-hidden shadow-lg hover:border-hero-vibrant transition-colors group"
            >
              {m.campaign.banner_url ? (
                <div className="relative h-32 w-full bg-hero-dark">
                  <Image
                    src={m.campaign.banner_url}
                    alt=""
                    fill
                    className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              ) : (
                <div className="h-32 w-full bg-hero-dark/50 flex items-center justify-center">
                  <Sword className="h-10 w-10 text-hero-vibrant/50" />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-cinzel font-bold text-lg text-white mb-1 group-hover:text-accent-gold transition-colors truncate">
                  {m.campaign.name || "Unbenannt"}
                </h3>
                <p className="font-barlow font-bold text-gray-500 uppercase text-xs mb-1">
                  {m.campaign.system || "System offen"}
                </p>
                <p className="font-libre text-xs text-gray-500">
                  GM: {m.gmName}
                </p>
                {m.character?.name && (
                  <div className="mt-3 pt-3 border-t border-hero-border/30 flex items-center gap-2">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-hero-border bg-hero-dark">
                      {m.character.avatar_url ? (
                        <img
                          src={m.character.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-white font-bold text-xs">
                          {m.character.name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="font-libre text-sm text-gray-300 truncate">
                      {m.character.name}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
