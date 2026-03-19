import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLoreEntriesByWorld } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { NarrativeLocationWizard } from "@/src/components/worlds/NarrativeLocationWizard";
import { LOCATION_TYPES } from "@/src/lib/lore-types";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; parentId?: string }>;
};

export default async function WorldLocationCreatePage({ params, searchParams }: Props) {
  const { id: worldId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id, blueprint")
    .eq("id", worldId)
    .single();

  const world = worldRaw as { id: string; name: string; gm_id?: string; blueprint?: unknown } | null;
  if (!world || world.gm_id !== user.id) notFound();

  const hasBlueprint = !!world?.blueprint;
  if (!hasBlueprint) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Link
          href={`/dashboard/worlds/${worldId}/locations`}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Orte
        </Link>
        <div className="rounded-lg border border-amber-500/50 bg-amber-900/20 p-6">
          <p className="font-libre text-amber-200">
            Bitte zuerst den Blueprint der Welt anlegen, um den Orts-Wizard zu nutzen.
          </p>
        </div>
      </div>
    );
  }

  const loreEntries = await getLoreEntriesByWorld(worldId);
  const locationList = loreEntries
    .filter((e: { type?: string }) => (LOCATION_TYPES as readonly string[]).includes(e.type ?? ""))
    .map((entry: any) => ({
      id: String(entry.id),
      name: String(entry.name ?? ""),
      type: String(entry.type ?? "Ort"),
    }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}/locations`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Orte
      </Link>

      <NarrativeLocationWizard
        worldId={worldId}
        worldName={world.name}
        locations={locationList}
        initialType={sp.type ?? undefined}
        initialParentId={sp.parentId ?? undefined}
      />
    </div>
  );
}
