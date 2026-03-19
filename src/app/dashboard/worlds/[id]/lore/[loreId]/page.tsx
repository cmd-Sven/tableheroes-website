import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getLoreById, getChildLoreEntries, getLoreEntriesForParentByWorld, getOrphanedLoreEntriesByWorld } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { getNPCsByLocationForWorld, getFactionsByLocationId } from "@/src/app/dashboard/worlds/world-location-actions";
import { isLocationType } from "@/src/lib/lore-types";
import { WorldLoreDetailClient } from "./WorldLoreDetailClient";

type Props = {
  params: Promise<{ id: string; loreId: string }>;
};

export default async function WorldLoreDetailPage({ params }: Props) {
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

  let lore: any;
  try {
    lore = await getLoreById(loreId);
  } catch {
    notFound();
  }

  if (!lore || lore.world_id !== worldId) notFound();

  // Religion-Details für Religions-Einträge laden
  let religionDetails: any = null;
  if (lore.type === "Religion") {
    try {
      const { data: religion } = await (supabase.from("religions") as any)
        .select("interpretation, priest_title, cleric_title, paladin_title, order_notes, magic_relation, relics, holidays, important_figures")
        .eq("world_id", worldId)
        .eq("name", lore.name)
        .maybeSingle();
      if (religion) {
        religionDetails = religion;
      }
    } catch (error) {
      console.error("Error loading religion details (world view):", error);
    }
  }

  // Gottheits-Details für Gottheits-Einträge laden
  let deityDetails: any = null;
  if (lore.type === "Gottheit") {
    try {
      const { data: deity } = await (supabase.from("deities") as any)
        .select("id, epithet, symbol_description, symbol_image_url, domain, dark_side")
        .eq("world_id", worldId)
        .eq("name", lore.name)
        .maybeSingle();
      if (deity) {
        const deityId = (deity as any).id;
        const { data: rels } = await (supabase.from("deity_relationships") as any)
          .select("target_deity_id, relation_type")
          .eq("world_id", worldId)
          .eq("source_deity_id", deityId);
        const relations = (rels || []) as Array<{ target_deity_id: string; relation_type: string }>;
        let targets: any[] = [];
        if (relations.length > 0) {
          const targetIds = Array.from(new Set(relations.map((r) => r.target_deity_id)));
          const { data: targetRows } = await (supabase.from("deities") as any)
            .select("id, name, epithet")
            .in("id", targetIds);
          targets = targetRows || [];
        }
        const targetMap = new Map<string, { name: string; epithet: string | null }>();
        targets.forEach((t: any) => {
          targetMap.set(String(t.id), {
            name: String(t.name ?? "Unbenannt"),
            epithet: t.epithet ?? null,
          });
        });
        const mappedRelations = relations.map((r) => ({
          relation_type: r.relation_type,
          target_id: r.target_deity_id,
          target_name: targetMap.get(r.target_deity_id)?.name ?? "Unbekannte Gottheit",
          target_epithet: targetMap.get(r.target_deity_id)?.epithet ?? null,
        }));
        deityDetails = { ...deity, relationships: mappedRelations };
      }
    } catch (error) {
      console.error("Error loading deity details (world view):", error);
    }
  }

  // Lore Metadata auflösen (Kultur ↔ Rassen ↔ Sprachen ↔ Religionen)
  let loreMetadata: any = {};
  try {
    const resolveIds = async (ids: string[]) => {
      if (!ids || ids.length === 0) return [];
      const { data } = await (supabase.from("world_lore") as any).select("id, name").in("id", ids);
      return (data || []) as Array<{ id: string; name: string }>;
    };

    if (lore.type === "Rasse") {
      if (lore.culture_id) {
        const { data: culture } = await (supabase.from("world_lore") as any).select("id, name").eq("id", lore.culture_id).maybeSingle();
        if (culture) { loreMetadata.cultureName = culture.name; loreMetadata.cultureId = culture.id; }
      }
      loreMetadata.raceSubtypes = lore.race_subtypes || null;
      loreMetadata.raceTraits = lore.race_traits || null;
      loreMetadata.linkedLanguages = await resolveIds(lore.language_ids || []);
      loreMetadata.linkedReligions = await resolveIds(lore.religion_ids || []);
    }
    if (lore.type === "Kultur") {
      const { data: raceRows } = await (supabase.from("world_lore") as any).select("id, name").eq("world_id", worldId).eq("type", "Rasse").eq("culture_id", loreId);
      loreMetadata.linkedRaces = (raceRows || []) as Array<{ id: string; name: string }>;
      loreMetadata.linkedLanguages = await resolveIds(lore.language_ids || []);
      loreMetadata.linkedReligions = await resolveIds(lore.religion_ids || []);
    }
    if (lore.type === "Sprache") {
      const { data: cultRows } = await (supabase.from("world_lore") as any).select("id, name").eq("world_id", worldId).eq("type", "Kultur").contains("language_ids", [loreId]);
      loreMetadata.spokenByCultures = (cultRows || []) as Array<{ id: string; name: string }>;
      const { data: raceRows } = await (supabase.from("world_lore") as any).select("id, name").eq("world_id", worldId).eq("type", "Rasse").contains("language_ids", [loreId]);
      loreMetadata.spokenByRaces = (raceRows || []) as Array<{ id: string; name: string }>;
    }
    if (lore.type === "Religion") {
      const { data: cultRows } = await (supabase.from("world_lore") as any).select("id, name").eq("world_id", worldId).eq("type", "Kultur").contains("religion_ids", [loreId]);
      loreMetadata.spokenByCultures = (cultRows || []) as Array<{ id: string; name: string }>;
    }
    if (isLocationType(lore.type)) {
      if (lore.culture_id) {
        const { data: culture } = await (supabase.from("world_lore") as any).select("id, name").eq("id", lore.culture_id).maybeSingle();
        if (culture) { loreMetadata.cultureName = culture.name; loreMetadata.cultureId = culture.id; }
      }
      loreMetadata.linkedLanguages = await resolveIds(lore.language_ids || []);
      loreMetadata.linkedReligions = await resolveIds(lore.religion_ids || []);
    }
  } catch (error) {
    console.error("Error resolving world lore metadata:", error);
  }

  const isLocation = isLocationType(lore.type);
  const backHref = isLocation ? `/dashboard/worlds/${worldId}/locations` : `/dashboard/worlds/${worldId}/lore`;
  const backLabel = isLocation ? "Zurück zu Orte" : "Zurück zu Lore";

  // Parse additional_images (can be JSON string from DB)
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

  // Parent für alle Lore-Typen laden (z.B. Ort bei "Geschichten & Legenden")
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
      childEntries = await getChildLoreEntries(loreId);
    } catch {}
    try {
      locationNPCs = await getNPCsByLocationForWorld(worldId, loreId);
    } catch {}
    try {
      factionsByLocation = await getFactionsByLocationId(worldId, loreId);
    } catch {}
    try {
      parentOptions = await getLoreEntriesForParentByWorld(worldId, loreId);
    } catch {}
    try {
      orphanedEntries = await getOrphanedLoreEntriesByWorld(worldId, loreId);
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
        loreId={loreId}
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
        religionDetails={religionDetails}
        deityDetails={deityDetails}
        loreMetadata={loreMetadata}
      />
    </div>
  );
}
