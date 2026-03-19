import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Shield, Plus } from "lucide-react";
import { getFactionsByWorld } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { WorldFactionsListClient } from "./WorldFactionsListClient";

export default async function WorldFactionsPage({
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
        <h1 className="text-2xl font-bold mb-4">🚨 DIAGNOSE-MODUS (Fraktionen) 🚨</h1>
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

  const factions = await getFactionsByWorld(id);
  const worldId = id;

  // Erste Kampagne dieser Welt für "Fraktionen freigeben"-Link
  const { data: firstCampaign } = await (supabase.from("campaigns") as any)
    .select("id, name")
    .eq("world_id", id)
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {(world as any).name}
      </Link>

      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-hero-dark">
          <h1 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent-gold" />
            Fraktionen dieser Welt ({factions.length})
          </h1>
          <Link
            href={`/dashboard/worlds/${worldId}/factions/new`}
            className="flex items-center gap-2 rounded bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neue Fraktion
          </Link>
        </div>

        <p className="font-libre text-sm text-gray-400 mb-6">
          Fraktionen werden hier weltweit angelegt. Sichtbarkeit für Spieler steuerst du pro Kampagne im Tab „NPCs & Fraktionen“ (Auge-Symbol).
        </p>

        {firstCampaign && (
          <div className="mb-6 rounded border border-hero-vibrant/40 bg-hero-dark/20 p-4">
            <p className="font-libre text-sm text-gray-300 mb-2">
              <strong>Fraktionen für Spieler freigeben:</strong> Im Kampagnen-Tab „NPCs & Fraktionen“ findest du jede Fraktion mit einem Auge-Button zum Freischalten.
            </p>
            <Link
              href={`/dashboard/campaigns/${(firstCampaign as { id: string }).id}?tab=npcs`}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-xs text-black hover:bg-yellow-500 transition-colors"
            >
              Zu Kampagne „{(firstCampaign as { name: string }).name}" → Fraktionen freigeben
            </Link>
          </div>
        )}

        <WorldFactionsListClient factions={factions} worldId={worldId} />
      </div>
    </div>
  );
}
