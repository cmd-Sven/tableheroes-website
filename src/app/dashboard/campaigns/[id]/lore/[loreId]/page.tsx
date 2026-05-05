import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LoreDetailPage } from "@/src/components/dashboard/campaigns/lore/LoreDetailPage";
import { getLoreById, getChildLoreEntries, getLoreEntriesForParent, getLoreBreadcrumb, getOrphanedLoreEntries } from "../../lore-actions";
import { getVisibilityForCampaign } from "../../campaign-visibility-queries";
import { getNPCsByLocation } from "../../location-actions";
import { isLocationType } from "@/src/lib/lore-types";

type Props = {
  params: Promise<{ id: string; loreId: string }>;
};

export default async function LoreDetailPageRoute({ params }: Props) {
  const { id: campaignId, loreId } = await params;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // 2. Check if user has access to campaign
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign) redirect("/dashboard");

  const isGM = campaign.gm_id === user.id;

  // 3. Check membership (if not GM)
  if (!isGM) {
    const { data: membershipRaw } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .single();

    // Expliziter Cast gegen 'never'
    const membership = membershipRaw as { status: string } | null;

    if (
      !membership ||
      !["Approved", "Active", "Drafting", "In_Review", "Changes_Proposed"].includes(membership.status)
    ) {
      redirect("/dashboard");
    }
  }

  // 4. Fetch Lore Entry
  let lore;
  try {
    lore = await getLoreById(loreId, { campaignId });
  } catch (error: any) {
    console.error("Error loading lore entry:", error);
    notFound();
  }

  if (!lore) notFound();

  // 5.1 Religion-Details für Religions-Einträge laden (+ verknüpfte Gottheit für Lore-Link)
  let religionDetails: any = null;
  let religionDeityLore: {
    loreId: string | null;
    name: string;
    epithet: string | null;
  } | null = null;
  if ((lore as any).type === "Religion") {
    try {
      const worldId = (lore as any).world_id;
      const { data: religion } = await (supabase.from("religions") as any)
        .select(
          "interpretation, priest_title, cleric_title, paladin_title, order_notes, magic_relation, relics, holidays, important_figures, deity_id"
        )
        .eq("world_id", worldId)
        .eq("name", (lore as any).name)
        .maybeSingle();
      if (religion) {
        religionDetails = religion;
      }
      const deityId = (religion as { deity_id?: string | null } | null)?.deity_id;
      if (deityId) {
        const { data: deity } = await (supabase.from("deities") as any)
          .select("name, epithet")
          .eq("id", deityId)
          .maybeSingle();
        if (deity) {
          const deityName = String((deity as any).name ?? "Unbenannt");
          const { data: deityLoreRow } = await (supabase.from("world_lore") as any)
            .select("id")
            .eq("world_id", worldId)
            .eq("type", "Gottheit")
            .eq("name", deityName)
            .maybeSingle();
          religionDeityLore = {
            loreId: deityLoreRow ? String((deityLoreRow as any).id) : null,
            name: deityName,
            epithet: (deity as any).epithet ?? null,
          };
        }
      }
    } catch (error) {
      console.error("Error loading religion details:", error);
    }
  }

  // 5.2 Gottheits-Details für Gottheits-Einträge laden
  let deityDetails: any = null;
  if ((lore as any).type === "Gottheit") {
    try {
      const worldId = (lore as any).world_id;
      const { data: deity } = await (supabase.from("deities") as any)
        .select("id, epithet, symbol_description, symbol_image_url, domain, dark_side")
        .eq("world_id", worldId)
        .eq("name", (lore as any).name)
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
      console.error("Error loading deity details:", error);
    }
  }

  // 5. Check visibility for this campaign (Spieler nur bei campaign_visibility.is_revealed)
  if (!isGM) {
    const visibility = await getVisibilityForCampaign(campaignId, "lore");
    if (!visibility[loreId]) {
      redirect(`/dashboard/campaigns/${campaignId}?tab=lore`);
    }
  }

  // 6. Resolve linked lore metadata (Kultur ↔ Rassen ↔ Sprachen ↔ Religionen)
  let loreMetadata: {
    cultureName?: string; cultureId?: string;
    linkedRaces?: Array<{ id: string; name: string }>;
    linkedLanguages?: Array<{ id: string; name: string }>;
    linkedReligions?: Array<{ id: string; name: string }>;
    raceSubtypes?: string | null;
    raceTraits?: string | null;
    spokenByCultures?: Array<{ id: string; name: string }>;
    spokenByRaces?: Array<{ id: string; name: string }>;
  } = {};

  try {
    const loreType = (lore as any).type;
    const worldId = (lore as any).world_id;

    // Helper: Resolve IDs to names from world_lore
    const resolveIds = async (ids: string[]) => {
      if (!ids || ids.length === 0) return [];
      const { data } = await (supabase.from("world_lore") as any)
        .select("id, name")
        .in("id", ids);
      return ((data || []) as Array<{ id: string; name: string }>);
    };

    if (loreType === "Rasse") {
      // Culture this race belongs to
      if ((lore as any).culture_id) {
        const { data: culture } = await (supabase.from("world_lore") as any)
          .select("id, name")
          .eq("id", (lore as any).culture_id)
          .maybeSingle();
        if (culture) {
          loreMetadata.cultureName = (culture as any).name;
          loreMetadata.cultureId = (culture as any).id;
        }
      }
      loreMetadata.raceSubtypes = (lore as any).race_subtypes || null;
      loreMetadata.raceTraits = (lore as any).race_traits || null;
      loreMetadata.linkedLanguages = await resolveIds((lore as any).language_ids || []);
      loreMetadata.linkedReligions = await resolveIds((lore as any).religion_ids || []);
    }

    if (loreType === "Kultur") {
      // Races that belong to this culture (race.culture_id === this.id)
      const { data: raceRows } = await (supabase.from("world_lore") as any)
        .select("id, name")
        .eq("world_id", worldId)
        .eq("type", "Rasse")
        .eq("culture_id", loreId);
      loreMetadata.linkedRaces = ((raceRows || []) as Array<{ id: string; name: string }>);
      loreMetadata.linkedLanguages = await resolveIds((lore as any).language_ids || []);
      loreMetadata.linkedReligions = await resolveIds((lore as any).religion_ids || []);
    }

    if (loreType === "Sprache") {
      // Cultures that speak this language
      const { data: cultRows } = await (supabase.from("world_lore") as any)
        .select("id, name")
        .eq("world_id", worldId)
        .eq("type", "Kultur")
        .contains("language_ids", [loreId]);
      loreMetadata.spokenByCultures = ((cultRows || []) as Array<{ id: string; name: string }>);

      // Races that speak this language
      const { data: raceRows } = await (supabase.from("world_lore") as any)
        .select("id, name")
        .eq("world_id", worldId)
        .eq("type", "Rasse")
        .contains("language_ids", [loreId]);
      loreMetadata.spokenByRaces = ((raceRows || []) as Array<{ id: string; name: string }>);
    }

    if (loreType === "Religion") {
      const { data: cultRows } = await (supabase.from("world_lore") as any)
        .select("id, name")
        .eq("world_id", worldId)
        .eq("type", "Kultur")
        .contains("religion_ids", [loreId]);
      loreMetadata.spokenByCultures = ((cultRows || []) as Array<{ id: string; name: string }>);
    }

    // Orte: Kultur, Sprachen, Religionen anzeigen (falls zugewiesen)
    if (isLocationType(loreType)) {
      if ((lore as any).culture_id) {
        const { data: culture } = await (supabase.from("world_lore") as any)
          .select("id, name")
          .eq("id", (lore as any).culture_id)
          .maybeSingle();
        if (culture) {
          loreMetadata.cultureName = (culture as any).name;
          loreMetadata.cultureId = (culture as any).id;
        }
      }
      loreMetadata.linkedLanguages = await resolveIds((lore as any).language_ids || []);
      loreMetadata.linkedReligions = await resolveIds((lore as any).religion_ids || []);
    }
  } catch (error) {
    console.error("Error resolving lore metadata:", error);
  }

  // 7. Load parent if exists
  let parent = null;
  if ((lore as any).parent_id) {
    try {
      const parentData = await getLoreById((lore as any).parent_id, { campaignId });
      parent = {
        id: parentData.id,
        name: parentData.name,
      };
    } catch (error) {
      // Parent not found, ignore
    }
  }

  // 8. Load NPCs for this Lore entry (via Location or Faction)
  let locationNPCs: { residents: any[]; guests: any[] } = { residents: [], guests: [] };
  
  try {
    // Strategy 1: Check if this Lore entry has a Location (locations.id === lore.id OR locations.lore_id === lore.id)
    let locationId: string | null = null;
    
    // First try: Location uses same ID as lore entry
    const { data: locationById } = await (supabase.from("locations") as any)
      .select("id")
      .eq("id", loreId)
      .maybeSingle();
    
    if (locationById) {
      locationId = (locationById as any).id;
    } else {
      // Second try: Location has lore_id field
      const { data: locationByLoreId } = await (supabase.from("locations") as any)
        .select("id")
        .eq("lore_id", loreId)
        .maybeSingle();
      
      if (locationByLoreId) {
        locationId = (locationByLoreId as any).id;
      }
    }

    if (locationId) {
      // Fetch NPCs for this location
      const npcs = await getNPCsByLocation(campaignId, locationId);
      if (npcs) {
        locationNPCs = {
          residents: npcs.residents || [],
          guests: npcs.guests || [],
        };
      }
    }

    // Strategy 2: If no location NPCs found, check for Faction NPCs
    if (locationNPCs.residents.length === 0 && locationNPCs.guests.length === 0) {
      // Check if any factions are linked to this lore entry
      const { data: factions } = await (supabase.from("factions") as any)
        .select("id")
        .eq("lore_id", loreId)
        .limit(10);

      if (factions && factions.length > 0) {
        // Fetch NPCs for all factions
        const factionIds = (factions as any[]).map((f: any) => f.id);
        const { data: factionNPCs } = await (supabase.from("npcs") as any)
          .select("id, name, image_url, role, status")
          .eq("campaign_id", campaignId)
          .in("faction_id", factionIds)
          .limit(50);

        if (factionNPCs && factionNPCs.length > 0) {
          // Convert to locationNPCs format for consistency
          locationNPCs = {
            residents: (factionNPCs as any[]).map((npc: any) => ({
              id: npc.id,
              name: npc.name,
              image_url: npc.image_url,
              role: npc.role,
              status: npc.status,
            })),
            guests: [],
          };
        }
      }
    }
  } catch (error) {
    console.error("Error loading NPCs for lore entry:", loreId, error);
    // Ensure locationNPCs is always a valid object
    locationNPCs = { residents: [], guests: [] };
  }

  // Ensure locationNPCs is always a valid object (never null)
  const safeLocationNPCs = locationNPCs || { residents: [], guests: [] };

  // 9. Load child lore entries (sub-regions/places)
  let childEntries: Array<{ id: string; name: string; type: string; image_url: string | null; is_revealed: boolean }> = [];
  try {
    childEntries = await getChildLoreEntries(loreId, campaignId);
  } catch (error) {
    console.error("Error loading child lore entries:", error);
  }

  // 10. Load breadcrumb path
  let breadcrumb: Array<{ id: string; name: string; type?: string }> = [];
  try {
    breadcrumb = await getLoreBreadcrumb(loreId);
  } catch (error) {
    console.error("Error loading breadcrumb:", error);
  }

  // 11. Load available parent options (only for GM)
  let parentOptions: Array<{ id: string; name: string; type: string }> = [];
  if (isGM) {
    try {
      parentOptions = await getLoreEntriesForParent(campaignId, loreId);
    } catch (error) {
      console.error("Error loading parent options:", error);
    }
  }

  // 12. Load orphaned lore entries (for linking existing entries)
  let orphanedEntries: Array<{ id: string; name: string; type: string; image_url: string | null }> = [];
  if (isGM) {
    try {
      orphanedEntries = await getOrphanedLoreEntries(campaignId, loreId);
    } catch (error) {
      console.error("Error loading orphaned entries:", error);
    }
  }

  // 13. Bereinige Breadcrumb-Daten (stelle sicher, dass type immer ein String ist)
  const safeBreadcrumb = breadcrumb.map((b: any) => ({
    ...b,
    type: b.type || "Eintrag"
  }));

  return (
    <LoreDetailPage
      lore={{ ...lore, parent } as any}
      campaignId={campaignId}
      isGM={isGM}
      locationNPCs={safeLocationNPCs}
      childEntries={childEntries}
      breadcrumb={safeBreadcrumb as any}
      parentOptions={parentOptions}
      orphanedEntries={orphanedEntries}
      religionDetails={religionDetails}
      religionDeityLore={religionDeityLore}
      deityDetails={deityDetails}
      loreMetadata={loreMetadata}
    />
  );
}

