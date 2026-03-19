import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { WorldBlueprint } from "@/src/types/world";
import { WorldInitialState } from "@/src/components/worlds/WorldInitialState";
import { WorldDashboard } from "@/src/components/worlds/WorldDashboard";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function WorldDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("🌍 [WorldDetailPage] Auth user:", user?.id);

  if (!user) notFound();

  const { data: worldRaw, error } = await (supabase.from("worlds") as any)
    .select("*") // Debug: alle Spalten laden, um Schema-/Spaltenfehler auszuschließen
    .eq("id", id)
    .single();

  if (error) {
    console.error("🔴 [WorldDetailPage] Supabase Fehler Details:", {
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: error.code,
    });
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-accent-blood mb-2">
          Datenbank-Fehler beim Laden der Welt
        </h1>
        <p className="font-libre text-gray-300 mb-2">
          ID: <code className="text-accent-gold">{id}</code>
        </p>
        <p className="font-libre text-gray-400 mb-1">
          Code: <code className="text-accent-gold">{error.code}</code>
        </p>
        <p className="font-libre text-gray-400 mb-1">
          Nachricht: <code className="text-accent-gold">{error.message}</code>
        </p>
        <p className="font-libre text-gray-400">
          Angemeldete User-ID: <code className="text-accent-gold">{user.id}</code>
        </p>
      </div>
    );
  }

  if (!worldRaw) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-accent-blood mb-2">
          Welt nicht gefunden
        </h1>
        <p className="font-libre text-gray-300 mb-2">
          ID: <code className="text-accent-gold">{id}</code>
        </p>
        <p className="font-libre text-gray-400">
          Angemeldete User-ID: <code className="text-accent-gold">{user.id}</code>
        </p>
      </div>
    );
  }

  const world = worldRaw as {
    id: string;
    name: string;
    description: string | null;
    gm_id?: string;
    blueprint?: WorldBlueprint | null;
  };
  const hasBlueprint = !!world.blueprint;
  console.log("🌍 [WorldDetailPage] ID check:", {
    requestedId: id,
    worldId: world.id,
  });
  const isOwner = String(world.gm_id ?? "") === String(user.id ?? "");
  console.log("🌍 [WorldDetailPage] Ownership check:", {
    worldId: world.id,
    worldGmId: world.gm_id,
    userId: user.id,
    isOwner,
  });
  if (!isOwner) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-accent-blood mb-2">
          Kein Zugriff auf diese Welt
        </h1>
        <p className="font-libre text-gray-300 mb-2">
          Welt-ID: <code className="text-accent-gold">{world.id}</code>
        </p>
        <p className="font-libre text-gray-400 mb-2">
          gm_id: <code className="text-accent-gold">{world.gm_id ?? "–"}</code>
        </p>
        <p className="font-libre text-gray-400">
          Angemeldete User-ID: <code className="text-accent-gold">{user.id}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard/worlds"
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Welten
      </Link>

      <div className="rounded-md border border-hero-border bg-background-card p-6">
        {hasBlueprint ? (
          <WorldDashboard
            worldId={id}
            worldName={world.name}
            worldDescription={world.description}
            blueprint={world.blueprint ?? null}
            tab={tab}
          />
        ) : (
          <WorldInitialState
            worldId={id}
            worldName={world.name}
            worldDescription={world.description}
          />
        )}
      </div>
    </div>
  );
}
