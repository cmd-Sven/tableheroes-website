import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Shield } from "lucide-react";
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

      {/* Fraktionen & Ruf – prominent für Spieler */}
      {myCharacter && (myCharacter.faction_membership || factionReputations.length > 0) && (
        <section className="rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent-gold" />
            Fraktionen & Ruf
          </h2>
          <div className="space-y-4">
            {myCharacter.faction_membership && (
              <div className="rounded-lg border border-hero-vibrant/50 bg-hero-dark/30 p-4">
                <p className="text-xs font-barlow font-bold uppercase text-gray-500 mb-1">Deine Fraktion</p>
                <p className="font-libre font-semibold text-hero-vibrant text-lg">
                  {myCharacter.faction_name ?? "Unbekannte Fraktion"}
                </p>
                {factionReputations.find((r) => r.faction_id === myCharacter.faction_membership)?.rank && (
                  <p className="font-libre text-sm text-accent-gold mt-1">
                    Rang: {factionReputations.find((r) => r.faction_id === myCharacter.faction_membership)?.rank}
                  </p>
                )}
                {factionReputations.find((r) => r.faction_id === myCharacter.faction_membership) && (
                  <p className="font-libre text-sm text-gray-400 mt-1">
                    Ruf:{" "}
                    <span
                      className={
                        (factionReputations.find((r) => r.faction_id === myCharacter.faction_membership)?.reputation ?? 0) > 0
                          ? "text-green-400"
                          : (factionReputations.find((r) => r.faction_id === myCharacter.faction_membership)?.reputation ?? 0) < 0
                          ? "text-red-400"
                          : "text-gray-400"
                      }
                    >
                      {(factionReputations.find((r) => r.faction_id === myCharacter.faction_membership)?.reputation ?? 0) > 0 ? "+" : ""}
                      {factionReputations.find((r) => r.faction_id === myCharacter.faction_membership)?.reputation ?? 0}
                    </span>
                  </p>
                )}
              </div>
            )}
            {factionReputations.length > 0 && (
              <div>
                <p className="text-xs font-barlow font-bold uppercase text-gray-500 mb-2">
                  Ruf bei allen bekannten Fraktionen
                </p>
                <div className="space-y-2">
                  {factionReputations.map((rep) => {
                    const statusLabel =
                      rep.reputation >= 80 ? "Vertrauensperson" :
                      rep.reputation >= 50 ? "Respektiert" :
                      rep.reputation >= 20 ? "Bekannt" :
                      rep.reputation >= 0 ? "Neutral" :
                      rep.reputation >= -20 ? "Vorsicht" :
                      rep.reputation >= -50 ? "Feindlich / Schulden" :
                      "Gehasster Feind";
                    return (
                      <div
                        key={rep.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded border border-hero-border/30 bg-hero-dark/20 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-libre font-semibold text-white">{rep.faction_name}</span>
                          {rep.rank && (
                            <span className="rounded bg-accent-gold/20 px-2 py-0.5 font-barlow text-xs font-bold uppercase text-accent-gold">
                              {rep.rank}
                            </span>
                          )}
                          <span className="font-libre text-sm text-gray-500">·</span>
                          <span className="font-libre text-sm text-gray-400 italic">{statusLabel}</span>
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                <h3 className="font-barlow font-semibold text-lg text-accent-gold border-b border-hero-border pb-2">
                  Beziehungen zu NPCs
                </h3>
                <div>
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
