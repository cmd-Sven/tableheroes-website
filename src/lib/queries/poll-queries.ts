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

export type CampaignPoll = {
  id: string;
  campaignId: string;
  campaignName?: string;
  question: string;
  status: PollStatus;
  closesAt: string;
  publishedAt: string | null;
  pointsPerVote: number;
  options: CampaignPollOption[];
  totalVotes?: number;
  userVoteOptionId?: string | null;
  isOpen?: boolean;
};

function mapPollRow(
  row: Record<string, unknown>,
  options: CampaignPollOption[],
  extras?: {
    campaignName?: string;
    totalVotes?: number;
    userVoteOptionId?: string | null;
  }
): CampaignPoll {
  const closesAt = String(row.closes_at);
  const status = row.status as PollStatus;
  const isOpen =
    status === "published" && new Date(closesAt).getTime() > Date.now();

  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    campaignName: extras?.campaignName,
    question: String(row.question),
    status,
    closesAt,
    publishedAt: row.published_at ? String(row.published_at) : null,
    pointsPerVote: Number(row.points_per_vote) || POLL_VOTE_POINTS,
    options,
    totalVotes: extras?.totalVotes,
    userVoteOptionId: extras?.userVoteOptionId,
    isOpen,
  };
}

/** Aktive Umfragen für Spieler-Dashboard (alle Kampagnen). */
export async function getActivePollsForPlayer(
  userId: string
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
        .filter(Boolean)
    ),
  ];
  if (campaignIds.length === 0) return [];

  const { data: pollsRaw } = await (supabase.from("campaign_polls" as any) as any)
    .select(
      "id, campaign_id, question, status, closes_at, published_at, points_per_vote, campaigns ( name )"
    )
    .in("campaign_id", campaignIds)
    .eq("status", "published")
    .gt("closes_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  const polls = (pollsRaw as any[]) || [];
  if (polls.length === 0) return [];

  const pollIds = polls.map((p) => p.id as string);

  const [{ data: optionsRaw }, { data: votesRaw }] = await Promise.all([
    (supabase.from("campaign_poll_options" as any) as any)
      .select("id, poll_id, label, sort_order")
      .in("poll_id", pollIds)
      .order("sort_order", { ascending: true }),
    (supabase.from("campaign_poll_votes" as any) as any)
      .select("poll_id, option_id, user_id")
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

  const userVotes = new Map<string, string>();
  const voteCounts = new Map<string, number>();
  for (const v of (votesRaw as any[]) || []) {
    const pid = String(v.poll_id);
    voteCounts.set(pid, (voteCounts.get(pid) ?? 0) + 1);
    if (v.user_id === userId) {
      userVotes.set(pid, String(v.option_id));
    }
  }

  return polls.map((p) =>
    mapPollRow(p, optionsByPoll.get(String(p.id)) ?? [], {
      campaignName: (p.campaigns as { name?: string } | null)?.name ?? undefined,
      totalVotes: voteCounts.get(String(p.id)) ?? 0,
      userVoteOptionId: userVotes.get(String(p.id)) ?? null,
    })
  );
}

/** Alle Umfragen einer Kampagne (GM). */
export async function getCampaignPollsForGm(
  campaignId: string
): Promise<CampaignPoll[]> {
  const supabase = await createClient();

  const { data: pollsRaw } = await (supabase.from("campaign_polls" as any) as any)
    .select(
      "id, campaign_id, question, status, closes_at, published_at, points_per_vote"
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  const polls = (pollsRaw as any[]) || [];
  if (polls.length === 0) return [];

  const pollIds = polls.map((p) => p.id as string);

  const [{ data: optionsRaw }, { data: votesRaw }] = await Promise.all([
    (supabase.from("campaign_poll_options" as any) as any)
      .select("id, poll_id, label, sort_order")
      .in("poll_id", pollIds)
      .order("sort_order", { ascending: true }),
    (supabase.from("campaign_poll_votes" as any) as any)
      .select("poll_id, option_id")
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
  for (const v of (votesRaw as any[]) || []) {
    const oid = String(v.option_id);
    const pid = String(v.poll_id);
    voteCountByOption.set(oid, (voteCountByOption.get(oid) ?? 0) + 1);
    totalByPoll.set(pid, (totalByPoll.get(pid) ?? 0) + 1);
  }

  return polls.map((p) => {
    const pid = String(p.id);
    const options = (optionsByPoll.get(pid) ?? []).map((o) => ({
      ...o,
      voteCount: voteCountByOption.get(o.id) ?? 0,
    }));
    return mapPollRow(p, options, { totalVotes: totalByPoll.get(pid) ?? 0 });
  });
}

/** Aktive Umfragen für Spieler in einer Kampagne (Übersicht). */
export async function getActivePollsForCampaignPlayer(
  campaignId: string,
  userId: string
): Promise<CampaignPoll[]> {
  const all = await getActivePollsForPlayer(userId);
  return all.filter((p) => p.campaignId === campaignId);
}
