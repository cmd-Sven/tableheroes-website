import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import type {
  GmTermineNextSession,
  GmTerminePlayerRsvp,
} from "@/src/components/campaigns/GmTermineSpielplanCard";
import { getNPCs } from "./npc-queries";
import { getFactionsWithMembers } from "./factions-queries";
import { getLoreEntries } from "./lore-queries";
import { isLocationType, TYPE_MAPPING } from "@/src/lib/lore-types";
import { getQuests } from "./quest-queries";
import { isPlayerReadyForSessionStart } from "./session-rsvp-readiness";
import { getCampaignGalleryImages } from "./gallery-queries";
import { getWorldsByGm } from "./world-queries";
import { getCharacterWizardLoreData } from "./character-queries";
import { getVisibilityForCampaign } from "./campaign-visibility-queries";
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import { fetchAvatarDisplayMapForCampaign } from "@/src/lib/characters/fetch-avatar-display-map";
import {
  isSessionStatusLive,
  isSessionStatusScheduled,
} from "@/src/lib/session-status";
import { partitionCampaignSessionsForTab, isMissedScheduledSession } from "@/src/lib/session-focus";
import { getCharacterFactionReputations } from "./reputation-queries";
import type { RsvpStatus } from "@/src/lib/types/dashboard-widgets";
import type {
  DiscoveryItem,
  PartyMember,
} from "@/src/app/dashboard/campaigns/[id]/player-dashboard/page";

export type CampaignDetailPageData = Awaited<
  ReturnType<typeof loadCampaignDetailPageData>
>;

export async function loadCampaignDetailPageData(
  campaignId: string,
  userId: string,
) {
  const id = campaignId;
  const supabase = await createClient();

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
  const currentUserId = userId != null ? String(userId) : "";
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
    gmWorlds = await getWorldsByGm(userId);
  }

  // Check user's membership status (for non-GM users)
  let userMembershipStatus:
    | "none"
    | "Applied"
    | "Drafting"
    | "In_Review"
    | "Changes_Proposed"
    | "Approved"
    | "Active"
    | "Rejected"
    | "Removed" = "none";
  let userHasCharacter = false;
  let isAcceptedMember = false;
  let isDeadOrArchived = false;
  let membership: any = null;

  if (!isGM) {
    console.log("🔍 [DashboardPage] Checking Membership for Campaign:", id);
    console.log("🔍 [DashboardPage] User ID:", userId);

    const { data: membershipData, error: membershipError } = await (
      supabase.from("campaign_members") as any
    )
      .select("status, character_id")
      .eq("campaign_id", id)
      .eq("user_id", userId)
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
        "Approved",
        "Active",
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
        "(valid statuses: Approved, Active, Drafting, In_Review, Changes_Proposed)",
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

  /** RSVP-Zeilen für GM-Termin-Card (nur geplante Sessions mit IDs) */
  let gmSessionRsvpRows: {
    session_id: string;
    user_id: string;
    rsvp_status: string;
    gm_confirmed: boolean;
  }[] = [];

  if (isGM) {
    try {
      const { expirePastScheduledSessionsForCampaign } = await import(
        "./session-actions",
      );
      await expirePastScheduledSessionsForCampaign(id);
    } catch (e) {
      console.warn(
        "[loadCampaignDetailPageData] expirePastScheduledSessionsForCampaign:",
        e,
      );
    }
  }

  // Fetch Sessions (alle Status — Aufteilung Fokus / aktiv / Archiv)
  const { data: sessionsRaw } = await (supabase.from("sessions") as any)
    .select("*")
    .eq("campaign_id", id)
    .order("start_time", { ascending: true });

  const sessions =
    (sessionsRaw as Array<{
      id: string;
      title: string | null;
      start_time: string;
      type: string;
      status: string;
    }> | null) ?? null;

  const now = new Date();
  const { focus, otherActive, pastArchiveRows } = partitionCampaignSessionsForTab(
    (sessions ?? []) as any,
    now,
  );

  /** Aktive Termine: Fokus zuerst, dann übrige geplante/live (chronologisch). */
  const upcomingSessions = [...(focus ? [focus] : []), ...otherActive];

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
      .filter((s: any) => isSessionStatusScheduled(s.status))
      .map((s: any) => s.id);
    if (scheduledIds.length > 0) {
      const [membersRes, rsvpsRes] = await Promise.all([
        (supabase.from("campaign_members") as any)
          .select("user_id")
          .eq("campaign_id", id)
          .in("status", ["Approved", "Active"]),
        (supabase.from("session_rsvps") as any)
          .select("session_id, user_id, rsvp_status, gm_confirmed")
          .in("session_id", scheduledIds),
      ]);
      const memberIds = new Set(
        ((membersRes.data as any[]) || []).map((m: any) => m.user_id),
      );
      const acceptedRsvpsBySession = new Map<string, boolean>();
      gmSessionRsvpRows = ((rsvpsRes.data as any[]) || []).map((r: any) => ({
        session_id: String(r.session_id),
        user_id: String(r.user_id),
        rsvp_status: String(r.rsvp_status ?? ""),
        gm_confirmed: !!r.gm_confirmed,
      }));
      const rowsBySession = new Map<string, typeof gmSessionRsvpRows>();
      for (const r of gmSessionRsvpRows) {
        if (!rowsBySession.has(r.session_id)) rowsBySession.set(r.session_id, []);
        rowsBySession.get(r.session_id)!.push(r);
        if (r.rsvp_status === "Zusage" || r.rsvp_status === "Via Online") {
          acceptedRsvpsBySession.set(r.session_id, true);
        }
      }
      upcomingSessionsWithRsvp = upcomingSessions.map((s: any) => {
        if (!isSessionStatusScheduled(s.status))
          return { ...s, canStart: false, pendingCount: 0, hasAcceptedRsvps: false };
        const sessionRows = rowsBySession.get(s.id) ?? [];
        const byUser = new Map(sessionRows.map((row) => [row.user_id, row]));
        const playerIds = [...memberIds].filter((uid) => uid !== userId);
        const pendingCount = playerIds.filter(
          (uid) => !isPlayerReadyForSessionStart(byUser.get(uid)),
        ).length;
        return {
          ...s,
          canStart:
            pendingCount === 0 &&
            (s as { gm_prep_complete?: boolean }).gm_prep_complete !== false,
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
    npcs = await getNPCs(id, userId, isGM);

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
      .eq("status", "Approved");
    acceptedMembersCount = count || 0;
  }

  let gmDashboardCharacters: import("@/src/components/campaigns/GmCampaignDashboard").GmDashboardCharacterCard[] =
    [];
  let gmRecentLore: import("./lore-queries").RecentLoreSnippet[] = [];
  let gmBroadcastRecipientCount = 0;
  if (isGM) {
    const { getRecentLoreForGmDashboard } = await import("./lore-queries");
    gmRecentLore = await getRecentLoreForGmDashboard(id, 3);
    const cardMembers = acceptedMembers.filter(
      (m: any) => m.character?.id || m.character_id,
    );
    const cardUserIds = [
      ...new Set(
        cardMembers.map((m: any) => m.user_id).filter(Boolean) as string[],
      ),
    ];
    const pointsByUserId = new Map<string, number>();
    if (cardUserIds.length > 0) {
      const { data: pointsRows } = await (supabase.from("users") as any)
        .select("id, total_points")
        .in("id", cardUserIds);
      for (const row of (pointsRows as { id: string; total_points?: number | null }[]) ||
        []) {
        pointsByUserId.set(row.id, Number(row.total_points) || 0);
      }
    }
    gmDashboardCharacters = cardMembers.map((m: any) => ({
      characterId: String(m.character?.id ?? m.character_id),
      name: String(m.character?.name ?? "Charakter"),
      classLabel: String(m.character?.class ?? "—"),
      race: String(m.character?.race ?? "—"),
      level: Number(m.character?.level) || 1,
      username: String(m.user?.username ?? "Spieler"),
      playerTotalPoints: pointsByUserId.get(m.user_id) ?? 0,
      playerAvatarUrl: m.user?.avatar_url ?? null,
    }));
    const { data: bcm } = await (supabase.from("campaign_members") as any)
      .select("user_id")
      .eq("campaign_id", id)
      .in("status", ["Approved", "Active"]);
    gmBroadcastRecipientCount = ((bcm as { user_id: string }[]) || []).filter(
      (row) => row.user_id !== userId,
    ).length;
  }

  type GmTerminePayload = {
    campaignId: string;
    nextSession: GmTermineNextSession | null;
    players: GmTerminePlayerRsvp[];
  };
  let gmTermineSpielplan: GmTerminePayload = {
    campaignId: id,
    nextSession: null,
    players: [],
  };
  if (isGM) {
    const list = (upcomingSessionsWithRsvp as any[]) || [];
    const notMissed = (s: { id?: unknown; status?: unknown; start_time?: unknown }) =>
      !isMissedScheduledSession(
        {
          id: String(s.id ?? ""),
          status: String(s.status ?? ""),
          start_time: String(s.start_time ?? ""),
        },
        now,
      );
    const validUpcoming = list.filter(notMissed);
    const focusOk =
      focus &&
      notMissed({
        id: (focus as any).id,
        status: (focus as any).status,
        start_time: (focus as any).start_time,
      });
    const featured =
      focusOk && validUpcoming.some((s: any) => String(s.id) === String((focus as any).id))
        ? validUpcoming.find((s: any) => String(s.id) === String((focus as any).id))!
        : validUpcoming.find((s: any) => isSessionStatusLive(s.status)) ??
          validUpcoming.find((s: any) => isSessionStatusScheduled(s.status)) ??
          null;

    if (featured) {
      const rows = gmSessionRsvpRows.filter((r) => r.session_id === featured.id);
      const byUser = new Map(rows.map((r) => [r.user_id, r]));
      const allowGmConfirm = isSessionStatusScheduled(featured.status);

      const players: GmTerminePayload["players"] = acceptedMembers
        .filter((m: any) => m.user_id && m.user_id !== userId)
        .map((m: any) => {
          const row = byUser.get(m.user_id);
          const ready = isPlayerReadyForSessionStart(row);
          const st = row?.rsvp_status;

          if (ready) {
            if (st === "Zusage") {
              return {
                userId: m.user_id,
                username: String(m.user?.username ?? "Spieler"),
                status: "zusage" as const,
                label: "Termin angenommen",
                canGmManuallyConfirm: false,
              };
            }
            if (st === "Via Online") {
              return {
                userId: m.user_id,
                username: String(m.user?.username ?? "Spieler"),
                status: "via_online" as const,
                label: "Online dabei",
                canGmManuallyConfirm: false,
              };
            }
            if (st === "Absage" && row?.gm_confirmed) {
              return {
                userId: m.user_id,
                username: String(m.user?.username ?? "Spieler"),
                status: "gm_override" as const,
                label: "Abgesagt · vom GM für Start freigegeben",
                canGmManuallyConfirm: false,
              };
            }
            return {
              userId: m.user_id,
              username: String(m.user?.username ?? "Spieler"),
              status: "zusage" as const,
              label: "Vom GM als dabei markiert",
              canGmManuallyConfirm: false,
            };
          }

          if (st === "Absage") {
            return {
              userId: m.user_id,
              username: String(m.user?.username ?? "Spieler"),
              status: "absage" as const,
              label: "Abgesagt",
              canGmManuallyConfirm: allowGmConfirm,
            };
          }
          return {
            userId: m.user_id,
            username: String(m.user?.username ?? "Spieler"),
            status: "offen" as const,
            label: "Noch keine Rückmeldung",
            canGmManuallyConfirm: allowGmConfirm,
          };
        });

      const rawDays = featured.rsvp_deadline_days;
      const parsedDays =
        rawDays != null && rawDays !== ""
          ? Number(rawDays)
          : null;
      const rsvpDeadlineDays =
        parsedDays != null && !Number.isNaN(parsedDays) ? parsedDays : null;

      gmTermineSpielplan = {
        campaignId: id,
        nextSession: {
          id: String(featured.id),
          title: featured.title != null ? String(featured.title) : null,
          startTime: String(featured.start_time),
          status: String(featured.status),
          rsvpDeadlineDays,
          isLive: featured.is_live !== false,
          canStart: isSessionStatusScheduled(featured.status)
            ? Boolean(featured.canStart)
            : false,
          pendingCount: Number(featured.pendingCount ?? 0),
          gmPrepComplete:
            (featured as { gm_prep_complete?: boolean }).gm_prep_complete !== false,
        },
        players,
      };
    }
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
          .eq("user_id", userId)
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
          .eq("character_id", charId)
          .order("id", { ascending: false });
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

  /** Klientenseitige Ansichten nutzen dieselbe Zeile wie myCharacter; Flight-Serialisierung erfolgt für die gesamte Payload unten. */
  const myCharacterForClient =
    !isGM && myCharacter ? myCharacter : null;

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
      image_url:
        e.image_url != null
          ? String(e.image_url)
          : e.banner_url != null
            ? String(e.banner_url)
            : e.portrait_url != null
              ? String(e.portrait_url)
              : null,
      type: String(e.type ?? ""),
      created_at: e.created_at != null ? String(e.created_at) : "",
    }));
    const npcItems: DiscoveryItem[] = (npcs || []).slice(0, 8).map((e: any) => ({
      id: String(e.id),
      name: String(e.name ?? ""),
      kind: "npc" as const,
      description: e.description != null ? String(e.description) : null,
      image_url:
        e.image_url != null
          ? String(e.image_url)
          : e.portrait_url != null
            ? String(e.portrait_url)
            : e.avatar_url != null
              ? String(e.avatar_url)
              : null,
      type: e.title != null ? String(e.title) : undefined,
      created_at: e.created_at != null ? String(e.created_at) : "",
    }));
    allDiscoveries = [...loreItems, ...factionItems, ...npcItems]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 8);

    let partyQuery = (supabase.from("characters") as any)
      .select("id, name, class, race, level, culture_lore_id, avatar_url, user_id")
      .eq("campaign_id", id)
      .in("status", ["Active", "Approved"]);
    if (myCharacterId) {
      partyQuery = partyQuery.neq("id", myCharacterId);
    }
    const { data: partyCharacters } = await partyQuery;
    const cultureIds = [...new Set((partyCharacters || []).map((c: any) => c.culture_lore_id).filter(Boolean))];
    let cultureMap = new Map<string, string>();
    if (cultureIds.length > 0) {
      const { data: cultureRows } = await (supabase.from("world_lore") as any)
        .select("id, name")
        .in("id", cultureIds);
      cultureMap = new Map(((cultureRows as { id: string; name: string }[]) ?? []).map((l) => [l.id, l.name]));
    }
    const partyUserIds = [...new Set((partyCharacters || []).map((c: any) => c.user_id).filter(Boolean))];
    let userAvatarMap = new Map<string, string | null>();
    if (partyUserIds.length > 0) {
      const { data: userRows } = await (supabase.from("users") as any)
        .select("id, avatar_url")
        .in("id", partyUserIds);
      userAvatarMap = new Map(
        ((userRows as { id: string; avatar_url: string | null }[]) ?? []).map((u) => [
          u.id,
          u.avatar_url ?? null,
        ]),
      );
    }
    party = (partyCharacters || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      class: c.class ?? "",
      race: c.race ?? "",
      level: c.level ?? 1,
      culture: c.culture_lore_id ? (cultureMap.get(c.culture_lore_id) ?? "") : "",
      avatar_url:
        c.avatar_url?.trim?.() ||
        (c.user_id ? userAvatarMap.get(c.user_id) ?? null : null),
      avatar_display: null,
    }));
    const partyIds = party.map((p) => p.id);
    const dispMap = await fetchAvatarDisplayMapForCampaign(supabase, id, partyIds);
    party = party.map((p) => ({
      ...p,
      avatar_display: dispMap.get(p.id) ?? null,
    }));
  }

  let playerNextSessionData: {
    session: {
      id: string;
      title: string | null;
      start_time: string;
      status: string;
      rsvp_deadline_days?: number | null;
      is_live?: boolean;
    };
    userRsvp: RsvpStatus | null;
    /** Zusage / Via Online oder GM-Freigabe – für Badge „Next session: confirmed“ */
    isAttendingNextSession: boolean;
    deadlineReached: boolean;
    viaOnlineTaken: boolean;
    /** Ende des RSVP-Tages (23:59:59), ISO – für Countdown-Banner */
    rsvpDeadlineEndIso: string | null;
  } | null = null;

  if (!isGM && hasAccess) {
    const notMissed = (s: { id?: unknown; status?: unknown; start_time?: unknown }) =>
      !isMissedScheduledSession(
        {
          id: String(s.id ?? ""),
          status: String(s.status ?? ""),
          start_time: String(s.start_time ?? ""),
        },
        now,
      );
    const nextForPlayer = upcomingSessions.find(notMissed) ?? null;
    if (nextForPlayer) {
      const s = nextForPlayer as any;
      const { data: rsvpRowsRaw } = await (supabase.from("session_rsvps") as any)
        .select("user_id, rsvp_status, gm_confirmed")
        .eq("session_id", s.id);
      const rsvpRows =
        (rsvpRowsRaw as {
          user_id: string;
          rsvp_status: string;
          gm_confirmed?: boolean;
        }[]) || [];
      const mine = rsvpRows.find((r) => r.user_id === userId);
      const raw = mine?.rsvp_status;
      let userRsvp: RsvpStatus | null = null;
      if (raw === "Zusage" || raw === "Via Online" || raw === "Absage") {
        userRsvp = raw;
      }
      const isAttendingNextSession = isPlayerReadyForSessionStart(
        mine
          ? {
              rsvp_status: mine.rsvp_status,
              gm_confirmed: !!mine.gm_confirmed,
            }
          : null,
      );
      const deadlineDays = s.rsvp_deadline_days ?? null;
      const startDate = new Date(String(s.start_time));
      let deadline: Date | null = null;
      if (deadlineDays) {
        deadline = new Date(startDate);
        deadline.setDate(deadline.getDate() - Number(deadlineDays));
        deadline.setHours(23, 59, 59, 999);
      }
      const deadlineReached = !!deadline && new Date() >= deadline;
      const viaOnlineCount = rsvpRows.filter((r) => r.rsvp_status === "Via Online").length;
      const viaOnlineTaken = s.is_live !== false && viaOnlineCount >= 1;
      playerNextSessionData = {
        session: {
          id: String(s.id),
          title: s.title != null ? String(s.title) : null,
          start_time: String(s.start_time),
          status: String(s.status),
          rsvp_deadline_days: s.rsvp_deadline_days ?? null,
          is_live: s.is_live,
        },
        userRsvp,
        isAttendingNextSession,
        deadlineReached,
        viaOnlineTaken,
        rsvpDeadlineEndIso: deadline ? deadline.toISOString() : null,
      };
    }
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
  let characterReputations: {
    id: string;
    faction_id: string;
    faction_name: string;
    reputation: number;
    rank: string | null;
    updated_at: string;
  }[] = [];
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
      updated_at: r.updated_at,
    }));
  }

  let lastPlayerAchievement: {
    name: string;
    icon: string | null;
    awarded_at: string;
  } | null = null;
  if (!isGM) {
    const { data: uaRow } = await (supabase.from("user_achievements") as any)
      .select("awarded_at, achievements(name, icon)")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const ach = (uaRow as { achievements?: { name?: string; icon?: string | null } } | null)
      ?.achievements;
    if (ach && uaRow) {
      lastPlayerAchievement = {
        name: String(ach.name ?? ""),
        icon: ach.icon != null ? String(ach.icon) : null,
        awarded_at: String((uaRow as { awarded_at?: string }).awarded_at ?? ""),
      };
    }
  }

  const { data: sessionArchivesRaw } = await (supabase.from(
    "session_archives",
  ) as any)
    .select("*")
    .eq("campaign_id", id)
    .order("archived_at", { ascending: false });
  const sessionArchives = (sessionArchivesRaw as any[]) || [];

  const focusSessionForTab = focus
    ? ((upcomingSessionsWithRsvp as any[]).find((x) => x.id === focus.id) ?? null)
    : null;
  const otherUpcomingSessionsForTab = (upcomingSessionsWithRsvp as any[]).filter(
    (x) => x.id !== (focusSessionForTab as { id?: string } | null)?.id,
  );

  const pageData = {
    campaign,
    world,
    gmWorlds,
    campaignWorldId,
    isGM,
    currentUserId,
    userMembershipStatus,
    userHasCharacter,
    isAcceptedMember,
    isDeadOrArchived,
    membership,
    hasAccess,
    gmSessionRsvpRows,
    sessions,
    upcomingSessions,
    upcomingSessionsWithRsvp,
    focusSession: focusSessionForTab,
    otherUpcomingSessions: otherUpcomingSessionsForTab,
    pastSessionsForCampaignTab: pastArchiveRows,
    sessionArchives,
    now,
    npcs,
    factions,
    loreEntries,
    quests,
    pendingApplications,
    draftingMembers,
    inReviewMembers,
    acceptedMembers,
    pendingCount,
    acceptedMembersCount,
    gmDashboardCharacters,
    gmRecentLore,
    gmBroadcastRecipientCount,
    gmTermineSpielplan,
    myCharacter,
    myCharacterForClient,
    allDiscoveries,
    party,
    playerNextSessionData,
    galleryImages,
    wizardFactions,
    wizardLocations,
    wizardCultures,
    wizardLanguages,
    characterReputations,
    lastPlayerAchievement,
  };

  /** Ein Durchlauf: alle Supabase-/DB-Typen (BigInt, …) für RSC → Client-Komponenten sicher */
  return serializeForClient(pageData) as typeof pageData;
}
