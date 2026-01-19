import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LoreDetailPage } from "@/src/components/dashboard/campaigns/lore/LoreDetailPage";
import { getLoreById, getChildLoreEntries, getLoreEntriesForParent, getLoreBreadcrumb, getOrphanedLoreEntries } from "../../lore-actions";
import { getNPCsByLocation } from "../../location-actions";

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

    if (!membership || !["Accepted", "Drafting", "In_Review"].includes(membership.status)) {
      redirect("/dashboard");
    }
  }

  // 4. Fetch Lore Entry
  let lore;
  try {
    lore = await getLoreById(loreId);
  } catch (error: any) {
    console.error("Error loading lore entry:", error);
    notFound();
  }

  // 5. Verify lore exists and belongs to this campaign
  if (!lore || (lore as any).campaign_id !== campaignId) {
    notFound();
  }

  // 6. Check visibility (for players)
  if (!isGM && !(lore as any).is_revealed) {
    redirect(`/dashboard/campaigns/${campaignId}?tab=lore`);
  }

  // 7. Load parent if exists
  let parent = null;
  if ((lore as any).parent_id) {
    try {
      const parentData = await getLoreById((lore as any).parent_id);
      parent = {
        id: parentData.id,
        name: parentData.name,
      };
    } catch (error) {
      // Parent not found, ignore
    }
  }

  // 8. Load NPCs for this Lore entry (via Location or Faction)
  const locationTypes = ["Ort", "Stadt", "Gebäude", "Region", "Insel", "Tempel", "Land", "Dungeon", "Akademie", "Markt", "Laden"];
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
    childEntries = await getChildLoreEntries(loreId);
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
    />
  );
}

