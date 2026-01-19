import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Users,
  MapPin,
  Settings,
  User,
} from "lucide-react";
import { togglePublishStatus, updateCampaignDetails } from "./actions";
import { MembersManagement } from "./MembersManagement";
import { getNPCs } from "./npc-actions";
import { getFactionsWithMembers } from "./factions-actions";
import { getLoreEntries } from "./lore-actions";
import { getQuests } from "./quest-actions";
import { NPCsManagement } from "./NPCsManagement";
import { FactionsManagement } from "./FactionsManagement";
import { LoreManagement } from "./LoreManagement";
import { QuestLogManagement } from "./QuestLogManagement";
import { SessionsTab } from "./SessionsTab";
import { Plus } from "lucide-react";
import { CharacterCreatorButton } from "./CharacterCreatorButton";
import { CharacterSheet } from "@/src/components/dashboard/campaigns/CharacterSheet";
import { CinematicCampaignHeader } from "@/src/components/dashboard/campaigns/CinematicCampaignHeader";
import { getCampaignGalleryImages } from "./gallery-actions";
import { getWorldByCampaign } from "./world-actions";
import { WorldRequiredBlocker } from "@/src/components/dashboard/campaigns/world/WorldRequiredBlocker";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: Props) {
  // Next.js 15: params and searchParams are Promises
  const { id } = await params;
  const { tab = "overview" } = await searchParams;

  // Validate UUID format (basic check)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Debug: Current User
  console.log("🔍 [DashboardPage] Current User:", user?.id, user?.email);

  if (!user) return null;

  // Fetch Campaign
  const { data: campaignRaw, error } = await (supabase.from("campaigns") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !campaignRaw) {
    notFound();
  }

  const campaign = campaignRaw as { id: string; gm_id: string; [key: string]: any } | null;

  if (!campaign) {
    notFound();
  }

  // Security: Check if user is GM
  const isGM = campaign.gm_id === user.id;

  // Fetch World for this campaign
  const { data: worldRaw, error: worldError } = await (supabase.from("worlds") as any)
    .select("*")
    .eq("campaign_id", id)
    .single();

  const world = worldRaw as any;
  
  // If no world exists (PGRST116 = no rows returned), world will be null
  // This is expected behavior - we'll show the WorldRequiredBlocker
  // Only treat as error if it's not a "no rows" error
  if (worldError && worldError.code !== "PGRST116") {
    console.error("Error fetching world:", worldError);
  }

  // Check user's membership status (for non-GM users)
  let userMembershipStatus:
    | "none"
    | "Applied"
    | "Drafting"
    | "In_Review"
    | "Accepted"
    | "Rejected"
    | "Pending" = "none";
  let userHasCharacter = false;
  let isAcceptedMember = false;
  let membership: any = null;

  if (!isGM) {
    console.log("🔍 [DashboardPage] Checking Membership for Campaign:", id);
    console.log("🔍 [DashboardPage] User ID:", user.id);

    const { data: membershipData, error: membershipError } = await (supabase.from("campaign_members") as any)
      .select("status, character_id, characters(status)")
      .eq("campaign_id", id)
      .eq("user_id", user.id)
      .single();

    console.log("🔍 [DashboardPage] Membership Query Result:", {
      membership: membershipData,
      error: membershipError,
    });

    if (membershipData) {
      membership = membershipData;
      userMembershipStatus = membership.status as any;
      userHasCharacter = !!membership.character_id;

      // Check if character is Dead or Archived (allows new character creation)
      const characterStatus = (membership.characters as any)?.status;
      const isDeadOrArchived =
        characterStatus === "Dead" || characterStatus === "Archived";

      // User has access if status is Accepted, Drafting, or In_Review
      const validMemberStatuses = ["Accepted", "Drafting", "In_Review"];
      isAcceptedMember = validMemberStatuses.includes(membership.status);

      console.log(
        "🔍 [DashboardPage] Membership Status:",
        userMembershipStatus
      );
      console.log("🔍 [DashboardPage] User Has Character:", userHasCharacter);
      console.log(
        "🔍 [DashboardPage] Derived isAcceptedMember:",
        isAcceptedMember,
        "(valid statuses: Accepted, Drafting, In_Review)"
      );
    } else {
      console.log("🔍 [DashboardPage] No membership found for user");
    }
  } else {
    console.log("🔍 [DashboardPage] User is GM, skipping membership check");
  }

  // Check if user has access (GM or Accepted Member)
  const hasAccess = isGM || isAcceptedMember;
  console.log(
    "🔍 [DashboardPage] Has Access (isGM || isAcceptedMember):",
    hasAccess,
    { isGM, isAcceptedMember }
  );

  // Fetch Sessions
  const { data: sessionsRaw } = await (supabase.from("sessions") as any)
    .select("*")
    .eq("campaign_id", id)
    .order("start_time", { ascending: true });

  // Expliziter Cast gegen 'never' - Präziser Typ für Sessions
  const sessions = sessionsRaw as Array<{
    id: string;
    title: string | null;
    start_time: string;
    type: string;
    status: string;
  }> | null;

  const upcomingSessions = (sessions || []).filter(
    (s: any) => new Date(s.start_time) > new Date()
  );

  // Fetch NPCs, Factions, Lore, and Quests
  // Apply filters based on user role (GM sees all, Players see only revealed + own NPCs)
  let npcs: any[] = [];
  let factions: any[] = [];
  let loreEntries: any[] = [];
  let quests: any[] = [];

  console.log(
    "🔍 [DashboardPage] Starting data fetch. hasAccess:",
    hasAccess,
    "isGM:",
    isGM
  );

  if (hasAccess) {
    // Unified data loading: Use getNPCs for both GM and Player
    // This ensures has_active_quest is calculated for all users
    console.log("🔍 [DashboardPage] Loading data (isGM:", isGM, ")");
    npcs = await getNPCs(id, user.id, isGM);

    console.log("✅ [DashboardPage] NPCs loaded:", npcs.length, "NPCs");
    if (npcs.length > 0) {
      console.log("🔍 [DashboardPage] Sample NPC:", {
        id: npcs[0].id,
        name: npcs[0].name,
        is_revealed: npcs[0].is_revealed,
        has_active_quest: npcs[0].has_active_quest,
        user_id: npcs[0].user_id,
      });
    }

    if (isGM) {
      // GM: Load everything (no filters)
      factions = await getFactionsWithMembers(id);
      loreEntries = await getLoreEntries(id);
      quests = await getQuests(id);

      console.log("🔍 [DashboardPage] GM Data loaded:", {
        npcs: npcs.length,
        factions: factions.length,
        loreEntries: loreEntries.length,
        quests: quests.length,
      });
    } else {
      // Player: Load with filters

      // Factions: is_revealed === true
      console.log("🔍 [DashboardPage] Fetching Factions for campaign:", id);
      const { data: factionsData, error: factionsError } = await (supabase.from("factions") as any)
        .select("*")
        .eq("campaign_id", id)
        .eq("is_revealed", true);

      if (factionsError) {
        console.error(
          "❌ [DashboardPage] Fetch Factions Error:",
          factionsError
        );
      } else {
        console.log(
          "✅ [DashboardPage] Factions loaded:",
          (factionsData || []).length,
          "factions"
        );
        // Calculate member count for each faction
        const factionsWithCounts = await Promise.all(
          (factionsData || []).map(async (faction: any) => {
            const { count } = await (supabase.from("npcs") as any)
              .select("id", { count: "exact", head: true })
              .eq("faction_id", faction.id)
              .or(`is_revealed.eq.true,user_id.eq.${user.id}`); // Only count visible NPCs

            return {
              ...faction,
              member_count: count || 0,
            };
          })
        );
        factions = factionsWithCounts;
      }

      // Lore: is_revealed === true
      console.log("🔍 [DashboardPage] Fetching Lore for campaign:", id);
      const { data: loreData, error: loreError } = await (supabase.from("world_lore") as any)
        .select("*")
        .eq("campaign_id", id)
        .eq("is_revealed", true)
        .order("created_at", { ascending: true });

      if (loreError) {
        console.error("❌ [DashboardPage] Fetch Lore Error:", loreError);
      } else {
        loreEntries = loreData || [];
        console.log(
          "✅ [DashboardPage] Lore loaded:",
          loreEntries.length,
          "entries"
        );
      }

      // Quests: is_revealed === true (RLS should handle this, but we can also filter)
      console.log("🔍 [DashboardPage] Fetching Quests for campaign:", id);
      quests = await getQuests(id);
      console.log("✅ [DashboardPage] Quests loaded:", quests.length, "quests");

      console.log("🔍 [DashboardPage] Player Data Summary:", {
        npcs: npcs.length,
        factions: factions.length,
        loreEntries: loreEntries.length,
        quests: quests.length,
      });
    }
  } else {
    console.log("⚠️ [DashboardPage] User has NO ACCESS. Skipping data fetch.");
  }

  // Fetch Campaign Members (GM Only)
  let pendingApplications: any[] = [];
  let draftingMembers: any[] = [];
  let inReviewMembers: any[] = [];
  let acceptedMembers: any[] = [];

  if (isGM) {
    // Fetch members with user and character data
    const { data: members, error: membersError } = await (supabase.from("campaign_members") as any)
      .select(
        `
        id,
        user_id,
        character_id,
        status,
        application_message,
        users (
          id,
          username,
          avatar_url,
          email
        ),
        characters (
          id,
          name,
          class,
          race,
          level,
          status,
          biography,
          avatar_url,
          character_relationships (
            id,
            relationship_type,
            description,
            npcs (
              id,
              name,
              role,
              title
            )
          )
        )
      `
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });

    if (membersError) {
      console.error("❌ Fetch Members Error:", membersError);
    }

    // Debug logging in development
    if (process.env.NODE_ENV === "development" && members) {
      console.log("✅ Fetched Members:", members);
      console.log(
        "Character data check:",
        (members || []).map((m: any) => ({
          id: m.id,
          character_id: m.character_id,
          has_character: !!m.characters,
          character_data: m.characters,
        }))
      );
    }

    if (members) {
      // Map the data to expected format (Supabase returns 'users' and 'characters' as objects)
      const mappedMembers = (members || []).map((m: any) => ({
        ...m,
        user: m.users,
        character: m.characters,
      }));

      // Neuer Workflow: Filter nach Status
      pendingApplications = mappedMembers.filter((m: any) => m.status === "Applied");
      draftingMembers = mappedMembers.filter((m: any) => m.status === "Drafting");
      inReviewMembers = mappedMembers.filter(
        (m: any) => m.status === "In_Review" || m.status === "Changes_Proposed"
      );
      acceptedMembers = mappedMembers.filter(
        (m: any) => m.status === "Accepted" || m.status === "Approved"
      );
    }
  }

  const pendingCount =
    pendingApplications.length +
    draftingMembers.length +
    inReviewMembers.length;

  // Count accepted members (for all users, not just GM)
  let acceptedMembersCount = 0;
  if (isGM) {
    acceptedMembersCount = acceptedMembers.length;
  } else {
    // For non-GM users, count accepted members
    const { count } = await (supabase.from("campaign_members") as any)
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("status", "Accepted");
    acceptedMembersCount = count || 0;
  }

  // ============================================================================
  // LOAD CHARACTER DATA (if user has character)
  // ============================================================================
  let myCharacter: any = null;
  if (userHasCharacter && !isGM) {
    console.log("🔍 [DashboardPage] Loading character data for user:", user.id);
    const { data: characterData, error: characterError } = await (supabase.from("characters") as any)
      .select(
        `
        *,
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
      .eq("user_id", user.id)
      .eq("campaign_id", id)
      .single();

    if (characterError) {
      console.error(
        "❌ [DashboardPage] Error loading character:",
        characterError
      );
    } else {
      myCharacter = characterData;
      console.log("✅ [DashboardPage] Character loaded:", myCharacter?.name);
    }
  }

  // ============================================================================
  // FETCH GALLERY IMAGES (Public images only)
  // ============================================================================
  const galleryImages = await getCampaignGalleryImages(id);

  // ============================================================================
  // TAB CONTENT COMPONENTS
  // ============================================================================

  const OverviewTab = (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left Column (Main Content) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Character Creation Button (for Accepted Players or Drafting) */}
        {!isGM &&
          ((userMembershipStatus === "Accepted" &&
            (!userHasCharacter ||
              (membership &&
                ((membership.characters as any)?.status === "Dead" ||
                  (membership.characters as any)?.status === "Archived")))) ||
            userMembershipStatus === "Drafting") && (
            <div className="rounded-lg border border-hero-vibrant bg-gradient-to-br from-hero-dark/50 to-background-card p-6">
              <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-border pb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-accent-gold" />
                {userMembershipStatus === "Drafting"
                  ? "Charakterentwurf fortsetzen"
                  : "Charakter erstellen"}
              </h2>
              <p className="font-libre text-gray-300 mb-4">
                {userMembershipStatus === "Drafting"
                  ? "Setze deinen Charakterentwurf fort und vervollständige ihn."
                  : "Du wurdest als Spieler akzeptiert! Erstelle jetzt deinen Charakter für diese Kampagne."}
              </p>
              <CharacterCreatorButton
                campaignId={id}
                factions={factions}
                locations={loreEntries}
                npcs={npcs}
              />
            </div>
          )}

        {/* Character Sheet Link (if user has character) */}
        {!isGM && userHasCharacter && myCharacter && (
          <div className="rounded-lg border border-hero-vibrant bg-gradient-to-br from-hero-dark/50 to-background-card p-6">
            <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-border pb-2 flex items-center gap-2">
              <User className="h-5 w-5 text-accent-gold" />
              Mein Charakter
            </h2>
            <p className="font-libre text-gray-300 mb-4">
              Du spielst als{" "}
              <span className="text-hero-vibrant font-semibold">
                {myCharacter.name}
              </span>{" "}
              ({myCharacter.class}, Level {myCharacter.level}).
            </p>
            <Link
              href={`/dashboard/campaigns/${id}?tab=character`}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
            >
              <User className="h-4 w-4" />
              Charakter anzeigen
            </Link>
          </div>
        )}

        {/* Membership Status Messages (for non-GM users) */}
        {!isGM &&
          userMembershipStatus !== "none" &&
          userMembershipStatus !== "Accepted" && (
            <div className="rounded-lg border border-hero-dark bg-background-card p-6">
              <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2">
                Bewerbungsstatus
              </h2>
              {userMembershipStatus === "Pending" ||
              userMembershipStatus === "Applied" ? (
                <p className="font-libre text-gray-300">
                  <span className="text-accent-gold font-semibold">
                    Bewerbung läuft...
                  </span>{" "}
                  Der Spielleiter prüft deine Bewerbung.
                </p>
              ) : userMembershipStatus === "Rejected" ? (
                <p className="font-libre text-gray-300">
                  <span className="text-red-400 font-semibold">
                    Bewerbung abgelehnt.
                  </span>
                </p>
              ) : userMembershipStatus === "In_Review" ? (
                <p className="font-libre text-gray-300">
                  <span className="text-yellow-400 font-semibold">
                    Charakter wird geprüft.
                  </span>
                </p>
              ) : null}
            </div>
          )}

        {/* Description */}
        <div className="rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2">
            Beschreibung
          </h2>
          <p className="font-libre text-gray-300 leading-relaxed whitespace-pre-wrap">
            {campaign.description || "Keine Beschreibung vorhanden."}
          </p>
        </div>

        {/* Campaign Details bearbeiten (GM Only) */}
        {isGM && (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2 flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent-gold" />
              Details bearbeiten
            </h2>
            <form
              action={updateCampaignDetails.bind(null, id)}
              className="space-y-4"
              suppressHydrationWarning={true}
            >
              {/* Banner Image */}
              <div>
                <label
                  htmlFor="banner_url"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Banner Bild URL
                </label>
                <input
                  type="url"
                  id="banner_url"
                  name="banner_url"
                  defaultValue={campaign.banner_url || ""}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
                <p className="mt-1 font-libre text-xs text-gray-500">
                  Wird auf der öffentlichen Kampagnenseite als Hero-Banner
                  verwendet.
                </p>
              </div>

              {/* Frequency */}
              <div>
                <label
                  htmlFor="frequency"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Spielrhythmus
                </label>
                <input
                  type="text"
                  id="frequency"
                  name="frequency"
                  defaultValue={campaign.frequency || ""}
                  placeholder="z.B. Wöchentlich, Freitags 19 Uhr"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Looking For */}
              <div>
                <label
                  htmlFor="looking_for"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Gesucht wird
                </label>
                <input
                  type="text"
                  id="looking_for"
                  name="looking_for"
                  defaultValue={campaign.looking_for || ""}
                  placeholder="z.B. Noch 1 Heiler und 1 Face"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* House Rules */}
              <div>
                <label
                  htmlFor="house_rules"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Hausregeln
                </label>
                <textarea
                  id="house_rules"
                  name="house_rules"
                  defaultValue={campaign.house_rules || ""}
                  rows={4}
                  placeholder="z.B. Keine bösen Charaktere, Homebrew erlaubt nach Absprache"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none resize-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full rounded border border-hero-border bg-hero-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors"
                suppressHydrationWarning={true}
              >
                Speichern
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Column (Sidebar/Tools) */}
      <div className="space-y-6">
        {/* Visibility Toggle (CRITICAL) */}
        {isGM && (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4 flex items-center gap-2">
              {campaign.is_published ? (
                <Eye className="h-5 w-5 text-green-400" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-500" />
              )}
              Sichtbarkeit
            </h3>

            <div className="mb-4">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-barlow font-bold uppercase text-sm ${
                  campaign.is_published
                    ? "bg-green-900/30 text-green-400 border border-green-700"
                    : "bg-gray-700/30 text-gray-400 border border-gray-600"
                }`}
              >
                {campaign.is_published ? "🌍 Öffentlich" : "🔒 Privat"}
              </div>
            </div>

            <p className="font-libre text-xs text-gray-400 mb-4">
              {campaign.is_published
                ? "Diese Kampagne ist auf der Landing Page sichtbar und Spieler können beitreten."
                : "Diese Kampagne ist privat. Nur du kannst sie sehen."}
            </p>

            <form
              action={togglePublishStatus.bind(null, id, campaign.is_published)}
              suppressHydrationWarning={true}
            >
              <button
                type="submit"
                className={`w-full rounded-md border px-4 py-2.5 font-barlow font-bold uppercase text-sm transition-colors ${
                  campaign.is_published
                    ? "border-gray-600 bg-gray-700 text-white hover:bg-gray-600"
                    : "border-hero-border bg-hero-dark text-white hover:bg-hero-vibrant"
                }`}
                suppressHydrationWarning={true}
              >
                {campaign.is_published ? "Privat schalten" : "Veröffentlichen"}
              </button>
            </form>
          </div>
        )}

        {/* Quick Actions */}
        {isGM && (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent-gold" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                className="w-full text-left rounded border border-hero-border/30 bg-background-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-gray-300 hover:border-hero-vibrant hover:text-white transition-colors"
                suppressHydrationWarning={true}
              >
                <Plus className="inline h-4 w-4 mr-2" />
                Neue Session planen
              </button>
              <button
                className="w-full text-left rounded border border-hero-border/30 bg-background-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-gray-300 hover:border-hero-vibrant hover:text-white transition-colors"
                suppressHydrationWarning={true}
              >
                <Users className="inline h-4 w-4 mr-2" />
                Spieler einladen
              </button>
              <button
                className="w-full text-left rounded border border-hero-border/30 bg-background-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-gray-300 hover:border-hero-vibrant hover:text-white transition-colors"
                suppressHydrationWarning={true}
              >
                <Settings className="inline h-4 w-4 mr-2" />
                Einstellungen
              </button>
            </div>
          </div>
        )}

        {/* Player View: Limited Info */}
        {!isGM && (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
              Du bist Spieler
            </h3>
            <p className="font-libre text-sm text-gray-400">
              Als Spieler kannst du die Kampagnendetails einsehen, aber keine
              Änderungen vornehmen.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const SessionsTabContent = (
    <SessionsTab
      campaignId={id}
      isGM={isGM}
      upcomingSessions={(upcomingSessions || []) as any}
      locations={loreEntries
        .filter((l: any) =>
          [
            "Stadt",
            "Region",
            "Ort",
            "Insel",
            "Gebäude",
            "Tempel",
            "Land",
            "Dungeon",
            "Akademie",
            "Markt",
            "Laden",
          ].includes(l.type)
        )
        .map((l: any) => ({ id: l.id, name: l.name, type: l.type }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))}
      npcs={npcs}
    />
  );

  const NPCsTab = !world ? (
    <WorldRequiredBlocker campaignId={id} isGM={isGM} />
  ) : (
    <NPCsManagement
      campaignId={id}
      npcs={npcs}
      factions={factions}
      isGM={isGM}
    />
  );

  const FactionsTab = !world ? (
    <WorldRequiredBlocker campaignId={id} isGM={isGM} />
  ) : (
    <FactionsManagement
      campaignId={id}
      factions={factions}
      npcs={npcs}
      isGM={isGM}
    />
  );

  const LoreTab = !world ? (
    <WorldRequiredBlocker campaignId={id} isGM={isGM} />
  ) : (
    <LoreManagement campaignId={id} loreEntries={loreEntries} isGM={isGM} />
  );

  // Extract characters from accepted members for personal quests
  const availableCharacters = acceptedMembers
    .filter((m: any) => m.character_data && m.character_data.status === "Alive")
    .map((m: any) => ({
      id: m.character_data.id,
      name: m.character_data.name,
      class: m.character_data.class,
      race: m.character_data.race,
      level: m.character_data.level || 1,
    }));

  const QuestTab = (
    <QuestLogManagement
      campaignId={id}
      quests={quests}
      npcs={npcs.map((npc: any) => ({
        id: npc.id,
        name: npc.name,
        title: npc.title,
        role: npc.role,
      }))}
      locations={loreEntries
        .filter((l: any) =>
          [
            "Stadt",
            "Region",
            "Ort",
            "Insel",
            "Gebäude",
            "Tempel",
            "Land",
            "Dungeon",
            "Akademie",
            "Markt",
            "Laden",
          ].includes(l.type)
        )
        .map((l: any) => ({ id: l.id, name: l.name, type: l.type }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))}
      characters={availableCharacters}
      members={acceptedMembers}
      isGM={isGM}
    />
  );

  const MembersTab = (
    <MembersManagement
      campaignId={id}
      pendingApplications={pendingApplications}
      draftingMembers={draftingMembers}
      inReviewMembers={inReviewMembers}
      acceptedMembers={acceptedMembers}
      isGM={isGM}
      factions={factions.filter((f: any) => f.is_revealed)}
      locations={loreEntries.filter(
        (l: any) =>
          l.is_revealed && ["Stadt", "Region", "Dorf"].includes(l.type)
      )}
      npcs={npcs.filter((n: any) => n.is_revealed)}
    />
  );

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Dashboard
      </Link>

      {/* Cinematic Header */}
      <CinematicCampaignHeader
        name={campaign.name}
        system={campaign.system}
        status={campaign.status}
        imageUrl={campaign.banner_url || campaign.image_url || null}
        campaignId={id}
        galleryImages={galleryImages}
      />

      {/* Campaign Stats (below header) */}
      <div className="flex items-center gap-4 text-sm font-libre text-gray-400">
        <span
          className={`flex items-center gap-1 rounded px-3 py-1.5 ${
            acceptedMembersCount >= campaign.max_players
              ? "bg-red-900/30 text-red-400 border border-red-700"
              : acceptedMembersCount >= campaign.max_players * 0.8
              ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700"
              : "bg-green-900/30 text-green-400 border border-green-700"
          }`}
        >
          <Users className="h-4 w-4" />
          {acceptedMembersCount}/{campaign.max_players} Spieler
        </span>
        <span className="flex items-center gap-1 rounded px-3 py-1.5 bg-background-card border border-hero-dark">
          <MapPin className="h-4 w-4" />
          {campaign.mode}
        </span>
      </div>

      {/* Tab Content (Conditional Rendering based on searchParams.tab) */}
      {tab === "overview" && OverviewTab}
      {tab === "sessions" && SessionsTabContent}
      {tab === "lore" && LoreTab}
      {tab === "npcs" && (
        <div className="space-y-6">
          {NPCsTab}
          {isGM && <div className="mt-6">{FactionsTab}</div>}
        </div>
      )}
      {tab === "quests" && QuestTab}
      {tab === "members" && isGM && MembersTab}
      {tab === "character" && userHasCharacter && myCharacter && (
        <CharacterSheet character={myCharacter} />
      )}
      {tab === "settings" && (
        <div className="rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2">
            Kampagnen-Einstellungen
          </h2>
          <p className="font-libre text-gray-400">
            Einstellungen für diese Kampagne (Coming Soon)
          </p>
        </div>
      )}
    </div>
  );
}
