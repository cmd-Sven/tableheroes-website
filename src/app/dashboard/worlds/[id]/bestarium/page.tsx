import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllLocationsByWorld } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { getBestariumByWorld } from "@/src/app/dashboard/worlds/world-bestarium-actions";
import { WorldBestariumListClient } from "./WorldBestariumListClient";

export default async function WorldBestariumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const { data: world, error: dbError } = await (supabase.from("worlds") as any)
    .select("*")
    .eq("id", id)
    .single();

  const worldTyped = world as { id: string; name: string; gm_id?: string; blueprint?: unknown } | null;
  const isOwner = worldTyped && worldTyped.gm_id === user?.id;
  const hasBlueprint = !!worldTyped?.blueprint;

  if (!user || !world || dbError || authError) {
    return (
      <div className="p-10 bg-black text-red-500 border-2 border-red-500 font-mono">
        <h1 className="text-2xl font-bold mb-4">🚨 DIAGNOSE-MODUS (Bestarium) 🚨</h1>
        <p>Gefundene Welt: {world ? "✅ " + (world as any).name : "❌ NICHT GEFUNDEN"}</p>
        <p>User: {user ? "✅" : "❌"}</p>
        <p>DB: {dbError?.message || "—"}</p>
        <p className="text-xs mt-4">ID: {id}</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-10 bg-black text-amber-500 border-2 border-amber-500 font-mono">
        <h1 className="text-2xl font-bold mb-4">⛔ Kein Zugriff</h1>
        <p>Du bist nicht GM dieser Welt.</p>
      </div>
    );
  }

  if (!hasBlueprint) {
    return (
      <div className="p-10 bg-black text-amber-500 border-2 border-amber-500 font-mono">
        <h1 className="text-2xl font-bold mb-4">📋 Blueprint fehlt</h1>
        <p>Bitte zuerst den World Wizard auf der Übersicht ausfüllen.</p>
        <Link href={`/dashboard/worlds/${id}`} className="text-hero-vibrant underline mt-2 inline-block">
          Zur Welt-Übersicht
        </Link>
      </div>
    );
  }

  const worldId = id;
  const worldName = (world as { name: string }).name;

  const [creatures, locations, loreRes] = await Promise.all([
    getBestariumByWorld(worldId),
    getAllLocationsByWorld(worldId),
    (supabase.from("world_lore") as any)
      .select("id, name, type")
      .eq("world_id", worldId)
      .order("name", { ascending: true }),
  ]);

  const locationList = (locations ?? []).map((l: any) => ({
    id: String(l.id),
    name: String(l.name ?? "Ort"),
    type: String(l.type ?? "Ort"),
  }));

  const loreEntries = ((loreRes.data ?? []) as any[]).map((l) => ({
    id: String(l.id),
    name: String(l.name ?? "Lore"),
    type: l.type != null ? String(l.type) : null,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {worldName}
      </Link>

      <WorldBestariumListClient
        creatures={creatures}
        worldId={worldId}
        worldName={worldName}
        locations={locationList}
        loreEntries={loreEntries}
      />
    </div>
  );
}
