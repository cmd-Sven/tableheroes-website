import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Shield, Users, ExternalLink } from "lucide-react";
import { DiscoverySlider } from "@/src/components/dashboard/player/DiscoverySlider";
import { PartyOverview } from "@/src/components/dashboard/player/PartyOverview";
import { getLoreEntries } from "../lore-actions";
import { getNPCs } from "../npc-actions";
import { getFactionsWithMembers } from "../factions-actions";
import { getCharacterFactionReputations } from "../reputation-actions";

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
  culture?: string;
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
  let factionReputations: Array<{ id: string; faction_id: string; faction_name: string; reputation: number; rank: string | null }> = [];

  if (myCharacterId) {
    const { data: charData } = await (supabase.from("characters") as any)
      .select("id, name, class, race, level, biography, status, faction_membership")
      .eq("id", myCharacterId)
      .single();
    myCharacter = charData;
    if (charData) {
      const { data: relRows } = await (supabase.from("character_relationships") as any)
        .select("relationship_type, description, npc_id")
        .eq("character_id", charData.id);
      const npcIds = [...new Set(((relRows as any[]) ?? []).map((r: any) => r.npc_id).filter(Boolean))];
      let npcMap = new Map<string, { id: string; name: string; role: string | null; title: string | null }>();
      if (npcIds.length > 0) {
        const { data: npcRows } = await (supabase.from("npcs") as any)
          .select("id, name, role, title")
          .in("id", npcIds);
        npcMap = new Map(((npcRows as any[]) ?? []).map((n: any) => [n.id, { id: n.id, name: n.name, role: n.role, title: n.title }]));
      }
      relationships = ((relRows as any[]) ?? []).map((r: any) => ({
        relationship_type: r.relationship_type,
        description: r.description,
        npcs: r.npc_id ? npcMap.get(r.npc_id) ?? null : null,
      }));
      const repData = await getCharacterFactionReputations(charData.id, campaignId);
      factionReputations = repData.map((r) => ({
        id: r.id,
        faction_id: r.faction_id,
        faction_name: r.faction_name,
        reputation: r.reputation,
        rank: r.rank ?? null,
      }));
    }
  }

  // Fraktionen laden (vor faction_name-Auflösung, da RLS den direkten Abruf blockieren kann)
  const factionsRaw = await getFactionsWithMembers(campaignId);
  const factionsFiltered = factionsRaw.filter(
    (f: any) => f.is_revealed === true || f.allow_pc_join_on_creation === true
  );

  // Fraktionsname für Charakter auflösen (aus Ruf-Einträgen oder sichtbaren Fraktionen)
  if (myCharacter?.faction_membership) {
    const fromRep = factionReputations.find((r) => r.faction_id === myCharacter.faction_membership);
    const fromFiltered = factionsFiltered.find((f: any) => f.id === myCharacter.faction_membership);
    (myCharacter as any).faction_name =
      fromRep?.faction_name ?? fromFiltered?.name ?? "Unbekannte Fraktion";
  }

  const [loreEntries, npcsList] = await Promise.all([
    getLoreEntries(campaignId),
    getNPCs(campaignId, user.id, false),
  ]);

  const loreItems: DiscoveryItem[] = loreEntries.slice(0, 8).map((e: any) => ({
    id: e.id,
    name: e.name,
    kind: "lore" as const,
    description: e.description ?? null,
    image_url: e.image_url ?? null,
    type: e.type,
    created_at: e.created_at,
  }));
  const factionItems: DiscoveryItem[] = factionsFiltered.slice(0, 8).map((e: any) => ({
    id: e.id,
    name: e.name,
    kind: "faction" as const,
    description: e.description ?? null,
    image_url: null,
    type: e.type,
    created_at: e.created_at,
  }));
  const npcItems: DiscoveryItem[] = npcsList.slice(0, 8).map((e: any) => ({
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

  // Die Gruppe: andere Charaktere mit status = Active (users.avatar_url, culture_lore_id)
  const { data: partyCharacters } = await (supabase.from("characters") as any)
    .select("id, name, class, race, level, culture_lore_id, users(avatar_url)")
    .eq("campaign_id", campaignId)
    .eq("status", "Active")
    .neq("id", myCharacterId || "");

  const cultureIds = [...new Set((partyCharacters || []).map((c: any) => c.culture_lore_id).filter(Boolean))];
  let cultureMap = new Map<string, string>();
  if (cultureIds.length > 0) {
    const { data: cultureRows } = await (supabase.from("world_lore") as any)
      .select("id, name")
      .in("id", cultureIds);
    cultureMap = new Map(((cultureRows as { id: string; name: string }[]) ?? []).map((l) => [l.id, l.name]));
  }

  const party: PartyMember[] = (partyCharacters || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    class: c.class ?? "",
    race: c.race ?? "",
    level: c.level ?? 1,
    culture: c.culture_lore_id ? (cultureMap.get(c.culture_lore_id) ?? "") : "",
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

      {/* Fraktionen & Ruf – Card Design mit Links und Ruf-Farben */}
      {myCharacter && (myCharacter.faction_membership || factionReputations.length > 0) && (
        <section className="rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent-gold" />
            Fraktionen & Ruf
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {myCharacter.faction_membership && !factionReputations.some((r) => r.faction_id === myCharacter.faction_membership) && (
              <Link
                href={`/dashboard/campaigns/${campaignId}/factions/${myCharacter.faction_membership}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hero-vibrant/50 bg-hero-dark/30 p-4 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-cinzel font-bold text-white">{myCharacter.faction_name ?? "Unbekannte Fraktion"}</span>
                  <span className="rounded bg-hero-vibrant/20 px-1.5 py-0.5 font-barlow text-xs font-bold uppercase text-hero-vibrant">
                    Deine Fraktion
                  </span>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-500 shrink-0" />
              </Link>
            )}
            {factionReputations.map((rep) => {
              const statusLabel =
                rep.reputation >= 80 ? "Vertrauensperson" :
                rep.reputation >= 50 ? "Respektiert" :
                rep.reputation >= 20 ? "Bekannt" :
                rep.reputation >= 0 ? "Neutral" :
                rep.reputation >= -20 ? "Vorsicht" :
                rep.reputation >= -50 ? "Feindlich / Schulden" :
                "Gehasster Feind";
              const isPrimary = myCharacter.faction_membership === rep.faction_id;
              const colorClasses =
                rep.reputation >= 50 ? "border-green-900/60 bg-green-900/20" :
                rep.reputation >= 20 ? "border-green-800/50 bg-green-900/10" :
                rep.reputation < -50 ? "border-red-900/60 bg-red-900/20" :
                rep.reputation < -20 ? "border-red-800/50 bg-red-900/10" :
                "border-hero-border/40 bg-hero-dark/20";
              return (
                <Link
                  key={rep.id}
                  href={`/dashboard/campaigns/${campaignId}/factions/${rep.faction_id}`}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl ${isPrimary ? "border-hero-vibrant/50 bg-hero-dark/30" : colorClasses}`}
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-cinzel font-bold text-white">{rep.faction_name}</span>
                    {isPrimary && (
                      <span className="rounded bg-hero-vibrant/20 px-1.5 py-0.5 font-barlow text-xs font-bold uppercase text-hero-vibrant shrink-0">
                        Deine Fraktion
                      </span>
                    )}
                    {rep.rank && (
                      <span className="rounded bg-accent-gold/20 px-2 py-0.5 font-barlow text-xs font-bold uppercase text-accent-gold shrink-0">
                        {rep.rank}
                      </span>
                    )}
                    <span className="font-libre text-sm text-gray-500 italic">· {statusLabel}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded px-3 py-1 font-barlow font-bold text-sm ${
                      rep.reputation > 0
                        ? "bg-green-900/50 text-green-400 border border-green-700"
                        : rep.reputation < 0
                        ? "bg-red-900/50 text-red-400 border border-red-700"
                        : "bg-gray-800/50 text-gray-400 border border-gray-600"
                    }`}
                  >
                    {rep.reputation > 0 ? "+" : ""}{rep.reputation}
                  </span>
                  <ExternalLink className="h-4 w-4 text-gray-500 shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

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
              <div className="space-y-4">
                <h3 className="font-barlow font-semibold text-lg text-accent-gold border-b border-hero-border pb-2 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Beziehungen zu NPCs
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {relationships.map((rel: any, idx: number) => {
                    const npc = rel.npcs;
                    const npcHref = npc?.id ? `/dashboard/campaigns/${campaignId}/npcs/${npc.id}` : null;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-hero-dark bg-background-card p-4 shadow-lg hover:border-hero-vibrant/50 transition-colors"
                      >
                        {npcHref ? (
                          <Link
                            href={npcHref}
                            className="font-cinzel font-bold text-accent-gold hover:text-hero-vibrant flex items-center gap-1.5 group"
                          >
                            {npc?.name ?? "Unbekannt"}
                            <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <span className="font-cinzel font-bold text-white">{npc?.name ?? "Unbekannt"}</span>
                        )}
                        {(npc?.title || npc?.role) && (
                          <p className="font-libre text-xs text-gray-500 mt-0.5">{npc.title ?? npc.role}</p>
                        )}
                        <p className="font-libre text-sm text-accent-gold mt-1">{rel.relationship_type}</p>
                        {rel.description && (
                          <p className="font-libre text-sm text-gray-400 mt-1 italic">{rel.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
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
