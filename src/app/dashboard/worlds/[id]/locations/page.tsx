import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLoreEntriesByWorld } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { WorldLocationsListClient } from "./WorldLocationsListClient";

import { LOCATION_TYPES } from "@/src/lib/lore-types";

export default async function WorldLocationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: world, error: dbError } = await (supabase.from("worlds") as any)
    .select("*")
    .eq("id", id)
    .single();

  const worldTyped = world as { id: string; name: string; gm_id?: string; blueprint?: unknown } | null;
  const isOwner = worldTyped && worldTyped.gm_id === user?.id;
  const hasBlueprint = !!worldTyped?.blueprint;

  if (!user || !world || dbError) {
    return (
      <div className="p-10 text-center">
        <p className="font-libre text-gray-400">Welt nicht gefunden oder kein Zugriff.</p>
        <Link href="/dashboard/worlds" className="text-hero-vibrant hover:underline mt-2 inline-block">Zu den Welten</Link>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-10 text-center">
        <p className="font-libre text-amber-500">Kein Zugriff auf diese Welt.</p>
        <Link href="/dashboard/worlds" className="text-hero-vibrant hover:underline mt-2 inline-block">Zu den Welten</Link>
      </div>
    );
  }

  if (!hasBlueprint) {
    return (
      <div className="p-10 text-center">
        <p className="font-libre text-gray-400">Bitte zuerst den Blueprint der Welt anlegen.</p>
        <Link href={`/dashboard/worlds/${id}`} className="text-hero-vibrant hover:underline mt-2 inline-block">Zur Welt-Übersicht</Link>
      </div>
    );
  }

  const loreEntries = await getLoreEntriesByWorld(id);
  const locationEntries = loreEntries.filter((e: { type?: string }) => (LOCATION_TYPES as readonly string[]).includes(e.type ?? ""));
  const worldId = id;
  const worldName = (world as { name: string }).name;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {worldName}
      </Link>

      <WorldLocationsListClient
        locations={locationEntries}
        worldId={worldId}
        worldName={worldName}
      />
    </div>
  );
}
