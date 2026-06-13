import { createClient } from "@/src/lib/supabase/server";
import { getPendingApplications } from "@/src/lib/queries/application-queries";
import { parseChronicleStateRow } from "@/src/lib/session-chronicle/parse-db";
import { countPendingInboxItems } from "@/src/lib/session-chronicle/inbox";

export type GMNotification = {
  id: string;
  type:
    | "application"
    | "character_update"
    | "session_completed"
    | "chronicle_inbox"
    | "system";
  message: string;
  href: string | null;
  campaignId: string | null;
  campaignName: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  createdAt: string;
};

export type GMRecipientCampaign = {
  id: string;
  name: string;
  members: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    characterName: string | null;
  }[];
};

export type PlayerMessage = {
  id: string;
  subject: string;
  content: string;
  type: "broadcast" | "direct";
  priority: "normal" | "high";
  senderName: string;
  senderAvatarUrl: string | null;
  campaignId: string | null;
  campaignName: string | null;
  createdAt: string;
  readAt: string | null;
};

export async function getGMNotifications(
  userId: string,
): Promise<GMNotification[]> {
  const supabase = await createClient();
  const notifications: GMNotification[] = [];

  const { data: gmCampaigns } = await (supabase.from("campaigns") as any)
    .select("id, name")
    .eq("gm_id", userId);

  const campaignList = (gmCampaigns as any[]) || [];
  if (campaignList.length === 0) return [];

  const campaignIds = campaignList.map((c: any) => c.id as string);
  const campaignMap = new Map<string, string>(
    campaignList.map((c: any) => [c.id, c.name]),
  );

  const applications = await getPendingApplications(userId);
  for (const app of applications) {
    const username = app.users?.username ?? "Unbekannt";
    const campaignId = app.campaigns?.id ?? app.campaign_id;
    const campaignName = app.campaigns?.name ?? campaignMap.get(campaignId) ?? "Kampagne";
    notifications.push({
      id: `app-${app.id}`,
      type: "application",
      message: `Neue Bewerbung von ${username} für „${campaignName}"`,
      href: `/dashboard/campaigns/${campaignId}/gm-inbox`,
      campaignId,
      campaignName,
      actorName: username,
      actorAvatarUrl: null,
      createdAt: app.created_at ?? new Date().toISOString(),
    });
  }

  const { data: pendingCharsRaw } = await (supabase.from("characters") as any)
    .select(
      "id, name, campaign_id, user_id, updated_at, created_at, users ( username, avatar_url )",
    )
    .in("campaign_id", campaignIds)
    .eq("status", "Pending_Approval")
    .order("updated_at", { ascending: false })
    .limit(15);

  for (const char of (pendingCharsRaw as any[]) || []) {
    const username = (char.users as any)?.username ?? "Unbekannt";
    const campaignName = campaignMap.get(char.campaign_id) ?? "Kampagne";
    notifications.push({
      id: `char-${char.id}`,
      type: "character_update",
      message: `Charakterbogen „${char.name}" von ${username} wartet auf Freigabe`,
      href: `/dashboard/campaigns/${char.campaign_id}/gm-inbox`,
      campaignId: char.campaign_id,
      campaignName,
      actorName: username,
      actorAvatarUrl: (char.users as any)?.avatar_url ?? null,
      createdAt: char.updated_at ?? char.created_at ?? new Date().toISOString(),
    });
  }

  const { data: chronicleStatesRaw } = await (supabase as any)
    .from("session_chronicle_state")
    .select("*")
    .in("campaign_id", campaignIds);

  const chroniclePendingByCampaign = new Map<string, number>();
  let latestChronicleAt = new Map<string, string>();
  for (const row of chronicleStatesRaw ?? []) {
    const state = parseChronicleStateRow(row);
    if (!state?.campaign_id) continue;
    const pending = countPendingInboxItems(state);
    if (pending <= 0) continue;
    chroniclePendingByCampaign.set(
      state.campaign_id,
      (chroniclePendingByCampaign.get(state.campaign_id) ?? 0) + pending,
    );
    const prev = latestChronicleAt.get(state.campaign_id);
    if (!prev || state.updated_at > prev) {
      latestChronicleAt.set(state.campaign_id, state.updated_at);
    }
  }

  for (const [campaignId, count] of chroniclePendingByCampaign) {
    const campaignName = campaignMap.get(campaignId) ?? "Kampagne";
    notifications.push({
      id: `chronicle-${campaignId}`,
      type: "chronicle_inbox",
      message: `${count} Chronist-Vorschlag${count === 1 ? "" : "e"} in „${campaignName}" warten auf Import`,
      href: `/dashboard/campaigns/${campaignId}/chronist`,
      campaignId,
      campaignName,
      actorName: null,
      actorAvatarUrl: null,
      createdAt: latestChronicleAt.get(campaignId) ?? new Date().toISOString(),
    });
  }

  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: completedSessionsRaw } = await (
    supabase.from("sessions") as any
  )
    .select("id, title, campaign_id, end_time")
    .in("campaign_id", campaignIds)
    .eq("status", "Completed")
    .gte("end_time", oneWeekAgo)
    .order("end_time", { ascending: false })
    .limit(5);

  for (const sess of (completedSessionsRaw as any[]) || []) {
    const campaignName = campaignMap.get(sess.campaign_id) ?? "Kampagne";
    notifications.push({
      id: `sess-${sess.id}`,
      type: "session_completed",
      message: `Session „${sess.title || "Unbenannt"}" in ${campaignName} wurde abgeschlossen`,
      href: `/dashboard/campaigns/${sess.campaign_id}`,
      campaignId: sess.campaign_id,
      campaignName,
      actorName: null,
      actorAvatarUrl: null,
      createdAt: sess.end_time ?? new Date().toISOString(),
    });
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return notifications.slice(0, 15);
}

export async function getGMRecipients(
  userId: string,
): Promise<GMRecipientCampaign[]> {
  const supabase = await createClient();

  const { data: gmCampaigns } = await (supabase.from("campaigns") as any)
    .select("id, name")
    .eq("gm_id", userId)
    .order("name", { ascending: true });

  const campaignList = (gmCampaigns as any[]) || [];
  if (campaignList.length === 0) return [];

  const campaignIds = campaignList.map((c: any) => c.id as string);

  const { data: membersRaw } = await (supabase.from("campaign_members") as any)
    .select(
      `
      campaign_id,
      user_id,
      users ( id, username, avatar_url ),
      characters ( name )
    `,
    )
    .in("campaign_id", campaignIds)
    .eq("status", "Approved")
    .neq("user_id", userId);

  const membersMap = new Map<
    string,
    {
      userId: string;
      username: string;
      avatarUrl: string | null;
      characterName: string | null;
    }[]
  >();

  for (const m of (membersRaw as any[]) || []) {
    const cId = m.campaign_id as string;
    if (!membersMap.has(cId)) membersMap.set(cId, []);
    membersMap.get(cId)!.push({
      userId: (m.users as any)?.id ?? m.user_id,
      username: (m.users as any)?.username ?? "Unbekannt",
      avatarUrl: (m.users as any)?.avatar_url ?? null,
      characterName: (m.characters as any)?.name ?? null,
    });
  }

  return campaignList.map((c: any) => ({
    id: c.id,
    name: c.name ?? "Kampagne",
    members: membersMap.get(c.id) ?? [],
  }));
}

export async function getPlayerMessages(
  userId: string,
): Promise<PlayerMessage[]> {
  const supabase = await createClient();

  const { data: memberRows } = await (supabase.from("campaign_members") as any)
    .select("campaign_id")
    .eq("user_id", userId)
    .eq("status", "Approved");

  const campaignIds = ((memberRows as any[]) || []).map(
    (m: any) => m.campaign_id as string,
  );

  const { data: directRaw } = await (supabase.from("messages") as any)
    .select(
      "id, subject, content, type, priority, sender_id, campaign_id, created_at, read_at, users:sender_id ( username, avatar_url )",
    )
    .eq("recipient_id", userId)
    .eq("type", "direct")
    .order("created_at", { ascending: false })
    .limit(20);

  let broadcastRaw: any[] = [];
  if (campaignIds.length > 0) {
    const { data } = await (supabase.from("messages") as any)
      .select(
        "id, subject, content, type, priority, sender_id, campaign_id, created_at, read_at, users:sender_id ( username, avatar_url )",
      )
      .is("recipient_id", null)
      .eq("type", "broadcast")
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false })
      .limit(20);
    broadcastRaw = (data as any[]) || [];
  }

  const allCampaignIds = [
    ...new Set([
      ...((directRaw as any[]) || [])
        .map((m: any) => m.campaign_id)
        .filter(Boolean),
      ...broadcastRaw.map((m: any) => m.campaign_id).filter(Boolean),
    ]),
  ];

  const campaignNameMap = new Map<string, string>();
  if (allCampaignIds.length > 0) {
    const { data: cData } = await (supabase.from("campaigns") as any)
      .select("id, name")
      .in("id", allCampaignIds);
    for (const c of (cData as any[]) || []) {
      campaignNameMap.set(c.id, c.name);
    }
  }

  const allMessages = [...((directRaw as any[]) || []), ...broadcastRaw];

  const mapped: PlayerMessage[] = allMessages.map((m: any) => ({
    id: m.id,
    subject: m.subject ?? "",
    content: m.content ?? "",
    type: m.type === "broadcast" ? "broadcast" : "direct",
    priority: m.priority === "high" ? "high" : "normal",
    senderName: (m.users as any)?.username ?? "Spielleiter",
    senderAvatarUrl: (m.users as any)?.avatar_url ?? null,
    campaignId: m.campaign_id ?? null,
    campaignName: m.campaign_id
      ? (campaignNameMap.get(m.campaign_id) ?? null)
      : null,
    createdAt: m.created_at,
    readAt: m.read_at ?? null,
  }));

  mapped.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const filtered = mapped.filter((m) => {
    if (!m.readAt) return true;
    return new Date(m.createdAt) >= thirtyDaysAgo;
  });

  return filtered.slice(0, 50);
}

export async function getUnreadInboxMessages(
  userId: string,
): Promise<PlayerMessage[]> {
  const all = await getPlayerMessages(userId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const unread = all.filter((m) => {
    if (m.readAt) return false;
    return new Date(m.createdAt) >= thirtyDaysAgo;
  });
  return unread.slice(0, 3);
}
