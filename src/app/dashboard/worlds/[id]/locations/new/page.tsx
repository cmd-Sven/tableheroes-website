import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoreForm } from "@/src/components/dashboard/campaigns/lore/LoreForm";
import { getLoreEntriesByWorld } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { LOCATION_TYPES } from "@/src/lib/lore-types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorldNewLocationPage({ params }: Props) {
  const { id: worldId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id")
    .eq("id", worldId)
    .single();

  if (!worldRaw || (worldRaw as { gm_id: string }).gm_id !== user.id) notFound();

  const world = worldRaw as { id: string; name: string };
  const loreEntries = await getLoreEntriesByWorld(worldId);
  const parentOptions = loreEntries
    .filter((e: { type?: string }) => (LOCATION_TYPES as readonly string[]).includes(e.type ?? ""))
    .map((entry: any) => ({ id: entry.id, name: entry.name, type: entry.type }));

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link
        href={`/dashboard/worlds/${worldId}/locations`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Orte
      </Link>
      <LoreForm
        worldId={worldId}
        parentOptions={parentOptions}
        world={{ id: world.id, name: world.name }}
        createMode="location"
        successRedirectHref={`/dashboard/worlds/${worldId}/locations`}
      />
    </div>
  );
}
