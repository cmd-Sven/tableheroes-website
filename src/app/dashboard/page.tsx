import { createClient } from "@/src/lib/supabase/server";
import { Plus, Map as MapIcon, Search, Sword, Bell, UserPlus, AlertCircle, Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import { AcceptanceNotification } from "./AcceptanceNotification";
import { CampaignCard } from "@/src/components/dashboard/CampaignCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Profil für Begrüßung und Rolle
  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("username, primary_role")
    .eq("id", user.id)
    .single();

  // Typ-Sicherung gegen 'never' - Der 'unknown' Cast bricht die 'never' Vererbung auf
  const profile = profileRaw as unknown as { 
    username: string | null; 
    primary_role: string; 
  } | null;

  const isGM =
    profile?.primary_role === "GameMaster" || profile?.primary_role === "Admin";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Willkommen zurück, {profile?.username || "Held"}
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          {isGM
            ? "Verwalte deine Welten und führe deine Spieler ins Abenteuer."
            : "Bereit für das nächste Abenteuer? Hier findest du deine Gruppen."}
        </p>
      </div>

      {/* Content Area Based on Role */}
      {isGM ? <GameMasterView userId={user.id} /> : <PlayerView userId={user.id} />}
    </div>
  );
}

// ----------------------------------------------------------------------------
// GM VIEW
// ----------------------------------------------------------------------------
async function GameMasterView({ userId }: { userId: string }) {
  const supabase = await createClient();
  // Fetch active GM campaigns
  const { data: campaignsRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, system, max_players")
    .eq("gm_id", userId)
    .order("created_at", { ascending: false });

  // Expliziter Cast gegen 'never'
  const campaigns = (campaignsRaw as any[]) || [];

  const hasCampaigns = campaigns && campaigns.length > 0;

  // Fetch pending applications for GM's campaigns
  const { data: pendingApplications } = await (supabase.from("campaign_members") as any)
    .select(`
      id,
      campaign_id,
      campaigns!inner(id, name, gm_id)
    `)
    .eq("campaigns.gm_id", userId)
    .eq("status", "Applied");

  // Group applications by campaign
  const applicationsByCampaign = new Map<string, { id: string; name: string; count: number }>();
  if (pendingApplications) {
    pendingApplications.forEach((app: any) => {
      const campaign = app.campaigns;
      if (campaign) {
        const existing = applicationsByCampaign.get(campaign.id);
        if (existing) {
          existing.count += 1;
        } else {
          applicationsByCampaign.set(campaign.id, {
            id: campaign.id,
            name: campaign.name,
            count: 1,
          });
        }
      }
    });
  }

  const totalPendingCount = pendingApplications?.length || 0;

  return (
    <div className="space-y-8">
      {/* GM Action Center (Notification Widget) */}
      {totalPendingCount > 0 && (
        <div className="rounded-lg border-l-4 border-l-yellow-500 bg-yellow-950/20 border border-yellow-900/50 p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-yellow-900/50 border border-yellow-700">
              <Bell className="h-5 w-5 text-yellow-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-barlow font-bold text-lg text-yellow-400 uppercase mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Offene Bewerbungen
              </h3>
              <div className="space-y-2 mb-4">
                {Array.from(applicationsByCampaign.values()).map((campaign: any) => (
                  <p key={campaign.id} className="font-libre text-sm text-gray-200">
                    Du hast <strong className="text-yellow-400">{campaign.count} neue {campaign.count === 1 ? 'Bewerbung' : 'Bewerbungen'}</strong> für <strong className="text-white">{campaign.name}</strong>.
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(applicationsByCampaign.values()).map((campaign: any) => (
                  <Link
                    key={campaign.id}
                    href={`/dashboard/campaigns/${campaign.id}#members`}
                    className="inline-flex items-center gap-2 rounded-md border border-yellow-700 bg-yellow-900/50 px-4 py-2 font-barlow font-bold uppercase text-xs text-yellow-400 hover:bg-yellow-900 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    Zu {campaign.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Row: Active Campaigns */}
      <div className="flex items-center justify-between">
        <h2 className="font-barlow font-bold text-2xl text-white uppercase border-b border-hero-dark pb-2">
          Aktive Kampagnen
        </h2>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white text-sm shadow-lg transition-transform hover:scale-105 hover:bg-hero-vibrant"
        >
          <Plus className="h-4 w-4" />
          Neue Kampagne
        </Link>
      </div>

      {!hasCampaigns ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hero-dark bg-background-card/50 py-16 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border border-hero-border">
            <MapIcon className="h-8 w-8 text-hero-vibrant" />
          </div>
          <h3 className="mb-2 font-cinzel font-bold text-xl text-white">
            Erschaffe deine Welt
          </h3>
          <p className="max-w-sm font-libre text-gray-400">
            Du hast noch keine Kampagne erstellt. Starte jetzt und lade deine
            Spieler ein.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c: any) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {/* Bottom Row: My Player Characters (Optional placeholder) */}
      <div className="mt-12">
        <h2 className="font-barlow font-bold text-2xl text-white uppercase border-b border-hero-dark pb-2 mb-4">
          Meine Spieler-Charaktere
        </h2>
        <p className="font-libre text-gray-400">
          Auch Spielleiter sind manchmal Helden. (Hier erscheinen deine Charaktere
          in anderen Runden).
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// HELPER: Fetch Public Campaigns for Discovery
// ----------------------------------------------------------------------------
async function getDiscoverableCampaigns() {
  const supabase = await createClient();
  const { data: campaignsRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, system, banner_url, description, mode, frequency")
    .eq("status", "Active")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  // Expliziter Cast gegen 'never'
  const campaigns = (campaignsRaw as any[]) || [];
  return campaigns;
}

// ----------------------------------------------------------------------------
// PLAYER VIEW
// ----------------------------------------------------------------------------
async function PlayerView({ userId }: { userId: string }) {
  const supabase = await createClient();
  
  // Fetch campaigns joined as player with character info
  const { data: membershipsRaw } = await (supabase.from("campaign_members") as any)
    .select(`
      campaign_id,
      status,
      character_id,
      campaigns (
        id,
        name,
        system,
        banner_url
      ),
      characters (
        id,
        name,
        class,
        race,
        level,
        avatar_url,
        status
      )
    `)
    .eq("user_id", userId)
    .eq("status", "Accepted");

  // Expliziter Cast gegen 'never'
  const memberships = (membershipsRaw as any[]) || [];

  const hasMemberships = memberships && memberships.length > 0;

  // Fetch new acceptances (unseen notifications)
  const { data: newAcceptancesRaw } = await (supabase.from("campaign_members") as any)
    .select(`
      id,
      campaign_id,
      campaigns!inner(id, name)
    `)
    .eq("user_id", userId)
    .eq("status", "Accepted")
    .eq("has_seen_acceptance", false);

  // Expliziter Cast gegen 'never'
  const newAcceptances = (newAcceptancesRaw as any[]) || [];

  // Fetch public campaigns for discovery
  const discoverableCampaigns = await getDiscoverableCampaigns();

  return (
    <div className="space-y-8">
      {/* Player Acceptance Notifications */}
      {newAcceptances && newAcceptances.length > 0 && (
        <div className="space-y-4">
          {newAcceptances.map((acceptance: any) => (
            <AcceptanceNotification
              key={acceptance.id}
              memberId={acceptance.id}
              campaignId={acceptance.campaigns.id}
              campaignName={acceptance.campaigns.name}
            />
          ))}
        </div>
      )}

      {/* Scenario A: No Active Adventures (New User) */}
      {!hasMemberships ? (
        <>
          <div>
            <h2 className="font-barlow font-bold text-2xl text-white uppercase border-b border-hero-dark pb-2 mb-2">
              Finde dein Abenteuer
            </h2>
            <p className="font-libre text-gray-400">
              Entdecke laufende Runden und bewirb dich für die nächste Session.
            </p>
          </div>

          {discoverableCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hero-dark bg-background-card/50 py-16 text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border border-hero-border">
                <Sword className="h-8 w-8 text-accent-gold" />
              </div>
              <h3 className="mb-2 font-cinzel font-bold text-xl text-white">
                Noch keine offenen Runden
              </h3>
              <p className="max-w-sm font-libre text-gray-400">
                Aktuell sind keine Kampagnen verfügbar. Schau später wieder vorbei!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {discoverableCampaigns.map((campaign: any) => (
                <CampaignTicketCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Scenario B: User HAS active adventures */}
          <div>
            <h2 className="font-barlow font-bold text-2xl text-white uppercase border-b border-hero-dark pb-2">
              Aktive Abenteuer
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m: any) => {
              const campaign = m.campaigns;
              const character = m.characters;
              
              return (
                <div
                  key={campaign.id}
                  className="rounded-md border border-hero-border bg-background-card p-6 shadow-lg hover:border-hero-vibrant transition-colors group"
                >
                  {/* Campaign Info */}
                  <div className="mb-4">
                    <h3 className="font-cinzel font-bold text-xl text-white mb-2 group-hover:text-accent-gold transition-colors">
                      {campaign.name || "Unbenannt"}
                    </h3>
                    <p className="font-barlow font-bold text-gray-500 uppercase text-xs mb-2">
                      {campaign.system || "System offen"}
                    </p>
                    <p className="font-libre text-xs text-gray-500 italic">
                      Nächste Session: [Platzhalter]
                    </p>
                  </div>

                  {/* Character Info */}
                  <div className="pt-4 border-t border-hero-border/30">
                    {character && character.name ? (
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-hero-border bg-hero-dark">
                          {character.avatar_url ? (
                            <img
                              src={character.avatar_url}
                              alt={character.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-hero-dark text-white font-bold text-lg">
                              {character.name[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        {/* Character Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-cinzel font-bold text-sm text-accent-gold mb-1">
                            {character.name}
                          </p>
                          <p className="font-libre text-xs text-gray-400">
                            Lvl {character.level || 1} • {character.race} • {character.class}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-hero-dark/50 border border-hero-border flex items-center justify-center">
                          <Sword className="h-5 w-5 text-gray-600" />
                        </div>
                        <p className="font-libre text-sm text-gray-500 italic">
                          Charakter noch nicht erstellt
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Link */}
                  <div className="mt-4 pt-4 border-t border-hero-border/30">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="text-sm font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
                    >
                      Zum Abenteuer &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Other Running Campaigns Section (Below Active Adventures) */}
          {discoverableCampaigns.length > 0 && (
            <div className="mt-12">
              <div className="mb-4">
                <h2 className="font-barlow font-bold text-2xl text-white uppercase border-b border-hero-dark pb-2">
                  Andere laufende Runden
                </h2>
                <p className="mt-2 font-libre text-sm text-gray-400">
                  Entdecke weitere Abenteuer aus der Community.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {discoverableCampaigns.map((campaign: any) => (
                  <CampaignTicketCard key={campaign.id} campaign={campaign} compact />
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

// ----------------------------------------------------------------------------
// CAMPAIGN TICKET CARD (Reusable Component)
// ----------------------------------------------------------------------------
function CampaignTicketCard({
  campaign,
  compact = false,
}: {
  campaign: {
    id: string;
    name: string;
    system: string | null;
    banner_url: string | null;
    description: string | null;
    mode: string | null;
    frequency: string | null;
  };
  compact?: boolean;
}) {
  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group block overflow-hidden rounded-lg border border-hero-border bg-background-card shadow-lg transition-all hover:scale-[1.02] hover:border-hero-vibrant"
    >
      {/* Banner Image */}
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-hero-dark to-background-dark ${
          compact ? "h-32" : "h-48"
        }`}
        style={{
          backgroundImage: campaign.banner_url
            ? `url(${campaign.banner_url})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="inline-block rounded bg-hero-dark/90 px-2 py-1 font-barlow font-bold uppercase text-xs text-white shadow-lg">
            {campaign.system || "System"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className={compact ? "p-4" : "p-6"}>
        <h3
          className={`font-cinzel font-bold ${
            compact ? "text-lg" : "text-xl"
          } text-accent-gold mb-2 group-hover:text-white transition-colors line-clamp-2`}
        >
          {campaign.name}
        </h3>

        {!compact && campaign.description && (
          <p className="font-libre text-sm text-gray-400 leading-relaxed mb-4 line-clamp-2">
            {campaign.description}
          </p>
        )}

        {campaign.frequency && (
          <p className="font-barlow text-xs text-gray-500 uppercase mb-4">
            {campaign.frequency}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="font-barlow font-bold uppercase text-xs text-hero-vibrant group-hover:text-white transition-colors">
            Ansehen &rarr;
          </span>
          {campaign.mode && (
            <span className="rounded bg-background-dark px-2 py-1 font-barlow text-xs text-gray-500">
              {campaign.mode}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

