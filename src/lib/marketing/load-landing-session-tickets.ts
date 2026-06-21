import { supabase } from "@/src/lib/supabaseClient";
import type { SessionTicket } from "@/src/components/marketing/CampaignListAnimation";

type SessionRow = {
  id: string;
  start_time: string | null;
  status: string | null;
  title?: string | null;
  registration_closed_on_landing?: boolean | null;
  visible_on_public_landing?: boolean | null;
  show_open_slots_on_landing?: boolean | null;
  show_session_title_on_landing?: boolean | null;
};

type CampaignRow = {
  id: string;
  name: string | null;
  system: string | null;
  max_players: number | null;
  gm_id: string | null;
  mode: string | null;
  banner_url: string | null;
};

/** Nächste öffentliche Session-Termine pro Kampagne (Landingpage). */
export async function loadLandingSessionTickets(): Promise<SessionTicket[]> {
  const { data: campData, error: campError } = await supabase
    .from("campaigns")
    .select("id, gm_id, name, system, max_players, mode, banner_url")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (campError) {
    console.error("[loadLandingSessionTickets] campaigns:", campError.message);
    return [];
  }

  if (!campData?.length) return [];

  const campaigns = campData as CampaignRow[];
  const campaignIds = campaigns.map((c) => c.id);

  const { data: sessData, error: sessError } = await supabase
    .from("sessions")
    .select(
      "id, campaign_id, start_time, status, title, registration_closed_on_landing, visible_on_public_landing, show_open_slots_on_landing, show_session_title_on_landing",
    )
    .in("campaign_id", campaignIds);

  if (sessError) {
    console.error("[loadLandingSessionTickets] sessions:", sessError.message);
  }

  const allSessions = (sessData ?? []) as (SessionRow & { campaign_id: string })[];
  const now = new Date();

  const sessionMap = new Map<string, SessionRow[]>();
  for (const s of allSessions) {
    const arr = sessionMap.get(s.campaign_id) ?? [];
    arr.push(s);
    sessionMap.set(s.campaign_id, arr);
  }

  const relevantCampaigns = campaigns
    .map((c) => {
      const sessions = sessionMap.get(c.id) ?? [];
      const futureSessions = sessions
        .filter((s) => {
          if (!s.start_time || new Date(s.start_time) <= now) return false;
          const st = String(s.status || "");
          if (["Cancelled", "Completed"].includes(st)) return false;
          return true;
        })
        .sort(
          (a, b) =>
            new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime(),
        );

      const nextSession =
        futureSessions.find((s) => s.visible_on_public_landing !== false) ?? null;
      if (!nextSession?.start_time) return null;

      return {
        campaign: c,
        nextSession,
        dateObj: new Date(nextSession.start_time),
      };
    })
    .filter(Boolean) as {
    campaign: CampaignRow;
    nextSession: SessionRow;
    dateObj: Date;
  }[];

  relevantCampaigns.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const gmIds = [
    ...new Set(relevantCampaigns.map((t) => t.campaign.gm_id).filter(Boolean)),
  ] as string[];
  const gmMap = new Map<string, { username: string | null; avatar_url: string | null }>();
  if (gmIds.length > 0) {
    const { data: gmRows } = await supabase
      .from("users")
      .select("id, username, avatar_url")
      .in("id", gmIds);
    for (const gm of gmRows ?? []) {
      gmMap.set((gm as { id: string }).id, {
        username: (gm as { username?: string | null }).username ?? null,
        avatar_url: (gm as { avatar_url?: string | null }).avatar_url ?? null,
      });
    }
  }

  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Berlin",
  });
  const timeFormatter = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

  const groupFullLandingLabel = "Alle Gruppenplätze voll";
  const finalTickets: SessionTicket[] = [];

  for (const item of relevantCampaigns) {
    const { campaign: c, dateObj, nextSession } = item;
    const closedLanding = !!nextSession.registration_closed_on_landing;
    const showSlots = nextSession.show_open_slots_on_landing !== false;
    const showSessionTitle = nextSession.show_session_title_on_landing !== false;

    let currentPlayers = 0;
    const { data: memberRows, error: membersError } = await (supabase
      .from("campaign_members") as any)
      .select("user_id, status")
      .eq("campaign_id", c.id)
      .eq("status", "Approved");

    if (!membersError && Array.isArray(memberRows)) {
      currentPlayers = memberRows.filter((row: { user_id?: string | null }) => {
        const userId = row.user_id;
        return userId && userId !== c.gm_id;
      }).length;
    }

    const max = c.max_players || 0;
    let slotsLabel = "";
    if (closedLanding) {
      slotsLabel = groupFullLandingLabel;
    } else if (!showSlots) {
      slotsLabel = "";
    } else if (max === 0) {
      slotsLabel = "Auf Anfrage";
    } else if (currentPlayers >= max) {
      slotsLabel = "Ausgebucht";
    } else {
      slotsLabel = `${currentPlayers} / ${max} Plätze belegt`;
    }

    const gm = gmMap.get(c.gm_id ?? "");
    const rawTitle =
      nextSession.title && String(nextSession.title).trim()
        ? String(nextSession.title).trim()
        : null;

    finalTickets.push({
      campaignId: c.id,
      campaignName: c.name || "Unbenanntes Abenteuer",
      sessionTitle: showSessionTitle ? rawTitle : null,
      gameSystem: c.system || "System offen",
      gmUsername: gm?.username || "Unbekannt",
      gmAvatarUrl: gm?.avatar_url || null,
      bannerUrl: c.banner_url || null,
      location: c.mode || "Online",
      dateString: dateFormatter.format(dateObj),
      timeString: `${timeFormatter.format(dateObj)} Uhr`,
      slotsLabel,
      currentPlayers,
      maxPlayers: max,
      registrationClosedOnLanding: closedLanding,
      showOpenSlotsOnLanding: showSlots,
      showSessionTitleOnLanding: showSessionTitle,
      startTimeMs: dateObj.getTime(),
    });
  }

  return finalTickets;
}
