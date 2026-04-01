import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { getBestariumPlayerDetail } from "../../bestarium-queries";
import { getBestariumCreatureById } from "@/src/app/dashboard/worlds/world-bestarium-actions";

type Props = { params: Promise<{ id: string; creatureId: string }> };

export default async function CampaignBestariumCreaturePage({ params }: Props) {
  const { id: campaignId, creatureId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;
  if (!campaign?.world_id) notFound();

  const isGM = campaign.gm_id === user.id;

  if (!isGM) {
    const { data: membership } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();

    const ok =
      membership &&
      ["Accepted", "Drafting", "In_Review"].includes((membership as { status: string }).status);
    if (!ok) redirect("/dashboard");
  }

  if (isGM) {
    const full = await getBestariumCreatureById(creatureId);
    if (!full || full.world_id !== campaign.world_id) notFound();
    redirect(`/dashboard/worlds/${campaign.world_id}/bestarium/${creatureId}`);
  }

  const safe = await getBestariumPlayerDetail(campaignId, creatureId);
  if (!safe) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/dashboard/campaigns/${campaignId}/bestarium`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Bestarium
      </Link>

      <article className="rounded-lg border border-hero-dark bg-background-card p-6 sm:p-8 shadow-lg space-y-6">
        <header className="border-b border-hero-border pb-4">
          {safe.image_url && (
            <div className="relative w-full max-h-64 aspect-video mb-4 rounded border border-hero-border overflow-hidden bg-hero-dark/40">
              <Image
                src={safe.image_url}
                alt=""
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 42rem"
                unoptimized={
                  safe.image_url.startsWith("http://") || safe.image_url.startsWith("https://")
                }
              />
            </div>
          )}
          <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant">
            {safe.name}
          </h1>
          <p className="font-libre text-sm text-gray-500 mt-2">
            Nur Beschreibung und allgemeines Wissen – keine Spielwerte.
          </p>
        </header>

        {safe.physical_description && (
          <section>
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-3">
              Beschreibung
            </h2>
            <div className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
              {safe.physical_description}
            </div>
          </section>
        )}

        {safe.player_knowledge && (
          <section>
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-3">
              Wissen &amp; Gerüchte
            </h2>
            <div className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
              {safe.player_knowledge}
            </div>
          </section>
        )}

        {!safe.physical_description && !safe.player_knowledge && (
          <p className="font-libre text-gray-500">
            Für diesen Eintrag hat die Spielleitung noch keinen Text für Spieler:innen hinterlegt.
          </p>
        )}
      </article>
    </div>
  );
}
