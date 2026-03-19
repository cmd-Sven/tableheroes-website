import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import {
  getLoreById,
  getChildLoreEntries,
  getLoreEntriesForParentByWorld,
  getOrphanedLoreEntriesByWorld,
} from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import {
  getNPCsByLocationForWorld,
  getFactionsByLocationId,
} from "@/src/app/dashboard/worlds/world-location-actions";
import { isLocationType } from "@/src/lib/lore-types";
import { WorldLoreDetailClient } from "../../lore/[loreId]/WorldLoreDetailClient";

type Props = {
  params: Promise<{ id: string; locationId: string }>;
};

export default async function WorldLocationDetailPage({ params }: Props) {
  const { id: worldId, locationId } = await params;
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

  let lore: any;
  try {
    lore = await getLoreById(locationId);
  } catch {
    notFound();
  }

  if (!lore || lore.world_id !== worldId) notFound();

  const isLocation = isLocationType(lore.type);
  const backHref = isLocation ? `/dashboard/worlds/${worldId}/locations` : `/dashboard/worlds/${worldId}/lore`;
  const backLabel = isLocation ? "Zurück zu Orte" : "Zurück zu Lore";

  const parseAdditionalImages = (val: unknown): Array<{ url: string; description: string }> => {
    if (!val) return [];
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.filter((i: any) => i?.url?.trim()) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(val) ? val.filter((i: any) => i?.url?.trim()) : [];
  };

  const additionalImages = parseAdditionalImages(lore.additional_images);

  let parent: { id: string; name: string; type?: string } | null = null;
  let childEntries: Array<{ id: string; name: string; type: string; image_url: string | null }> = [];
  let locationNPCs = { residents: [] as any[], guests: [] as any[] };
  let factionsByLocation: any[] = [];
  let parentOptions: Array<{ id: string; name: string; type: string }> = [];
  let orphanedEntries: Array<{ id: string; name: string; type: string; image_url: string | null }> = [];

  if (lore.parent_id) {
    try {
      const parentData = await getLoreById(lore.parent_id);
      parent = { id: parentData.id, name: parentData.name, type: parentData.type };
    } catch {}
  }

  if (isLocation) {
    try {
      childEntries = await getChildLoreEntries(locationId);
    } catch {}
    try {
      locationNPCs = await getNPCsByLocationForWorld(worldId, locationId);
    } catch {}
    try {
      factionsByLocation = await getFactionsByLocationId(worldId, locationId);
    } catch {}
    try {
      parentOptions = await getLoreEntriesForParentByWorld(worldId, locationId);
    } catch {}
    try {
      orphanedEntries = await getOrphanedLoreEntriesByWorld(worldId, locationId);
    } catch {}
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <WorldLoreDetailClient
        lore={{
          name: lore.name,
          type: lore.type,
          description: lore.description,
          image_url: lore.image_url,
          gm_notes: lore.gm_notes,
          additional_images: additionalImages,
          parent_id: lore.parent_id,
        }}
        worldId={worldId}
        loreId={locationId}
        backHref={backHref}
        backLabel={backLabel}
        isLocation={isLocation}
        parent={parent}
        loreType={lore.type}
        childEntries={childEntries}
        locationNPCs={locationNPCs}
        factionsByLocation={factionsByLocation}
        parentOptions={parentOptions}
        orphanedEntries={orphanedEntries}
      />
    </div>
  );
}

