/**
 * Shared helpers for npc-actions.
 */
import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getVisibilityForCampaign } from "../campaign-visibility-queries";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { resolveNpcPortraitMetaForServer } from "@/src/lib/npc-portrait-meta";

/**
 * Server Actions für NPCs
 * 
 * Unterstützt:
 * - Create NPC
 * - Update NPC
 * - Delete NPC
 * - Toggle Reveal Status
 * - Get NPCs (with Faction Join)
 */

// ============================================================================
// Create NPC
// ============================================================================
import { NarrativeHook } from "@/src/types/npc";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";


