import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Globe,
  MapPin,
  Scroll,
  Users,
  Calendar,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { ApplyButton } from "./ApplyButton";
import { CampaignMembershipSchema, CampaignSchema } from "@/src/lib/validations/schemas";
import { z } from "zod";

type Props = {
  params: Promise<{ id: string }>;
};

interface GameSession {
  id?: string;
  start_time: string;
  end_time?: string | null;
  type?: string | null;
}

export default async function PublicCampaignPage({ params }: Props) {
  // Next.js 15: params is a Promise
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch Campaign (only if published)
  const { data: campaignRaw, error } = await supabase
    .from("campaigns")
    .select(`
      *,
      gm:users!campaigns_gm_id_fkey(username, avatar_url)
    `)
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !campaignRaw) {
    notFound();
  }

  // Validierung mit Zod (erweitertes Schema für Public Page mit zusätzlichen Feldern)
  const PublicCampaignSchema = CampaignSchema.extend({
    banner_url: z.string().url().or(z.literal("")).optional().nullable(),
    frequency: z.string().optional().nullable(),
    mode: z.string().optional().nullable(),
    looking_for: z.string().optional().nullable(),
    house_rules: z.string().optional().nullable(),
    gm: z.object({
      username: z.string().nullable(),
      avatar_url: z.string().url().or(z.literal("")).nullable().optional(),
    }).nullable().optional(),
  });

  const campaignParsed = PublicCampaignSchema.safeParse(campaignRaw);
  
  if (!campaignParsed.success) {
    console.error("Campaign Validation Error:", campaignParsed.error.format());
    notFound();
  }

  const campaign = campaignParsed.data;

  // Fetch Accepted Members with their Characters
  const { data: acceptedMembers, error: membersError } = await supabase
    .from("campaign_members")
    .select(`
      id,
      users (
        id,
        username,
        avatar_url
      ),
      characters (
        id,
        name,
        class,
        race,
        level,
        avatar_url
      )
    `)
    .eq("campaign_id", id)
    .eq("status", "Accepted")
    .order("created_at", { ascending: true });

  if (membersError) {
    console.error("Fetch Accepted Members Error:", membersError);
  }

  // Debug logging in development
  if (process.env.NODE_ENV === "development" && acceptedMembers) {
    console.log("🎭 Public Page - Accepted Members:", acceptedMembers);
  }

  // Fetch Next Session
  const { data: sessionsRaw } = await supabase
    .from("sessions")
    .select("start_time, end_time, type")
    .eq("campaign_id", id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(1);

  // Type-Cast für Session-Objekt
  const nextSession: GameSession | null = sessionsRaw && sessionsRaw.length > 0 
    ? (sessionsRaw[0] as GameSession)
    : null;

  // 1. Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Check membership status (only if user exists)
  let membershipStatus: "none" | "applied" | "accepted" | "pending" | "rejected" | "drafting" | "in_review" = "none";
  let userHasCharacter = false;
  let userCharacterName: string | null = null;
  let characterStatus: string | null = null;
  
  if (user) {
    const { data: membershipRaw } = await supabase
      .from("campaign_members")
      .select("status, character_id, characters(name, status)")
      .eq("campaign_id", id)
      .eq("user_id", user.id)
      .single();

    // Type-Cast hinzufügen, um 'never' zu verhindern
    const typedMembership = membershipRaw as { 
      status: string; 
      character_id: string | null;
      characters: { name: string | null; status: string | null } | null 
    } | null;

    if (typedMembership) {
      // Zentrale Validierung des Membership-Kerns (ohne Join-Felder)
      const parsed = CampaignMembershipSchema.pick({
        campaign_id: true,
        user_id: true,
        status: true,
        character_id: true,
        role: true,
        application_message: true,
      }).safeParse({
        campaign_id: id,
        user_id: user.id,
        status: typedMembership.status,
        character_id: typedMembership.character_id,
        role: "Player",
        application_message: null,
      });

      if (!parsed.success) {
        console.error("Membership validation failed on public page:", parsed.error.flatten());
      }

      const status = typedMembership.status;
      if (status === "Accepted") {
        membershipStatus = "accepted";
      } else if (status === "Applied" || status === "Pending") {
        membershipStatus = "applied";
      } else if (status === "Rejected") {
        membershipStatus = "rejected";
      } else if (status === "Drafting") {
        membershipStatus = "drafting";
      } else if (status === "In_Review") {
        membershipStatus = "in_review";
      } else {
        membershipStatus = "applied";
      }

      userHasCharacter = !!typedMembership.character_id;
      if (typedMembership.characters && typeof typedMembership.characters === "object" && "name" in typedMembership.characters) {
        userCharacterName = typedMembership.characters.name ?? null;
        characterStatus = typedMembership.characters.status ?? null;
      }
    }
  }

  // 3. Fetch revealed data for Character Creator (only if user is accepted)
  let revealedFactions: any[] = [];
  let revealedLocations: any[] = [];
  let revealedNPCs: any[] = [];

  if (user && membershipStatus === "accepted") {
    // Fetch factions
    const { data: factions } = await supabase
      .from("factions")
      .select("id, name, type, is_revealed")
      .eq("campaign_id", id)
      .eq("is_revealed", true);
    revealedFactions = factions || [];

    // Fetch locations
    const { data: locations } = await supabase
      .from("world_lore")
      .select("id, name, type, is_revealed")
      .eq("campaign_id", id)
      .eq("is_revealed", true);
    revealedLocations = locations || [];

    // Fetch NPCs
    const { data: npcs } = await supabase
      .from("npcs")
      .select("id, name, title, role, is_revealed")
      .eq("campaign_id", id)
      .eq("is_revealed", true);
    revealedNPCs = npcs || [];
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Back Button (Mobile + Desktop) */}
      <div className="container mx-auto max-w-7xl px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-gray-300 text-sm hover:text-hero-vibrant transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>

      {/* Hero Section with Banner */}
      <div className="relative h-[400px] overflow-hidden mt-4">
        {/* Banner Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: campaign.banner_url
              ? `url(${campaign.banner_url})`
              : "linear-gradient(to bottom right, #217d42, #132e1b, #0a1f10)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent" />
        
        {/* Content Overlay */}
        <div className="relative z-10 flex h-full items-end">
          <div className="container mx-auto max-w-7xl px-6 pb-12">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-block rounded bg-hero-dark px-3 py-1 font-barlow font-bold uppercase text-xs text-white shadow-lg">
                {campaign.system || "System"}
              </span>
              <span
                className={`inline-block rounded px-3 py-1 font-barlow font-bold uppercase text-xs shadow-lg ${
                  campaign.status === "Active"
                    ? "bg-green-900/50 text-green-400 border border-green-700"
                    : "bg-gray-700/50 text-gray-400 border border-gray-600"
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <h1 className="font-barlow font-extrabold text-5xl uppercase tracking-wide text-white drop-shadow-lg">
              {campaign.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Hard Facts Bar */}
      <div className="border-b border-hero-dark bg-background-card/80 backdrop-blur">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            {campaign.frequency && (
              <div className="flex items-center gap-2 font-libre text-gray-300">
                <Clock className="h-4 w-4 text-accent-gold" />
                <span>{campaign.frequency}</span>
              </div>
            )}
            <div className="flex items-center gap-2 font-libre text-gray-300">
              <MapPin className="h-4 w-4 text-accent-gold" />
              <span>{campaign.mode || "Online"}</span>
            </div>
            <div className="flex items-center gap-2 font-libre text-gray-300">
              <Globe className="h-4 w-4 text-accent-gold" />
              <span>Deutsch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Die Geschichte */}
            <section className="rounded-lg border border-hero-dark bg-background-card p-8">
              <h2 className="font-barlow font-bold text-2xl text-accent-blood uppercase mb-4 border-b border-hero-border pb-2">
                Die Geschichte
              </h2>
              <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                {campaign.description || "Die Legende beginnt..."}
              </p>
            </section>

            {/* Die Helden (Character Roster) */}
            <section className="rounded-lg border border-hero-dark bg-background-card p-8">
              <h2 className="font-barlow font-bold text-2xl text-accent-blood uppercase mb-4 border-b border-hero-border pb-2 flex items-center gap-2">
                <Shield className="h-6 w-6 text-accent-gold" />
                Die Helden
              </h2>
              {!acceptedMembers || acceptedMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-cinzel text-lg text-accent-gold mb-2">Die Taverne ist noch leer.</p>
                  <p className="font-libre text-sm text-gray-400">
                    Die ersten Abenteurer werden bald eintreffen...
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {acceptedMembers.map((member: any) => {
                    const character = member.characters;
                    const user = member.users;
                    
                    // Skip if no character data
                    if (!character || !character.name) return null;

                    return (
                      <div
                        key={member.id}
                        className="rounded border border-hero-border/30 bg-background-dark p-4 hover:border-hero-vibrant transition-colors"
                      >
                        {/* Character Avatar */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="h-12 w-12 rounded-full bg-hero-dark border border-hero-border flex items-center justify-center overflow-hidden flex-shrink-0">
                            {character.avatar_url || user?.avatar_url ? (
                              <img
                                src={character.avatar_url || user?.avatar_url}
                                alt={character.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-lg font-bold text-accent-gold">
                                {character.name[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-cinzel font-bold text-lg text-white mb-1 truncate">
                              {character.name}
                            </h3>
                            <p className="font-barlow text-sm text-gray-400">
                              Level {character.level} {character.race} {character.class}
                            </p>
                          </div>
                        </div>
                        
                        {/* Player Info */}
                        {user && (
                          <div className="pt-2 border-t border-hero-border/20">
                            <p className="font-libre text-xs text-gray-500">
                              Gespielt von <span className="text-gray-400">{user.username}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Gesucht wird (Wanted) */}
            {campaign.looking_for && (
              <section className="rounded-lg border-2 border-accent-gold bg-gradient-to-br from-yellow-950/20 to-background-card p-8">
                <h2 className="font-cinzel font-bold text-2xl text-accent-gold uppercase mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Gesucht wird
                </h2>
                <p className="font-libre text-lg text-gray-200 leading-relaxed">
                  {campaign.looking_for}
                </p>
              </section>
            )}

            {/* Hausregeln */}
            {campaign.house_rules && (
              <section className="rounded-lg border border-hero-dark bg-background-card p-8">
                <h2 className="font-barlow font-bold text-2xl text-accent-blood uppercase mb-4 border-b border-hero-border pb-2 flex items-center gap-2">
                  <Scroll className="h-6 w-6 text-accent-gold" />
                  Hausregeln
                </h2>
                <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {campaign.house_rules}
                </p>
              </section>
            )}
          </div>

          {/* Right Column (Sidebar/CTA) */}
          <div className="space-y-6">
            {/* GM Profile */}
            <div className="rounded-lg border border-hero-dark bg-background-card p-6">
              <h3 className="font-barlow font-bold text-sm uppercase text-gray-400 mb-3">
                Spielleiter
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-hero-border bg-background-dark">
                  {campaign.gm?.avatar_url ? (
                    <Image
                      src={campaign.gm.avatar_url}
                      alt={campaign.gm.username || "GM"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-hero-dark text-white font-bold text-lg">
                      {(campaign.gm?.username?.[0] || "G").toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-barlow font-bold text-white">
                    {campaign.gm?.username || "Game Master"}
                  </p>
                  <p className="font-libre text-xs text-gray-500">Dungeon Master</p>
                </div>
              </div>
            </div>

            {/* Next Session */}
            {nextSession && (
              <div className="rounded-lg border border-hero-dark bg-background-card p-6">
                <h3 className="font-barlow font-bold text-sm uppercase text-gray-400 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent-gold" />
                  Nächste Session
                </h3>
                <div className="font-libre text-gray-200">
                  <p className="text-lg font-bold">
                    {new Intl.DateTimeFormat("de-DE", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    }).format(new Date(nextSession.start_time))}
                  </p>
                  <p className="text-sm text-gray-400">
                    {new Intl.DateTimeFormat("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(nextSession.start_time))}{" "}
                    Uhr
                  </p>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="rounded-lg border border-hero-border bg-gradient-to-br from-hero-dark to-background-dark p-6">
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
                Interesse geweckt?
              </h3>
              <p className="font-libre text-sm text-gray-300 mb-4">
                Werde Teil dieser Legende und erlebe unvergessliche Abenteuer.
              </p>
              {user ? (
                <ApplyButton 
                  campaignId={id} 
                  membershipStatus={membershipStatus}
                  userHasCharacter={userHasCharacter}
                  userCharacterName={userCharacterName}
                  characterStatus={characterStatus}
                  factions={revealedFactions}
                  locations={revealedLocations}
                  npcs={revealedNPCs}
                />
              ) : (
                <Link
                  href="/login"
                  className="block w-full rounded-md border border-hero-border bg-hero-vibrant px-4 py-3 font-barlow font-bold uppercase text-white text-center shadow-lg hover:bg-hero-dark transition-colors"
                >
                  Login zum Bewerben
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

