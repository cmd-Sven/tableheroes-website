import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoreForm } from "@/src/components/dashboard/campaigns/lore/LoreForm";
import { getLoreById, getLoreEntriesByWorld } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { isLocationType } from "@/src/lib/lore-types";

type Props = {
  params: Promise<{ id: string; loreId: string }>;
};

export default async function WorldEditLorePage({ params }: Props) {
  const { id: worldId, loreId } = await params;
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

  let lore;
  try {
    lore = await getLoreById(loreId);
  } catch {
    notFound();
  }

  if (!lore || (lore as any).world_id !== worldId) notFound();

  // Bestehende Gottheits-/Religionsdaten laden (für Wizard beim Bearbeiten)
  let initialDeityFields: {
    epithet?: string | null;
    symbol_description?: string | null;
    symbol_image_url?: string | null;
    domain?: string | null;
    dark_side?: string | null;
  } | null = null;
  let initialReligionDeityId: string | null = null;

  if ((lore as any).type === "Gottheit") {
    try {
      const { data: deity } = await (supabase.from("deities") as any)
        .select("epithet, symbol_description, symbol_image_url, domain, dark_side")
        .eq("world_id", worldId)
        .eq("name", (lore as any).name)
        .maybeSingle();
      if (deity) {
        initialDeityFields = deity as any;
      }
    } catch (error) {
      console.error("Error loading deity fields for edit:", error);
    }
  } else if ((lore as any).type === "Religion") {
    try {
      const { data: religion } = await (supabase.from("religions") as any)
        .select("deity_id")
        .eq("world_id", worldId)
        .eq("name", (lore as any).name)
        .maybeSingle();
      if (religion && (religion as any).deity_id) {
        initialReligionDeityId = String((religion as any).deity_id);
      }
    } catch (error) {
      console.error("Error loading religion deity for edit:", error);
    }
  }

  const loreEntries = await getLoreEntriesByWorld(worldId);
  const parentOptions = loreEntries
    .filter((e: any) => e.id !== loreId)
    .map((entry: any) => ({ id: entry.id, name: entry.name, type: entry.type }));

  const isLocation = isLocationType((lore as any).type);
  const backHref = isLocation ? `/dashboard/worlds/${worldId}/locations` : `/dashboard/worlds/${worldId}/lore`;
  const backLabel = isLocation ? "Zurück zu Orte" : "Zurück zu Lore";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <LoreForm
        worldId={worldId}
        initialData={lore as any}
        parentOptions={parentOptions}
        world={{ id: worldId, name: (worldRaw as any).name }}
        successRedirectHref={backHref}
        initialDeityFields={initialDeityFields}
        initialReligionDeityId={initialReligionDeityId}
      />
    </div>
  );
}
