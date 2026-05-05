import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, Users, UserPlus, ShieldCheck, ArrowRight } from "lucide-react";
import { getPendingApplications } from "@/src/lib/queries/application-queries";
import { getPendingApprovalCharactersWithRequests } from "@/src/app/dashboard/campaigns/[id]/player-npc-requests-queries";

export const revalidate = 0;

export default async function GMInboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const role = (profile as { primary_role?: string } | null)?.primary_role;
  const isGM = role === "GameMaster" || role === "Admin";

  if (!isGM) {
    redirect("/dashboard");
  }

  const userId = user.id;

  // -------------------------------------------------------------------------
  // A. Kampagnen-Bewerbungen – zentrale Abfrage (dieselbe wie Badge)
  // Status: "Applied" (exakt wie getPendingApplicationsCount)
  // -------------------------------------------------------------------------
  const applicationList = await getPendingApplications(userId);

  const applicationsByCampaign = applicationList.reduce<
    Record<
      string,
      {
        campaignId: string;
        campaignName: string;
        items: Array<{
          id: string;
          username: string | null;
          message: string | null;
          createdAt: string | null;
        }>;
      }
    >
  >((acc, row) => {
    const campaign = row.campaigns;
    if (!campaign) return acc;
    const cid = campaign.id;
    const userRow = row.users;
    if (!acc[cid]) {
      acc[cid] = {
        campaignId: cid,
        campaignName: campaign.name || "Unbenannte Kampagne",
        items: [],
      };
    }
    acc[cid].items.push({
      id: row.id,
      username: userRow?.username ?? null,
      message: row.application_message ?? null,
      createdAt: row.created_at ?? null,
    });
    return acc;
  }, {});

  const campaignApplicationGroups = Object.values(applicationsByCampaign);

  // -------------------------------------------------------------------------
  // B. Charakter-Freigaben (unabhängig von A)
  // -------------------------------------------------------------------------
  const { data: gmCampaigns } = await (supabase.from("campaigns") as any)
    .select("id, name")
    .eq("gm_id", userId);

  const campaigns = (gmCampaigns || []) as Array<{
    id: string;
    name: string | null;
  }>;
  const characterGroups: Array<{
    campaignId: string;
    campaignName: string;
    characters: Awaited<
      ReturnType<typeof getPendingApprovalCharactersWithRequests>
    >;
  }> = [];

  for (const camp of campaigns) {
    const pendingCharacters = await getPendingApprovalCharactersWithRequests(
      camp.id,
    );
    if (pendingCharacters.length > 0) {
      characterGroups.push({
        campaignId: camp.id,
        campaignName: camp.name || "Unbenannte Kampagne",
        characters: pendingCharacters,
      });
    }
  }

  const hasCampaignApplications = campaignApplicationGroups.length > 0;
  const hasCharacterApprovals = characterGroups.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant flex items-center gap-3">
          <Inbox className="h-10 w-10" />
          GM Inbox
        </h1>
        <p className="font-libre text-gray-400 mt-2">
          Kampagnen-Bewerbungen und Charakter-Freigaben an einem Ort.
        </p>
      </div>

      <div className="space-y-10">
        {/* A. Kampagnen-Bewerbungen – immer rendern, eigene Leer-Anzeige */}
        <section>
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Kampagnen-Bewerbungen
          </h2>
          {!hasCampaignApplications ? (
            <div className="rounded-lg border border-hero-dark/50 bg-background-card p-6 text-center">
              <p className="font-libre text-gray-500">
                Keine neuen Bewerbungen für deine Kampagnen.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {campaignApplicationGroups.map((group) => (
                <div
                  key={group.campaignId}
                  className="rounded-lg border border-hero-dark bg-background-card p-6"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-hero-border pb-3">
                    <h3 className="font-barlow font-semibold text-xl text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-accent-gold" />
                      {group.campaignName}
                    </h3>
                    <Link
                      href={`/dashboard/campaigns/${group.campaignId}?tab=members`}
                      className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors"
                    >
                      Zur Mitgliederverwaltung
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <ul className="space-y-3">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-4 rounded border border-hero-dark/50 bg-background-dark p-4"
                      >
                        <div>
                          <p className="font-barlow font-bold text-white uppercase">
                            {item.username || "Unbekannt"}
                          </p>
                          {item.message && (
                            <p className="font-libre text-sm text-gray-400 mt-1 line-clamp-2">
                              {item.message}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* B. Charakter-Freigaben – immer rendern, eigene Leer-Anzeige */}
        <section>
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Charakter-Freigaben
          </h2>
          {!hasCharacterApprovals ? (
            <div className="rounded-lg border border-hero-dark/50 bg-background-card p-6 text-center">
              <p className="font-libre text-gray-500">
                Keine Charaktere warten auf Freigabe.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {characterGroups.map((group) => (
                <div
                  key={group.campaignId}
                  className="rounded-lg border border-hero-dark bg-background-card p-6"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-hero-border pb-3">
                    <h3 className="font-barlow font-semibold text-xl text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-accent-gold" />
                      {group.campaignName}
                    </h3>
                    <Link
                      href={`/dashboard/campaigns/${group.campaignId}/gm-inbox`}
                      className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors"
                    >
                      Charaktere prüfen
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <ul className="space-y-3">
                    {group.characters.map((char: any) => (
                      <li
                        key={char.id}
                        className="flex items-start justify-between gap-4 rounded border border-hero-dark/50 bg-background-dark p-4"
                      >
                        <div>
                          <p className="font-barlow font-bold text-white uppercase">
                            {char.name}
                          </p>
                          <p className="font-libre text-sm text-gray-400">
                            {char.class}
                            {char.race ? ` · ${char.race}` : ""}
                            {char.user?.username
                              ? ` · ${char.user.username}`
                              : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
