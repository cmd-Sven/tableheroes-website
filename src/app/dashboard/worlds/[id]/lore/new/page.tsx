import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoreForm } from "@/src/components/dashboard/campaigns/lore/LoreForm";
import { getLoreEntriesByWorld } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { isLocationType } from "@/src/lib/lore-types";
import { parseChronicleImportFromSearchParams } from "@/src/lib/session-chronicle/inbox-import-urls";
import type { ChronicleImportRef } from "@/src/lib/session-chronicle/chronicle-import-types";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    parentId?: string;
    type?: string;
    deityName?: string;
    name?: string;
    description?: string;
    chronicle_session?: string;
    chronicle_kind?: string;
    chronicle_index?: string;
  }>;
};

function toChronicleImportRef(
  parsed: ReturnType<typeof parseChronicleImportFromSearchParams>,
): ChronicleImportRef | undefined {
  if (!parsed || parsed.chronicle_kind !== "location") return undefined;
  return {
    sessionId: parsed.chronicle_session,
    kind: "location",
    index: parsed.chronicle_index,
  };
}

export default async function WorldNewLorePage({ params, searchParams }: Props) {
  const { id: worldId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id")
    .eq("id", worldId)
    .single();

  if (!worldRaw || (worldRaw as { gm_id: string }).gm_id !== user.id) notFound();

  const world = worldRaw as { id: string; name: string };
  const loreEntries = await getLoreEntriesByWorld(worldId);
  const parentOptions = loreEntries.map((entry: any) => ({
    id: entry.id,
    name: entry.name,
    type: entry.type,
  }));

  let initialName: string | undefined = undefined;
  if (sp.name && sp.name.trim()) {
    initialName = sp.name.trim();
  } else if (sp.deityName && sp.deityName.trim()) {
    initialName = `${sp.deityName.trim()} - Religion`;
  }

  let initialReligionDeityId: string | undefined = undefined;
  if (sp.deityName && sp.deityName.trim()) {
    try {
      const { data: deity } = await (supabase.from("deities") as any)
        .select("id")
        .eq("world_id", worldId)
        .eq("name", sp.deityName.trim())
        .maybeSingle();
      if (deity && (deity as any).id) {
        initialReligionDeityId = String((deity as any).id);
      }
    } catch (error) {
      console.error("Error preloading deity for new religion:", error);
    }
  }

  const chronicleImport = toChronicleImportRef(parseChronicleImportFromSearchParams(sp));
  const createMode = sp.type && isLocationType(sp.type) ? ("location" as const) : ("lore" as const);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link
        href={`/dashboard/worlds/${worldId}/lore`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Lore
      </Link>
      <LoreForm
        worldId={worldId}
        parentOptions={parentOptions}
        world={{ id: world.id, name: world.name }}
        createMode={createMode}
        successRedirectHref={sp.parentId ? `/dashboard/worlds/${worldId}/lore/${sp.parentId}` : `/dashboard/worlds/${worldId}/lore`}
        initialParentId={sp.parentId ?? undefined}
        initialType={sp.type ?? undefined}
        initialName={initialName}
        initialDescription={sp.description?.trim() || undefined}
        initialReligionDeityId={initialReligionDeityId}
        chronicleImport={chronicleImport}
      />
    </div>
  );
}
