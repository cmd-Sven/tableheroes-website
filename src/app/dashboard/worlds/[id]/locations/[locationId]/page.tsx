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
import {
  buildingMetaFromLocationRow,
  poiExtrasFromLocationRow,
} from "@/src/components/city/aurenfurt/load-aurenfurt-poi-lore";

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

  const [{ data: worldRaw }, { data: profileRaw }] = await Promise.all([
    (supabase.from("worlds") as any).select("id, name, gm_id").eq("id", worldId).single(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).single(),
  ]);

  const world = worldRaw as { id: string; name: string; gm_id: string | null } | null;
  const profile = profileRaw as { primary_role?: string } | null;
  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm =
    world?.gm_id != null && String(world.gm_id) === String(user.id);

  if (!world || (!isWorldGm && !isAdmin)) notFound();

  /** Viertel-Editor: Welt-SL und Admin — gleiche Logik wie Lore-Detail. */
  const isGm = isWorldGm || isAdmin;

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

  let aurenfurtBuilding: {
    streetId: string | null;
    fromEditor: boolean;
    districtId: string | null;
    active: boolean;
    mapU: number | null;
    mapV: number | null;
  } | null = null;
  let aurenfurtPoi: ReturnType<typeof poiExtrasFromLocationRow> = null;
  if (isLocation) {
    const { data: locMeta } = await (supabase.from("locations") as any)
      .select(
        "aurenfurt_street_id, created_via_map_editor, map_district_id, map_u, map_v, map_poi_kind, map_poi_influences",
      )
      .eq("id", locationId)
      .maybeSingle();
    aurenfurtPoi = poiExtrasFromLocationRow(locMeta);
    aurenfurtBuilding = buildingMetaFromLocationRow(locMeta);
  }

  const displayType = aurenfurtPoi?.kind ?? lore.type;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <WorldLoreDetailClient
        lore={{
          name: lore.name,
          type: displayType,
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
        isGm={isGm}
        isLocation={isLocation}
        parent={parent}
        loreType={displayType}
        childEntries={childEntries}
        locationNPCs={locationNPCs}
        factionsByLocation={factionsByLocation}
        parentOptions={parentOptions}
        orphanedEntries={orphanedEntries}
        aurenfurtBuilding={aurenfurtBuilding}
        aurenfurtPoi={aurenfurtPoi}
      />
    </div>
  );
}
