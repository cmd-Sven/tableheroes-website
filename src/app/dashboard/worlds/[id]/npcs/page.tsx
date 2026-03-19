import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNPCsByWorld } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { getWorldTasks } from "@/src/app/dashboard/worlds/world-tasks-actions";
import { getFactionsByWorld } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { getAllLocationsByWorld } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { WorldNPCsListClient } from "./WorldNPCsListClient";

export default async function WorldNPCsPage({
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
        <h1 className="text-2xl font-bold mb-4">🚨 DIAGNOSE-MODUS (NPCs) 🚨</h1>
        <p>Gefundene Welt: {world ? "✅ " + (world as any).name : "❌ NICHT GEFUNDEN"}</p>
        <p>User Authentifiziert: {user ? "✅ " + user.id : "❌ NEIN"}</p>
        <p>Datenbank-Fehler: {dbError?.message || "Keiner"}</p>
        <p>Auth-Fehler: {authError?.message || "Keiner"}</p>
        <p>DB-Code: {dbError?.code ?? "—"}</p>
        <p>Ist Owner: {worldTyped ? (isOwner ? "✅ Ja" : "❌ Nein") : "—"}</p>
        <p>Hat Blueprint: {worldTyped ? (hasBlueprint ? "✅ Ja" : "❌ Nein") : "—"}</p>
        <hr className="my-4 border-red-500" />
        <p>Gesuchte ID: {id}</p>
        <p className="text-xs text-gray-400 mt-4">
          Tipp: Wenn die Welt &quot;NICHT GEFUNDEN&quot; ist, aber in Supabase existiert, blockiert RLS den Zugriff auf dieser spezifischen Unterseite.
        </p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-10 bg-black text-amber-500 border-2 border-amber-500 font-mono">
        <h1 className="text-2xl font-bold mb-4">⛔ Kein Zugriff</h1>
        <p>Welt: {(world as any).name}</p>
        <p>Du bist nicht GM dieser Welt (gm_id stimmt nicht mit user.id überein).</p>
        <p className="text-sm mt-2">Gesuchte ID: {id}</p>
      </div>
    );
  }

  if (!hasBlueprint) {
    return (
      <div className="p-10 bg-black text-amber-500 border-2 border-amber-500 font-mono">
        <h1 className="text-2xl font-bold mb-4">📋 Blueprint fehlt</h1>
        <p>Welt &quot;{(world as any).name}&quot; hat noch keinen Blueprint. Bitte zuerst den World Wizard auf der Übersicht ausfüllen.</p>
        <Link href={`/dashboard/worlds/${id}`} className="text-hero-vibrant underline mt-2 inline-block">
          Zur Welt-Übersicht
        </Link>
      </div>
    );
  }

  const worldId = id;
  const worldName = (world as { name: string }).name;
  const [npcs, worldTasks, factions, locations] = await Promise.all([
    getNPCsByWorld(worldId),
    getWorldTasks(worldId),
    getFactionsByWorld(worldId),
    getAllLocationsByWorld(worldId),
  ]);

  const pendingNpcTasks = worldTasks.filter(
    (t) => t.type === "npc" && t.status === "pending"
  );
  const factionList = (factions ?? []).map((f: any) => ({
    id: String(f.id),
    name: String(f.name ?? ""),
  }));
  const locationList = (locations ?? []).map((l: any) => ({
    id: String(l.id),
    name: String(l.name),
    type: String(l.type ?? "Ort"),
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

      <WorldNPCsListClient
        npcs={npcs}
        worldId={worldId}
        worldName={worldName}
        pendingNpcTasks={pendingNpcTasks}
        factions={factionList}
        locations={locationList}
      />
    </div>
  );
}
