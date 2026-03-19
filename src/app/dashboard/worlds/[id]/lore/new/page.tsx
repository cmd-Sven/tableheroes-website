import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoreForm } from "@/src/components/dashboard/campaigns/lore/LoreForm";
import { getLoreEntriesByWorld } from "@/src/app/dashboard/campaigns/[id]/lore-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ parentId?: string; type?: string; deityName?: string; name?: string }>;
};

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

  // Initialer Name: z.B. für Religionen aus einem Weltenbau-Task ("Religion zu [Gottheit]")
  let initialName: string | undefined = undefined;
  if (sp.name && sp.name.trim()) {
    initialName = sp.name.trim();
  } else if (sp.deityName && sp.deityName.trim()) {
    initialName = `${sp.deityName.trim()} - Religion`;
  }

  // Falls wir mit ?deityName=... kommen, direkt die verknüpfte Gottheit auswählen
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
        createMode="lore"
        successRedirectHref={sp.parentId ? `/dashboard/worlds/${worldId}/lore/${sp.parentId}` : `/dashboard/worlds/${worldId}/lore`}
        initialParentId={sp.parentId ?? undefined}
        initialType={sp.type ?? undefined}
        initialName={initialName}
        initialReligionDeityId={initialReligionDeityId}
      />
    </div>
  );
}
