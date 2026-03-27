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
import {
  togglePublishStatus,
  updateCampaignDetails,
} from "./campaign-settings-actions";
import { MembersManagement } from "./MembersManagement";
import { GroupRewardForm } from "@/src/components/campaigns/GroupRewardForm";
import { getNPCs } from "./npc-queries";
import { getFactionsWithMembers } from "./factions-queries";
import { getLoreEntries } from "./lore-queries";
import { isLocationType, TYPE_MAPPING } from "@/src/lib/lore-types";
import { getQuests } from "./quest-queries";
import { NPCsManagement } from "./NPCsManagement";
import { FactionsManagement } from "./FactionsManagement";
import { LoreManagement } from "./LoreManagement";
import { QuestLogManagement } from "./QuestLogManagement";
import { SessionsTab } from "./SessionsTab";
import { Plus } from "lucide-react";
import { CharacterCreatorButton } from "./CharacterCreatorButton";
import { CharacterSheet } from "@/src/components/dashboard/campaigns/CharacterSheet";
import { CinematicCampaignHeader } from "@/src/components/dashboard/campaigns/CinematicCampaignHeader";
import { CampaignDescriptionEditor } from "@/src/components/campaigns/CampaignDescriptionEditor";
import { CampaignScheduleForm } from "@/src/components/dashboard/campaigns/CampaignScheduleForm";
import { getCampaignGalleryImages } from "./gallery-queries";
import { getWorldByCampaign, getWorldsByGm } from "./world-queries";
import { WorldRequiredBlocker } from "@/src/components/dashboard/campaigns/world/WorldRequiredBlocker";
import { OnboardingSettings } from "@/src/components/dashboard/campaigns/OnboardingSettings";
import { ApplyToCampaignBlock } from "./ApplyToCampaignBlock";
import { DiscoverySlider } from "@/src/components/dashboard/player/DiscoverySlider";
import { PartyOverview } from "@/src/components/dashboard/player/PartyOverview";
import { MyCharacterSection } from "@/src/components/dashboard/player/MyCharacterSection";
import { getCharacterWizardLoreData } from "./character-queries";
import { getVisibilityForCampaign } from "./campaign-visibility-queries";
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import { getCharacterFactionReputations } from "./reputation-queries";
import type {
  DiscoveryItem,
  PartyMember,
} from "@/src/app/dashboard/campaigns/[id]/player-dashboard/page";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export const dynamic = "force-dynamic";

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

  const campaign = campaignRaw as {
    id: string;
    gm_id: string;
    owner_id?: string;
    [key: string]: any;
  } | null;

  if (!campaign) {
    notFound();
  }

  // Security: Check if user is GM (Ersteller/Spielleiter)
  // Fallback: owner_id falls vorhanden; String-Vergleich wegen evtl. Typunterschieden (UUID)
  const campaignGmId = campaign.gm_id != null ? String(campaign.gm_id) : null;
  const campaignOwnerId =
    (campaign as any).owner_id != null
      ? String((campaign as any).owner_id)
      : null;
  const currentUserId = user.id != null ? String(user.id) : "";
  const isGM =
    (campaignGmId !== null && campaignGmId === currentUserId) ||
    (campaignOwnerId !== null && campaignOwnerId === currentUserId);

  console.log("🔍 [CampaignPage] GM check:", {
    campaignId: id,
    userId: currentUserId,
    campaignGmId,
    campaignOwnerId,
    isGM,
  });

  // Welt über campaign.world_id (welt-zentrisch)
  let world: any = null;
  const campaignWorldId = (campaign as any).world_id;
  if (campaignWorldId) {
    const { data: worldRaw, error: worldError } = await (
      supabase.from("worlds") as any
    )
      .select("*")
      .eq("id", campaignWorldId)
      .single();
    if (worldError && worldError.code !== "PGRST116") {
      console.error("Error fetching world:", worldError);
    } else {
      world = worldRaw;
    }
  }

  // Welten des GMs für Welt-Zuweisung (wenn Kampagne noch keine world_id hat)
  let gmWorlds: { id: string; name: string; description: string | null }[] = [];
  if (isGM && !world) {
    gmWorlds = await getWorldsByGm(user.id);
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
  let isDeadOrArchived = false;
  let membership: any = null;

  if (!isGM) {
    console.log("🔍 [DashboardPage] Checking Membership for Campaign:", id);
    console.log("🔍 [DashboardPage] User ID:", user.id);

    const { data: membershipData, error: membershipError } = await (
      supabase.from("campaign_members") as any
    )
      .select("status, character_id")
      .eq("campaign_id", id)
      .eq("user_id", user.id)
      .single();

    if (membershipError) {
      console.error("🔍 [DashboardPage] Membership query error:", membershipError);
    }

    if (membershipData) {
      membership = membershipData;
      userMembershipStatus = membership.status as any;
      userHasCharacter = !!membership.character_id;

      // Charakter-Status separat laden (kein Join – FK kann fehlen)
      let characterStatus: string | null = null;
      if (membership.character_id) {
        const { data: charRow } = await (supabase.from("characters") as any)
          .select("status")
          .eq("id", membership.character_id)
          .single();
        characterStatus = (charRow as { status: string } | null)?.status ?? null;
      }
      isDeadOrArchived =
        characterStatus === "Dead" || characterStatus === "Archived";

      // User has access if accepted / am Charakter arbeiten / Review
      const validMemberStatuses = [
        "Accepted",
        "Approved",
        "Drafting",
        "In_Review",
        "Changes_Proposed",
      ];
      isAcceptedMember = validMemberStatuses.includes(membership.status);

      console.log(
        "🔍 [DashboardPage] Membership Status:",
        userMembershipStatus,
      );
      console.log("🔍 [DashboardPage] User Has Character:", userHasCharacter);
      console.log(
        "🔍 [DashboardPage] Derived isAcceptedMember:",
        isAcceptedMember,
        "(valid statuses: Accepted, Drafting, In_Review)",
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
    { isGM, isAcceptedMember },
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

  // Zukünftige Termine ODER laufende Live-Sessions (GM muss diese sehen/beenden können)
  const now = new Date();
  const upcomingSessions = (sessions || []).filter(
    (s: any) =>
      s.status !== "Cancelled" &&
      (s.status === "Live" || (s.start_time && new Date(s.start_time) > now)),
  );

  // RSVP-Status für geplante Sessions (GM: kann Session starten?)
  let upcomingSessionsWithRsvp: Array<{
    id: string;
    title: string | null;
    start_time: string;
    type: string;
    status: string;
    canStart?: boolean;
    pendingCount?: number;
  }> = upcomingSessions as any[];
  if (isGM && upcomingSessions.length > 0) {
    const scheduledIds = upcomingSessions
      .filter((s: any) => s.status === "Scheduled")
      .map((s: any) => s.id);
    if (scheduledIds.length > 0) {
      const [membersRes, rsvpsRes] = await Promise.all([
        (supabase.from("campaign_members") as any)
          .select("user_id")
          .eq("campaign_id", id)
          .eq("status", "Accepted"),
        (supabase.from("session_rsvps") as any)
          .select("session_id, user_id, rsvp_status")
          .in("session_id", scheduledIds),
      ]);
      const memberIds = new Set(
        ((membersRes.data as any[]) || []).map((m: any) => m.user_id)
      );
      const rsvpsBySession = new Map<string, Set<string>>();
      const acceptedRsvpsBySession = new Map<string, boolean>();
      for (const r of (rsvpsRes.data as any[]) || []) {
        if (!rsvpsBySession.has(r.session_id))
          rsvpsBySession.set(r.session_id, new Set());
        rsvpsBySession.get(r.session_id)!.add(r.user_id);
        if (r.rsvp_status === "Zusage" || r.rsvp_status === "Via Online") {
          acceptedRsvpsBySession.set(r.session_id, true);
        }
      }
      upcomingSessionsWithRsvp = upcomingSessions.map((s: any) => {
        if (s.status !== "Scheduled")
          return { ...s, canStart: false, pendingCount: 0, hasAcceptedRsvps: false };
        const rsvpUserIds = rsvpsBySession.get(s.id) ?? new Set();
        const pendingCount = [...memberIds].filter((uid) => !rsvpUserIds.has(uid)).length;
        return {
          ...s,
          canStart: pendingCount === 0,
          pendingCount,
          hasAcceptedRsvps: acceptedRsvpsBySession.get(s.id) ?? false,
        };
      });
    }
  }

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
    isGM,
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

      // Factions: alle laden, Sichtbarkeit aus campaign_visibility; für Anzeige: is_revealed ODER allow_pc_join_on_creation
      console.log("🔍 [DashboardPage] Fetching Factions for campaign:", id);
      factions = await getFactionsWithMembers(id);
      factions = factions.filter(
        (f: any) => f.is_revealed === true || f.allow_pc_join_on_creation === true
      );
      console.log("✅ [DashboardPage] Factions loaded:", factions.length, "factions");

      // Lore: über getLoreEntries (filtert nach campaign_visibility.is_revealed)
      console.log("🔍 [DashboardPage] Fetching Lore for campaign:", id);
      loreEntries = await getLoreEntries(id);
      console.log("✅ [DashboardPage] Lore loaded:", loreEntries.length, "entries");

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
    // Offene Bewerbungen: Primär aus `characters` (Status Pending_Approval).
    // Nicht nur campaign_members – Spieler-Charaktere hängen in characters.
    // Ohne users-Join (characters.user_id → auth.users), stattdessen profiles separat laden
    const { data: pendingChars, error: pendingCharsError } = await (
      supabase.from("characters") as any
    )
      .select("id, user_id, name, class, race, level, status, biography, avatar_url")
      .eq("campaign_id", id)
      .eq("status", "Pending_Approval")
      .order("created_at", { ascending: true });

    if (pendingCharsError) {
      console.error("❌ Fetch Pending Characters Error:", pendingCharsError);
    }

    let userMap = new Map<string, { id: string; username: string; avatar_url: string | null }>();
    if ((pendingChars || []).length > 0) {
      const userIds = [...new Set((pendingChars || []).map((c: any) => c.user_id).filter(Boolean))];
      const { data: userRows } = await (supabase.from("users") as any)
        .select("id, username, avatar_url")
        .in("id", userIds);
      userMap = new Map(
        ((userRows as any[]) || []).map((u: any) => [
          u.id,
          { id: u.id, username: u.username ?? "Unbekannt", avatar_url: u.avatar_url ?? null },
        ])
      );
      if (userMap.size === 0 && userIds.length > 0) {
        const { data: profileRows } = await (supabase.from("profiles") as any)
          .select("id, username")
          .in("id", userIds);
        userMap = new Map(
          ((profileRows as any[]) || []).map((p: any) => [
            p.id,
            { id: p.id, username: p.username ?? "Unbekannt", avatar_url: null },
          ])
        );
      }
    }

    const pendingFromCharacters = (pendingChars || []).map((c: any) => {
      const u = userMap.get(c.user_id) ?? { id: c.user_id ?? "", username: "Unbekannt", avatar_url: null };
      return {
      id: `char-${c.id}`,
      user_id: c.user_id,
      character_id: c.id,
      status: "Applied",
      application_message: null,
      user: {
        id: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
      },
      character: {
        id: c.id,
        name: c.name,
        class: c.class,
        race: c.race,
        level: c.level ?? 1,
        status: c.status,
        biography: c.biography ?? null,
        avatar_url: c.avatar_url ?? null,
      },
    };
    });
    const userIdsWithPendingChar = new Set(
      pendingFromCharacters.map((a: any) => a.user_id),
    );

    // Zusätzlich: campaign_members mit Status Applied (Bewerbung ohne Charakter)
    const { data: appliedMembers } = await (
      supabase.from("campaign_members") as any
    )
      .select(
        "id, user_id, character_id, application_message, users(id, username, avatar_url)",
      )
      .eq("campaign_id", id)
      .eq("status", "Applied");

    const appliedList = (appliedMembers || []).filter(
      (m: any) => !userIdsWithPendingChar.has(m.user_id),
    );
    const fromMembers = appliedList.map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      character_id: m.character_id ?? null,
      status: "Applied",
      application_message: m.application_message ?? null,
      user: m.users
        ? {
            id: m.users.id,
            username: m.users.username ?? "Unbekannt",
            avatar_url: m.users.avatar_url,
          }
        : { id: "", username: "Unbekannt", avatar_url: null },
      character: null,
    }));

    pendingApplications = [...pendingFromCharacters, ...fromMembers];
  }

  if (isGM) {
    try {
      const { getGmCampaignMembersWithCharacters } = await import("./members-actions");
      const { drafting, inReview, accepted } = await getGmCampaignMembersWithCharacters(id);
      draftingMembers = drafting as any[];
      inReviewMembers = inReview as any[];
      acceptedMembers = accepted as any[];
    } catch (err) {
      console.error("❌ getGmCampaignMembersWithCharacters:", err);
      draftingMembers = [];
      inReviewMembers = [];
      acceptedMembers = [];
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
  // LOAD CHARACTER DATA (if user has character) – inkl. Kultur, Sprachen, Fraktion, Ort
  // ============================================================================
  let myCharacter: any = null;
  if (!isGM) {
    try {
      const characterId = membership?.character_id ?? null;
      let characterData: any = null;
      if (characterId) {
        const res = await (supabase.from("characters") as any)
          .select("*")
          .eq("id", characterId)
          .maybeSingle();
        characterData = res.data;
        if (res.error) console.warn("[DashboardPage] Character load error:", res.error.message);
      } else {
        const res = await (supabase.from("characters") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("campaign_id", id)
          .maybeSingle();
        characterData = res.data;
        if (res.error) console.warn("[DashboardPage] Character load error:", res.error.message);
      }
      // Beziehungen separat laden (kein Join – Schema-Cache-Probleme)
      if (characterData) {
        const charId = characterData.id;
        const { data: relRows } = await (supabase.from("character_relationships") as any)
          .select("relationship_type, description, npc_id")
          .eq("character_id", charId);
        const npcIds = [...new Set(((relRows as any[]) ?? []).map((r: any) => r.npc_id).filter(Boolean))];
        let npcMap = new Map<string, { id: string; name: string; role: string | null; title: string | null }>();
        if (npcIds.length > 0) {
          const { data: npcRows } = await (supabase.from("npcs") as any)
            .select("id, name, role, title")
            .in("id", npcIds);
          npcMap = new Map(((npcRows as any[]) ?? []).map((n: any) => [n.id, { id: n.id, name: n.name, role: n.role, title: n.title }]));
        }
        (characterData as any).character_relationships = ((relRows as any[]) ?? []).map((r: any) => ({
          relationship_type: r.relationship_type,
          description: r.description,
          npcs: r.npc_id ? npcMap.get(r.npc_id) ?? null : null,
        }));
      }
      if (characterData) {
        // Namen für Kultur, Fraktion, Ort auflösen
        const cultureId = characterData.culture_lore_id;
        const factionId = characterData.faction_membership;
        const locationId = characterData.current_location_id;
        const langIds = (characterData.languages as string[]) ?? [];

        if (cultureId) {
          const { data: cultureRow } = await (supabase.from("world_lore") as any)
            .select("name")
            .eq("id", cultureId)
            .single();
          (characterData as any).culture_name = (cultureRow as { name: string } | null)?.name ?? null;
        }
        if (factionId) {
          const { data: factionRow } = await (supabase.from("factions") as any)
            .select("name")
            .eq("id", factionId)
            .single();
          (characterData as any).faction_name = (factionRow as { name: string } | null)?.name ?? null;
        }
        if (locationId) {
          const { data: locRow } = await (supabase.from("world_lore") as any)
            .select("name")
            .eq("id", locationId)
            .single();
          (characterData as any).location_name = (locRow as { name: string } | null)?.name ?? null;
        }
        if (langIds.length > 0) {
          const { data: langRows } = await (supabase.from("world_lore") as any)
            .select("id, name")
            .in("id", langIds);
          const langMap = new Map(((langRows as { id: string; name: string }[]) ?? []).map((l) => [l.id, l.name]));
          (characterData as any).language_names = langIds.map((lid: string) => langMap.get(lid) ?? lid);
        }
        myCharacter = characterData;
      }
    } catch (err) {
      console.warn("[DashboardPage] Character load exception:", err);
      myCharacter = null;
    }
  }

  if (!isGM && membership) {
    userHasCharacter = !!myCharacter;
  }

  /** Flight/RSC: volle characters-Zeile enthält JSONB/Felder, die Client-Grenzen sprengen können */
  const myCharacterForClient =
    !isGM && myCharacter ? serializeForClient(myCharacter) : null;

  // ============================================================================
  // PLAYER: Load discoveries + party for direct player-dashboard view
  // ============================================================================
  let allDiscoveries: DiscoveryItem[] = [];
  let party: PartyMember[] = [];
  const myCharacterId = myCharacter?.id ?? membership?.character_id ?? null;

  if (!isGM && hasAccess) {
    const loreItems: DiscoveryItem[] = (loreEntries || []).slice(0, 8).map((e: any) => ({
      id: String(e.id),
      name: String(e.name ?? ""),
      kind: "lore" as const,
      description: e.description != null ? String(e.description) : null,
      image_url: e.image_url != null ? String(e.image_url) : null,
      type: String(e.type ?? ""),
      created_at: e.created_at != null ? String(e.created_at) : "",
    }));
    const factionItems: DiscoveryItem[] = (factions || []).slice(0, 8).map((e: any) => ({
      id: String(e.id),
      name: String(e.name ?? ""),
      kind: "faction" as const,
      description: e.description != null ? String(e.description) : null,
      image_url: null,
      type: String(e.type ?? ""),
      created_at: e.created_at != null ? String(e.created_at) : "",
    }));
    const npcItems: DiscoveryItem[] = (npcs || []).slice(0, 8).map((e: any) => ({
      id: String(e.id),
      name: String(e.name ?? ""),
      kind: "npc" as const,
      description: e.description != null ? String(e.description) : null,
      image_url: null,
      type: e.title != null ? String(e.title) : undefined,
      created_at: e.created_at != null ? String(e.created_at) : "",
    }));
    allDiscoveries = [...loreItems, ...factionItems, ...npcItems]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 8);

    const { data: partyCharacters } = await (supabase.from("characters") as any)
      .select("id, name, class, race, level, culture_lore_id, users(avatar_url)")
      .eq("campaign_id", id)
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
    party = (partyCharacters || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      class: c.class ?? "",
      race: c.race ?? "",
      level: c.level ?? 1,
      culture: c.culture_lore_id ? (cultureMap.get(c.culture_lore_id) ?? "") : "",
      avatar_url: c.users?.avatar_url ?? null,
    }));
  }

  // ============================================================================
  // FETCH GALLERY IMAGES (Public images only)
  // ============================================================================
  const galleryImages = await getCampaignGalleryImages(id);

  // Charakter-Wizard (Spieler): world_lore + allow_pc_origin + campaign_visibility dieser Kampagne; Fraktionen analog
  // Typen wie in DB: Stadt, Region, Ort, Akademie (case-insensitive)
  const GEOGRAPHIC_TYPES = [
    "Stadt",
    "Region",
    "Ort",
    "Akademie",
    "Tempel",
    "Gilde",
  ];
  const typeMatchesGeographic = (type: string | null | undefined) =>
    GEOGRAPHIC_TYPES.some(
      (t) => String(t).toLowerCase() === String(type ?? "").toLowerCase(),
    );

  let wizardFactions: any[] = [];
  let wizardLocations: any[] = [];

  if (isGM) {
    wizardFactions = factions;
    wizardLocations = (loreEntries || []).filter((e: any) => typeMatchesGeographic(e.type));
  } else if (campaignWorldId) {
    // Fraktionen: select("*") um PostgREST Schema-Cache-Probleme zu vermeiden,
    // dann im Code nach allow_pc_join_on_creation filtern.
    const { data: allWorldFactions, error: pcFErr } = await (supabase.from("factions") as any)
      .select("*")
      .eq("world_id", campaignWorldId);
    if (pcFErr) console.error("❌ wizardFactions query error:", JSON.stringify(pcFErr));
    wizardFactions = ((allWorldFactions || []) as any[]).filter(
      (f: any) => f.allow_pc_join_on_creation === true
    );
    console.log("✅ wizardFactions:", wizardFactions.length, wizardFactions.map((f: any) => f.name));

    // Orte: select("*") und im Code nach allow_pc_origin filtern
    const { data: allWorldLore, error: pcLErr } = await (supabase.from("world_lore") as any)
      .select("*")
      .eq("world_id", campaignWorldId);
    if (pcLErr) {
      const errMsg = (pcLErr as { message?: string })?.message ?? String(pcLErr);
      console.error("❌ wizardLocations query error:", errMsg.length > 300 ? errMsg.slice(0, 300) + "…" : errMsg);
    }
    wizardLocations = ((allWorldLore || []) as any[]).filter(
      (e: any) => typeMatchesGeographic(e.type) && e.allow_pc_origin === true
    );
    const [loreVisWizard, facVisWizard] = await Promise.all([
      getVisibilityForCampaign(id, "lore"),
      getVisibilityForCampaign(id, "faction"),
    ]);
    wizardLocations = wizardLocations.filter((e: any) => loreVisWizard[e.id] === true);
    wizardFactions = wizardFactions.filter((f: any) => facVisWizard[f.id] === true);
    console.log("✅ wizardLocations:", wizardLocations.length, wizardLocations.map((l: any) => l.name));
  } else {
    console.log("⚠️ wizardFactions/wizardLocations: kein campaignWorldId, isGM=", isGM);
  }

  if (!isGM) {
    console.log("SPIELER_DATEN_CHECK:", {
      locations: wizardLocations,
      factions: wizardFactions,
    });
  }

  // Kulturen, Sprachen & Ruf für Charakter-Bearbeitung (Spieler mit Charakter)
  let wizardCultures: { id: string; name: string }[] = [];
  let wizardLanguages: { id: string; name: string }[] = [];
  let characterReputations: { id: string; faction_id: string; faction_name: string; reputation: number; rank: string | null }[] = [];
  if (!isGM && myCharacter) {
    const [loreData, repData] = await Promise.all([
      getCharacterWizardLoreData(id),
      getCharacterFactionReputations(myCharacter.id, id),
    ]);
    wizardCultures = loreData.cultures.map((c) => ({ id: c.id, name: c.name }));
    wizardLanguages = loreData.languages.map((l) => ({ id: l.id, name: l.name }));
    characterReputations = repData.map((r) => ({
      id: r.id,
      faction_id: r.faction_id,
      faction_name: r.faction_name,
      reputation: r.reputation,
      rank: r.rank ?? null,
    }));
  }

  // ============================================================================
  // TAB CONTENT COMPONENTS
  // ============================================================================

  const OverviewTab = (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left Column (Main Content) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Apply to Campaign (when not yet a member) */}
        {!isGM && userMembershipStatus === "none" && (
          <ApplyToCampaignBlock campaignId={id} />
        )}

        {/* Character Creation Button (for Accepted Players or Drafting) */}
        {!isGM &&
          ((userMembershipStatus === "Accepted" &&
            (!userHasCharacter || isDeadOrArchived)) ||
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
              <CharacterCreatorButton campaignId={id} />
            </div>
          )}

        {/* Character Sheet Link (if user has character) */}
        {!isGM && userHasCharacter && myCharacter && (
          <div className="rounded-lg border border-hero-vibrant bg-gradient-to-br from-hero-dark/50 to-background-card p-6">
            {(myCharacter as any).status === "Pending_Approval" && (
              <div className="mb-4 rounded border border-accent-gold/50 bg-accent-gold/10 p-3">
                <p className="font-libre text-sm text-accent-gold">
                  Dein Charakter wird vom Spielleiter geprüft. Du kannst erst an
                  Sessions teilnehmen, wenn er freigeschaltet ist.
                </p>
              </div>
            )}
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

        {/* Description – GM gets Rich-Text Editor, Players get rendered HTML */}
        {isGM ? (
          <CampaignDescriptionEditor
            campaignId={id}
            initialContent={campaign.description || ""}
          />
        ) : (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2">
              Beschreibung
            </h2>
            {campaign.description ? (
              <div
                className="campaign-description-prose font-libre text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: campaign.description }}
              />
            ) : (
              <p className="font-libre text-gray-500 italic">
                Keine Beschreibung vorhanden.
              </p>
            )}
          </div>
        )}

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
              {/* Kampagnenname */}
              <div>
                <label
                  htmlFor="name"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Kampagnenname *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={campaign.name || ""}
                  placeholder="z.B. Zeitalter der Wiedergeburt"
                  required
                  minLength={2}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>
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

        {/* Spielplan & Termine (GM Only) */}
        {isGM && (
          <CampaignScheduleForm
            campaignId={id}
            initialInterval={campaign.schedule_interval ?? null}
            initialDay={campaign.schedule_day ?? null}
            initialTime={campaign.schedule_time ?? null}
            initialDuration={campaign.schedule_duration_hours ?? null}
            initialFrequencyNote={campaign.frequency ?? null}
          />
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
              <Link
                href={`/dashboard/campaigns/${id}?tab=settings`}
                className="flex w-full items-center rounded border border-hero-border/30 bg-background-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-gray-300 hover:border-hero-vibrant hover:text-white transition-colors"
              >
                <Settings className="inline h-4 w-4 mr-2" />
                Einstellungen
              </Link>
            </div>
          </div>
        )}

        {/* Player View: Link zum Spieler-Dashboard */}
        {!isGM && (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
              Du bist Spieler
            </h3>
            <p className="font-libre text-sm text-gray-400 mb-4">
              Als Spieler kannst du die Kampagnendetails einsehen, aber keine
              Änderungen vornehmen.
            </p>
            <Link
              href={`/dashboard/campaigns/${id}/player-dashboard`}
              className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark/50 px-4 py-2.5 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-dark transition-colors"
            >
              <User className="h-4 w-4" />
              Mein Kampagnen-Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  const sessionsTabNpcs = (npcs || []).map((n: any) => ({
    id: String(n.id),
    name: String(n.name ?? ""),
    title: n.title != null ? String(n.title) : null,
  }));

  const SessionsTabContent = (
    <SessionsTab
      campaignId={id}
      isGM={isGM}
      characterStatus={!isGM ? (myCharacter as any)?.status : undefined}
      upcomingSessions={(upcomingSessionsWithRsvp || []) as any}
      locations={loreEntries
        .filter((l: any) => isLocationType(l.type))
        .map((l: any) => ({ id: String(l.id), name: String(l.name ?? ""), type: String(l.type ?? "") }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))}
      npcs={sessionsTabNpcs}
    />
  );

  const NPCsTab = !world ? (
    <WorldRequiredBlocker campaignId={id} isGM={isGM} worlds={gmWorlds} />
  ) : (
    <NPCsManagement
      campaignId={id}
      worldId={campaignWorldId ?? undefined}
      npcs={npcs}
      factions={factions}
      isGM={isGM}
    />
  );

  const FactionsTab = !world ? (
    <WorldRequiredBlocker campaignId={id} isGM={isGM} worlds={gmWorlds} />
  ) : (
    <FactionsManagement
      campaignId={id}
      worldId={campaignWorldId ?? undefined}
      factions={factions}
      npcs={npcs}
      isGM={isGM}
    />
  );

  const LoreTab = !world ? (
    <WorldRequiredBlocker campaignId={id} isGM={isGM} worlds={gmWorlds} />
  ) : (
    <LoreManagement campaignId={id} worldId={campaignWorldId ?? undefined} loreEntries={loreEntries} isGM={isGM} />
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
        .filter((l: any) => isLocationType(l.type))
        .map((l: any) => ({ id: l.id, name: l.name, type: l.type }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))}
      characters={availableCharacters}
      members={acceptedMembers}
      isGM={isGM}
    />
  );

  const MembersTab = (
    <div className="space-y-6">
      {/* Group Reward Form (GM Only) */}
      {isGM && acceptedMembers.length > 0 && (
        <GroupRewardForm
          campaignId={id}
          memberCount={acceptedMembers.length}
        />
      )}

      {/* Members Management */}
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
            l.is_revealed && ["Stadt", "Region", "Dorf"].includes(l.type),
        )}
        npcs={npcs.filter((n: any) => n.is_revealed)}
      />
    </div>
  );

  // Sichere Fallbacks für Einstellungen/Onboarding
  const safeFactions = factions ?? [];
  const safeLoreEntries = loreEntries ?? [];
  const safeNpcs = npcs ?? [];
  const onboardingLocations = safeLoreEntries.filter((e: any) =>
    typeMatchesGeographic(e.type),
  );

  /** Wie Charakter-Wizard / getCharacterWizardLoreData: Rasse, Kultur, Sprache (siehe TYPE_MAPPING.Culture). */
  const wizardLoreTypes = new Set(TYPE_MAPPING.Culture);
  const cultureLanguageLoreForSettings = safeLoreEntries
    .filter((e: any) => wizardLoreTypes.has(String(e.type ?? "")))
    .map((e: any) => ({
      id: e.id as string,
      name: String(e.name ?? ""),
      type: String(e.type ?? ""),
      is_revealed: !!e.is_revealed,
    }));

  const SettingsTabContent = (
    <div className="space-y-8">
      <h2 className="font-barlow font-bold text-xl text-white uppercase border-b border-hero-dark pb-2">
        Kampagnen-Einstellungen
      </h2>

      {/* Allgemeine Einstellungen */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-barlow font-bold text-lg text-accent-gold uppercase mb-4 border-b border-hero-border pb-2">
              Allgemeine Einstellungen
            </h3>
            <form
              action={updateCampaignDetails.bind(null, id)}
              className="space-y-4"
              suppressHydrationWarning={true}
            >
              <div>
                <label
                  htmlFor="settings_name"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Kampagnenname *
                </label>
                <input
                  type="text"
                  id="settings_name"
                  name="name"
                  defaultValue={campaign.name || ""}
                  placeholder="z.B. Zeitalter der Wiedergeburt"
                  required
                  minLength={2}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label
                  htmlFor="settings_banner_url"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Banner Bild URL
                </label>
                <input
                  type="url"
                  id="settings_banner_url"
                  name="banner_url"
                  defaultValue={campaign.banner_url || ""}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label
                  htmlFor="settings_looking_for"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Gesucht wird
                </label>
                <input
                  type="text"
                  id="settings_looking_for"
                  name="looking_for"
                  defaultValue={campaign.looking_for || ""}
                  placeholder="z.B. Noch 1 Heiler und 1 Face"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label
                  htmlFor="settings_house_rules"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Hausregeln
                </label>
                <textarea
                  id="settings_house_rules"
                  name="house_rules"
                  defaultValue={campaign.house_rules || ""}
                  rows={4}
                  placeholder="z.B. Keine bösen Charaktere, Homebrew erlaubt nach Absprache"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none resize-none"
                  suppressHydrationWarning={true}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded border border-hero-border bg-hero-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors"
                suppressHydrationWarning={true}
              >
                Speichern
              </button>
            </form>
          </div>

          {/* Spielplan & Termine */}
          <CampaignScheduleForm
            campaignId={id}
            initialInterval={campaign.schedule_interval ?? null}
            initialDay={campaign.schedule_day ?? null}
            initialTime={campaign.schedule_time ?? null}
            initialDuration={campaign.schedule_duration_hours ?? null}
            initialFrequencyNote={campaign.frequency ?? null}
          />
        </div>
        <div className="space-y-6">
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
        </div>
      </div>

      {/* Onboarding */}
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h3 className="font-barlow font-bold text-lg text-accent-gold uppercase mb-4 border-b border-hero-border pb-2">
          Onboarding
        </h3>
        <OnboardingSettings
          campaignId={id}
          factions={safeFactions}
          locations={onboardingLocations}
          cultureLanguageLore={cultureLanguageLoreForSettings}
          npcs={safeNpcs.map((n: any) => ({
            id: n.id,
            name: n.name ?? "",
            title: n.title ?? null,
            role: n.role ?? null,
            allow_pc_onboarding: n.allow_pc_onboarding ?? false,
          }))}
        />
      </div>
    </div>
  );

  // Spieler-Übersicht (Home-Base): DiscoverySlider, Mein Charakter, PartyOverview
  const PlayerOverviewContent = (
    <div className="space-y-8">
      {!isGM &&
        ((userMembershipStatus === "Accepted" &&
          (!userHasCharacter || isDeadOrArchived)) ||
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
            <CharacterCreatorButton campaignId={id} />
          </div>
        )}
      <DiscoverySlider items={allDiscoveries} />
      {myCharacterForClient ? (
        <div className="space-y-4">
          <CharacterSheet
            character={myCharacterForClient as any}
            campaignId={id}
            factionReputations={characterReputations}
          />
          <Link
            href={`/dashboard/campaigns/${id}?tab=character`}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
          >
            <User className="h-4 w-4" />
            Charakterblatt bearbeiten
          </Link>
        </div>
      ) : (
        <section className="rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
            <User className="h-6 w-6 text-accent-gold" />
            Mein Charakter
          </h2>
          <p className="font-libre text-gray-500 italic">
            Du hast noch keinen Charakter für diese Kampagne. Erstelle einen über die Box oben.
          </p>
        </section>
      )}
      <PartyOverview party={party} />
    </div>
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
      {tab === "overview" && !isGM && hasAccess && PlayerOverviewContent}
      {tab === "overview" && (isGM || !hasAccess) && OverviewTab}
      {tab === "sessions" &&
        !isGM &&
        hasAccess &&
        !myCharacter && (
          <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-8 text-center space-y-4">
            <p className="font-barlow font-bold text-lg text-amber-200 uppercase">
              Termine & Rückmeldung
            </p>
            <p className="font-libre text-gray-300 max-w-lg mx-auto">
              Eine Rückmeldung zu geplanten Terminen (Zusage/Absage) ist erst möglich,
              wenn du einen Charakter für diese Kampagne erstellt hast.
            </p>
            <Link
              href={`/dashboard/campaigns/${id}/character/new`}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-5 py-2.5 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
            >
              Charakter erstellen
            </Link>
          </div>
        )}
      {tab === "sessions" && (isGM || (hasAccess && myCharacter)) && SessionsTabContent}
      {tab === "lore" && LoreTab}
      {tab === "npcs" && (
        <div className="space-y-6">
          {NPCsTab}
          {isGM && <div className="mt-6">{FactionsTab}</div>}
        </div>
      )}
      {tab === "quests" && QuestTab}
      {tab === "members" && isGM && MembersTab}
      {tab === "character" && userHasCharacter && myCharacterForClient && (
        <MyCharacterSection
          campaignId={id}
          character={myCharacterForClient as any}
          cultures={wizardCultures}
          languages={wizardLanguages}
          factions={wizardFactions.map((f: any) => ({ id: String(f.id), name: String(f.name ?? "") }))}
          locations={wizardLocations.map((l: any) => ({
            id: String(l.id),
            name: String(l.name ?? ""),
            type: String(l.type ?? ""),
          }))}
          factionReputations={characterReputations}
        />
      )}
      {tab === "settings" && isGM && SettingsTabContent}
      {tab === "settings" && !isGM && (
        <div className="rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2">
            Kampagnen-Einstellungen
          </h2>
          <p className="font-libre text-gray-400">
            Nur der Spielleiter kann Einstellungen einsehen und ändern.
          </p>
        </div>
      )}
    </div>
  );
}
