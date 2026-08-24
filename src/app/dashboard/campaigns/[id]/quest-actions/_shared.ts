/**
 * Shared helpers for quest-actions.
 */
import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { QuestAnchor } from "@/src/types/quest";

/**
 * Server Actions für Quests (Journal)
 *
 * Unterstützt:
 * - Create Quest (with NPC/Location links)
 * - Update Quest
 * - Delete Quest
 * - Toggle Reveal Status
 * - Complete Quest
 * - Get Quests (with NPC & Location Joins)
 */

// ============================================================================
// Create Quest
// ============================================================================


