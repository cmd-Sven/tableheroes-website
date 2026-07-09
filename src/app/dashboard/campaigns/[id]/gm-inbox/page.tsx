import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPendingApprovalCharactersWithRequests } from "../player-npc-requests-queries";
import { GMInboxClient } from "@/src/components/dashboard/campaigns/GMInboxClient";
import { getOpenCharacterPlayerEditAlertsForGm } from "@/src/lib/characters/player-character-edit-alerts";
import { CharacterPlayerEditAlertsPanel } from "@/src/components/dashboard/characters/CharacterPlayerEditAlertsPanel";

type Props = {
  params: Promise<{ id: string }>;
};

type PendingApplicationItem = {
  id: string;
  user_id: string;
  username: string | null;
  hasCharacter: boolean;
  application_message: string | null;
};

export default async function GMInboxPage({ params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();
  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // A. Beitritts-Anfragen aus campaign_members (Applied/Pending)
  const { data: appliedRows } = await (supabase.from("campaign_members") as any)
    .select(
      "id, user_id, character_id, application_message, users:user_id(id, username)",
    )
    .eq("campaign_id", campaignId)
    .eq("status", "Applied")
    .order("created_at", { ascending: true });

  const pendingApplications: PendingApplicationItem[] = (appliedRows || []).map(
    (row: any) => ({
      id: row.id,
      user_id: row.user_id,
      username: row.users?.username ?? null,
      hasCharacter: !!row.character_id,
      application_message: row.application_message ?? null,
    }),
  );

  // B. Charakter-Entwürfe zur Prüfung (characters Pending_Approval)
  const pendingCharacters = await getPendingApprovalCharactersWithRequests(
    campaignId,
  );

  const playerEditAlerts = await getOpenCharacterPlayerEditAlertsForGm(
    user.id,
    campaignId,
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
            GM Inbox
          </h1>
          <p className="font-libre text-gray-400 mt-1">
            Beitritts-Anfragen und Charakter-Entwürfe zur Prüfung.
          </p>
        </div>
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className="rounded border border-hero-border px-4 py-2 font-barlow font-bold uppercase text-sm text-gray-300 hover:bg-hero-dark transition-colors"
        >
          ← Zurück zur Kampagne
        </Link>
      </div>

      {playerEditAlerts.length > 0 ? (
        <div className="mb-8">
          <CharacterPlayerEditAlertsPanel
            alerts={playerEditAlerts}
            campaignId={campaignId}
          />
        </div>
      ) : null}

      <GMInboxClient
        campaignId={campaignId}
        pendingApplications={pendingApplications}
        pendingCharacters={pendingCharacters}
      />
    </div>
  );
}
