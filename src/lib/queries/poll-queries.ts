import { createClient } from "@/src/lib/supabase/server";
import { POLL_VOTE_POINTS } from "@/src/lib/constants/poll";

export { POLL_VOTE_POINTS };

export type PollStatus = "draft" | "published" | "closed";

export type CampaignPollOption = {
  id: string;
  label: string;
  sortOrder: number;
  voteCount?: number;
};

export type CampaignPollTextResponse = {
  userId: string;
  username: string;
  text: string;
  createdAt: string;
  isOwn?: boolean;
};

export type CampaignPoll = {
  id: string;
  campaignId: string;
  campaignName?: string;
  question: string;
  status: PollStatus;
  closesAt: string;
  publishedAt: string | null;
  pointsPerVote: number;
  allowMultiple: boolean;
  allowFreeText: boolean;
  options: CampaignPollOption[];
  totalVotes?: number;
  /** @deprecated use userVoteOptionIds */
  userVoteOptionId?: string | null;
  userVoteOptionIds?: string[];
  userFreeText?: string | null;
  hasParticipated?: boolean;
  textResponses?: CampaignPollTextResponse[];
  participantCount?: number;
  isOpen?: boolean;
};

type PollRow = Record<string, unknown>;

function mapPollRow(
  row: PollRow,
  options: CampaignPollOption[],
  extras?: {
    campaignName?: string;
    totalVotes?: number;
    userVoteOptionIds?: string[];
    userFreeText?: string | null;
    hasParticipated?: boolean;
    textResponses?: CampaignPollTextResponse[];
    participantCount?: number;
  },
): CampaignPoll {
  const closesAt = String(row.closes_at);
  const status = row.status as PollStatus;
  const isOpen =
    status === "published" && new Date(closesAt).getTime() > Date.now();
  const userVoteOptionIds = extras?.userVoteOptionIds ?? [];

  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    campaignName: extras?.campaignName,
    question: String(row.question),
    status,
    closesAt,
    publishedAt: row.published_at ? String(row.published_at) : null,
    pointsPerVote: Number(row.points_per_vote) || POLL_VOTE_POINTS,
    allowMultiple: row.allow_multiple === true,
    allowFreeText: row.allow_free_text === true,
    options,
    totalVotes: extras?.totalVotes,
    userVoteOptionIds,
    userVoteOptionId: userVoteOptionIds[0] ?? null,
    userFreeText: extras?.userFreeText ?? null,
    hasParticipated: extras?.hasParticipated ?? false,
    textResponses: extras?.textResponses ?? [],
    participantCount: extras?.participantCount,
    isOpen,
  };
}

const POLL_SELECT =
  "id, campaign_id, question, status, closes_at, published_at, points_per_vote, allow_multiple, allow_free_text";

async function loadPollAggregates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pollIds: string[],
  userId?: string,
) {
  const [
    { data: optionsRaw },
    { data: votesRaw },
    { data: textRaw },
    { data: participationRaw },
  ] = await Promise.all([
    (supabase.from("campaign_poll_options" as any) as any)
      .select("id, poll_id, label, sort_order")
      .in("poll_id", pollIds)
      .order("sort_order", { ascending: true }),
    (supabase.from("campaign_poll_votes" as any) as any)
      .select("poll_id, option_id, user_id")
      .in("poll_id", pollIds),
    (supabase.from("campaign_poll_text_responses" as any) as any)
      .select("poll_id, user_id, response_text, created_at")
      .in("poll_id", pollIds)
      .order("created_at", { ascending: true }),
    (supabase.from("campaign_poll_participation" as any) as any)
      .select("poll_id, user_id")
      .in("poll_id", pollIds),
  ]);

  const optionsByPoll = new Map<string, CampaignPollOption[]>();
  for (const o of (optionsRaw as any[]) || []) {
    const pid = String(o.poll_id);
    const list = optionsByPoll.get(pid) ?? [];
    list.push({
      id: String(o.id),
      label: String(o.label),
      sortOrder: Number(o.sort_order) || 0,
    });
    optionsByPoll.set(pid, list);
  }

  const voteCountByOption = new Map<string, number>();
  const totalByPoll = new Map<string, number>();
  const userVotesByPoll = new Map<string, string[]>();
  for (const v of (votesRaw as any[]) || []) {
    const pid = String(v.poll_id);
    const oid = String(v.option_id);
    voteCountByOption.set(oid, (voteCountByOption.get(oid) ?? 0) + 1);
    totalByPoll.set(pid, (totalByPoll.get(pid) ?? 0) + 1);
    if (userId && v.user_id === userId) {
      const list = userVotesByPoll.get(pid) ?? [];
      list.push(oid);
      userVotesByPoll.set(pid, list);
    }
  }

  const participantCountByPoll = new Map<string, number>();
  for (const p of (participationRaw as any[]) || []) {
    const pid = String(p.poll_id);
    participantCountByPoll.set(pid, (participantCountByPoll.get(pid) ?? 0) + 1);
  }

  const textByPoll = new Map<
    string,
    Array<{ user_id: string; response_text: string; created_at: string }>
  >();
  for (const t of (textRaw as any[]) || []) {
    const pid = String(t.poll_id);
    const list = textByPoll.get(pid) ?? [];
    list.push(t);
    textByPoll.set(pid, list);
  }

  const userIds = [
    ...new Set(
      ((textRaw as any[]) || []).map((t) => String(t.user_id)).filter(Boolean),
    ),
  ];
  const usernameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await (supabase.from("users") as any)
      .select("id, username, display_name")
      .in("id", userIds);
    for (const u of (users as any[]) || []) {
      usernameById.set(
        String(u.id),
        String(u.display_name ?? u.username ?? "Spieler"),
      );
    }
  }

  const userFreeTextByPoll = new Map<string, string>();
  if (userId) {
    for (const t of (textRaw as any[]) || []) {
      if (t.user_id === userId) {
        userFreeTextByPoll.set(String(t.poll_id), String(t.response_text));
      }
    }
  }

  const userParticipated = new Set<string>();
  if (userId) {
    for (const p of (participationRaw as any[]) || []) {
      if (p.user_id === userId) {
        userParticipated.add(String(p.poll_id));
      }
    }
  }

  return {
    optionsByPoll,
    voteCountByOption,
    totalByPoll,
    userVotesByPoll,
    participantCountByPoll,
    textByPoll,
    usernameById,
    userFreeTextByPoll,
    userParticipated,
  };
}

function buildTextResponses(
  rows:
    | Array<{ user_id: string; response_text: string; created_at: string }>
    | undefined,
  usernameById: Map<string, string>,
  userId?: string,
): CampaignPollTextResponse[] {
  return (rows ?? []).map((t) => ({
    userId: String(t.user_id),
    username: usernameById.get(String(t.user_id)) ?? "Spieler",
    text: String(t.response_text),
    createdAt: String(t.created_at),
    isOwn: userId ? t.user_id === userId : undefined,
  }));
}

function mapPollFromRow(
  p: PollRow,
  agg: Awaited<ReturnType<typeof loadPollAggregates>>,
  userId?: string,
  campaignName?: string,
): CampaignPoll {
  const pid = String(p.id);
  const options = (agg.optionsByPoll.get(pid) ?? []).map((o) => ({
    ...o,
    voteCount: agg.voteCountByOption.get(o.id) ?? 0,
  }));
  const userVoteOptionIds = userId
    ? (agg.userVotesByPoll.get(pid) ?? [])
    : [];
  const userFreeText = userId
    ? (agg.userFreeTextByPoll.get(pid) ?? null)
    : null;
  const hasParticipated =
    agg.userParticipated.has(pid) ||
    userVoteOptionIds.length > 0 ||
    !!userFreeText;

  return mapPollRow(p, options, {
    campaignName,
    totalVotes: agg.totalByPoll.get(pid) ?? 0,
    userVoteOptionIds,
    userFreeText,
    hasParticipated,
    textResponses: buildTextResponses(
      agg.textByPoll.get(pid),
      agg.usernameById,
      userId,
    ),
    participantCount: agg.participantCountByPoll.get(pid) ?? 0,
  });
}

/** Aktive Umfragen für Spieler-Dashboard (alle Kampagnen). */
export async function getActivePollsForPlayer(
  userId: string,
): Promise<CampaignPoll[]> {
  const supabase = await createClient();

  const { data: memberships } = await (supabase.from("campaign_members") as any)
    .select("campaign_id, campaigns ( id, name )")
    .eq("user_id", userId)
    .in("status", ["Approved", "Active"]);

  const campaignIds = [
    ...new Set(
      ((memberships as any[]) || [])
        .map((m) => m.campaign_id as string)
        .filter(Boolean),
    ),
  ];
  if (campaignIds.length === 0) return [];

  const { data: pollsRaw } = await (supabase.from("campaign_polls" as any) as any)
    .select(`${POLL_SELECT}, campaigns ( name )`)
    .in("campaign_id", campaignIds)
    .eq("status", "published")
    .gt("closes_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  const polls = (pollsRaw as any[]) || [];
  if (polls.length === 0) return [];

  const pollIds = polls.map((p) => p.id as string);
  const agg = await loadPollAggregates(supabase, pollIds, userId);

  return polls.map((p) =>
    mapPollFromRow(
      p,
      agg,
      userId,
      (p.campaigns as { name?: string } | null)?.name ?? undefined,
    ),
  );
}

/** Alle Umfragen einer Kampagne (GM). */
export async function getCampaignPollsForGm(
  campaignId: string,
): Promise<CampaignPoll[]> {
  const supabase = await createClient();

  const { data: pollsRaw } = await (supabase.from("campaign_polls" as any) as any)
    .select(POLL_SELECT)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  const polls = (pollsRaw as any[]) || [];
  if (polls.length === 0) return [];

  const pollIds = polls.map((p) => p.id as string);
  const agg = await loadPollAggregates(supabase, pollIds);

  return polls.map((p) => mapPollFromRow(p, agg));
}

/** Aktive Umfragen für Spieler in einer Kampagne (Übersicht). */
export async function getActivePollsForCampaignPlayer(
  campaignId: string,
  userId: string,
): Promise<CampaignPoll[]> {
  const all = await getActivePollsForPlayer(userId);
  return all.filter((p) => p.campaignId === campaignId);
}
