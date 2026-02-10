import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Users, ScrollText } from "lucide-react";
import { DiscoverySlider } from "@/src/components/dashboard/player/DiscoverySlider";
import { PartyOverview } from "@/src/components/dashboard/player/PartyOverview";

type Props = {
  params: Promise<{ id: string }>;
};

export type DiscoveryItem = {
  id: string;
  name: string;
  kind: "lore" | "faction" | "npc";
  description?: string | null;
  image_url?: string | null;
  type?: string;
  created_at: string;
};

export type PartyMember = {
  id: string;
  name: string;
  class: string;
  race: string;
  level?: number;
  avatar_url?: string | null;
};

export default async function PlayerDashboardPage({ params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: campaign, error: campaignError } = await (supabase.from("campaigns") as any)
    .select("id, name, gm_id")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) notFound();
  const isGM = (campaign as { gm_id: string }).gm_id === user.id;
  if (isGM) redirect(`/dashboard/campaigns/${campaignId}`);

  const { data: membership } = await (supabase.from("campaign_members") as any)
    .select("id, status, character_id, characters(id, name, class, race, level, biography, status)")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["Accepted", "Approved"].includes(membership.status)) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  const myCharacterId = (membership as any).character_id;
  let myCharacter: any = null;
  let relationships: Array<{ relationship_type: string; description?: string | null; npcs: { id: string; name: string; role: string | null; title: string | null } | null }> = [];

  if (myCharacterId) {
    const { data: charData } = await (supabase.from("characters") as any)
      .select(
        `
        id,
        name,
        class,
        race,
        level,
        biography,
        status,
        character_relationships (
          relationship_type,
          description,
          npcs (
            id,
            name,
            role,
            title
          )
        )
      `
      )
      .eq("id", myCharacterId)
      .single();
    myCharacter = charData;
    if (charData?.character_relationships) {
      relationships = charData.character_relationships;
    }
  }

  // Neuentdeckungen: world_lore, factions, npcs mit is_revealed === true, sortiert nach created_at, nur Spieler-sichtbare Felder (keine gm_notes)
  const [loreRes, factionsRes, npcsRes] = await Promise.all([
    (supabase.from("world_lore") as any)
      .select("id, name, type, description, image_url, created_at")
      .eq("campaign_id", campaignId)
      .eq("is_revealed", true)
      .order("created_at", { ascending: false })
      .limit(8),
    (supabase.from("factions") as any)
      .select("id, name, type, description, created_at")
      .eq("campaign_id", campaignId)
      .eq("is_revealed", true)
      .order("created_at", { ascending: false })
      .limit(8),
    (supabase.from("npcs") as any)
      .select("id, name, title, description, created_at")
      .eq("campaign_id", campaignId)
      .eq("is_revealed", true)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const loreItems: DiscoveryItem[] = (loreRes.data || []).map((e: any) => ({
    id: e.id,
    name: e.name,
    kind: "lore" as const,
    description: e.description ?? null,
    image_url: e.image_url ?? null,
    type: e.type,
    created_at: e.created_at,
  }));
  const factionItems: DiscoveryItem[] = (factionsRes.data || []).map((e: any) => ({
    id: e.id,
    name: e.name,
    kind: "faction" as const,
    description: e.description ?? null,
    image_url: null,
    type: e.type,
    created_at: e.created_at,
  }));
  const npcItems: DiscoveryItem[] = (npcsRes.data || []).map((e: any) => ({
    id: e.id,
    name: e.name,
    kind: "npc" as const,
    description: e.description ?? null,
    image_url: null,
    type: e.title ?? undefined,
    created_at: e.created_at,
  }));

  const allDiscoveries = [...loreItems, ...factionItems, ...npcItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  // Die Gruppe: andere Charaktere mit status = Active (users.avatar_url für Avatar)
  const { data: partyCharacters } = await (supabase.from("characters") as any)
    .select("id, name, class, race, level, users(avatar_url)")
    .eq("campaign_id", campaignId)
    .eq("status", "Active")
    .neq("id", myCharacterId || "");

  const party: PartyMember[] = (partyCharacters || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    class: c.class ?? "",
    race: c.race ?? "",
    level: c.level ?? 1,
    avatar_url: c.users?.avatar_url ?? null,
  }));

  return (
    <div className="container mx-auto max-w-6xl space-y-10 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
            {campaign.name}
          </h1>
          <p className="font-libre text-gray-400 mt-1">Dein Kampagnen-Dashboard</p>
        </div>
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold uppercase text-sm text-gray-300 hover:bg-hero-dark transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
      </div>

      <DiscoverySlider items={allDiscoveries} />

      <section className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
          <User className="h-6 w-6 text-accent-gold" />
          Mein Charakter
        </h2>
        {myCharacter ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-barlow font-bold uppercase text-gray-500">Name</p>
                <p className="font-libre text-white font-semibold">{myCharacter.name}</p>
              </div>
              <div>
                <p className="text-xs font-barlow font-bold uppercase text-gray-500">Klasse · Rasse</p>
                <p className="font-libre text-gray-200">
                  {myCharacter.class} · {myCharacter.race}
                  {myCharacter.level != null && ` (Stufe ${myCharacter.level})`}
                </p>
              </div>
            </div>
            {myCharacter.biography && (
              <div>
                <p className="text-xs font-barlow font-bold uppercase text-gray-500 mb-1">Biografie</p>
                <p className="font-libre text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {myCharacter.biography}
                </p>
              </div>
            )}
            {relationships.length > 0 && (
              <div>
                <p className="text-xs font-barlow font-bold uppercase text-gray-500 mb-2">Beziehungen</p>
                <ul className="space-y-2">
                  {relationships.map((rel: any, idx: number) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 rounded border border-hero-border/30 bg-hero-dark/20 px-3 py-2 font-libre text-sm text-gray-200"
                    >
                      <span className="font-semibold text-white">{rel.npcs?.name ?? "Unbekannt"}</span>
                      <span className="text-gray-500">·</span>
                      <span>{rel.relationship_type}</span>
                      {rel.description && (
                        <>
                          <span className="text-gray-500">·</span>
                          <span className="text-gray-400 italic">{rel.description}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="font-libre text-gray-500 italic">
            Du hast noch keinen Charakter für diese Kampagne. Erstelle einen über die Kampagnen-Übersicht.
          </p>
        )}
      </section>

      <PartyOverview party={party} />
    </div>
  );
}
