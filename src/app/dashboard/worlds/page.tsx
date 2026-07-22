import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, ArrowLeft } from "lucide-react";
import { WorldsListClient } from "./WorldsListClient";
import { LOCATION_TYPES } from "@/src/lib/lore-types";

const THUMBS_PER_WORLD = 4;

function pushThumb(
  imagesByWorld: Record<string, Array<{ url: string; description: string }>>,
  worldId: string,
  url: string | null | undefined,
  description: string,
) {
  const trimmed = url?.trim();
  if (!trimmed) return;
  const list = imagesByWorld[worldId];
  if (!list || list.length >= THUMBS_PER_WORLD) return;
  if (list.some((img) => img.url === trimmed)) return;
  list.push({ url: trimmed, description });
}

export default async function WorldsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as { primary_role?: string } | null;
  const isGM =
    profile?.primary_role === "GameMaster" || profile?.primary_role === "Admin";

  if (!isGM) {
    return (
      <div className="mx-auto max-w-2xl rounded-md border border-hero-dark bg-background-card p-8 text-center">
        <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant mb-4">
          Nur für Spielleiter
        </h1>
        <p className="font-libre text-gray-400 mb-6">
          Welten & Lore können nur von Game Masters verwaltet werden.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zum Dashboard
        </Link>
      </div>
    );
  }

  // Schlanke Liste: Genre/Tech aus genre_style + blueprint->vibes (kein volles Blueprint).
  const { data: worldsRaw } = await (supabase.from("worlds") as any)
    .select("id, name, description, created_at, genre_style, vibes:blueprint->vibes")
    .eq("gm_id", user.id)
    .order("created_at", { ascending: false });

  const worldList =
    (worldsRaw as {
      id: string;
      name: string;
      description: string | null;
      created_at: string;
      genre_style?: string | null;
      vibes?: { genre?: string; tech_level?: string } | null;
    }[]) || [];
  const worldIds = worldList.map((w) => w.id);

  const npcCountByWorld: Record<string, number> = {};
  const loreCountByWorld: Record<string, number> = {};
  const factionCountByWorld: Record<string, number> = {};
  const locationCountByWorld: Record<string, number> = {};
  const campaignsByWorld: Record<string, number> = {};
  const imagesByWorld: Record<string, Array<{ url: string; description: string }>> = {};

  if (worldIds.length > 0) {
    worldIds.forEach((id) => {
      npcCountByWorld[id] = 0;
      loreCountByWorld[id] = 0;
      factionCountByWorld[id] = 0;
      locationCountByWorld[id] = 0;
      campaignsByWorld[id] = 0;
      imagesByWorld[id] = [];
    });

    // Counts: nur world_id (+ type für Orte). Thumbnails: begrenzte Rows mit URL.
    const [
      npcCountRes,
      loreCountRes,
      factionCountRes,
      campaignsRes,
      npcThumbsRes,
      loreThumbsRes,
      factionThumbsRes,
    ] = await Promise.all([
      (supabase.from("npcs") as any).select("world_id").in("world_id", worldIds),
      (supabase.from("world_lore") as any)
        .select("world_id, type")
        .in("world_id", worldIds),
      (supabase.from("factions") as any).select("world_id").in("world_id", worldIds),
      (supabase.from("campaigns") as any).select("world_id").in("world_id", worldIds),
      (supabase.from("npcs") as any)
        .select("world_id, image_url")
        .in("world_id", worldIds)
        .not("image_url", "is", null)
        .limit(Math.max(worldIds.length * THUMBS_PER_WORLD, THUMBS_PER_WORLD)),
      (supabase.from("world_lore") as any)
        .select("world_id, image_url, name")
        .in("world_id", worldIds)
        .not("image_url", "is", null)
        .limit(Math.max(worldIds.length * THUMBS_PER_WORLD, THUMBS_PER_WORLD)),
      (supabase.from("factions") as any)
        .select("world_id, image_url, banner_url")
        .in("world_id", worldIds)
        .or("image_url.not.is.null,banner_url.not.is.null")
        .limit(Math.max(worldIds.length * THUMBS_PER_WORLD, THUMBS_PER_WORLD)),
    ]);

    (npcCountRes.data || []).forEach((r: { world_id: string }) => {
      if (r.world_id) npcCountByWorld[r.world_id] = (npcCountByWorld[r.world_id] ?? 0) + 1;
    });
    (loreCountRes.data || []).forEach((r: { world_id: string; type?: string }) => {
      if (!r.world_id) return;
      loreCountByWorld[r.world_id] = (loreCountByWorld[r.world_id] ?? 0) + 1;
      if ((LOCATION_TYPES as readonly string[]).includes(r.type ?? "")) {
        locationCountByWorld[r.world_id] = (locationCountByWorld[r.world_id] ?? 0) + 1;
      }
    });
    (factionCountRes.data || []).forEach((r: { world_id: string }) => {
      if (r.world_id) {
        factionCountByWorld[r.world_id] = (factionCountByWorld[r.world_id] ?? 0) + 1;
      }
    });
    (campaignsRes.data || []).forEach((r: { world_id: string }) => {
      if (r.world_id) campaignsByWorld[r.world_id] = (campaignsByWorld[r.world_id] ?? 0) + 1;
    });

    (npcThumbsRes.data || []).forEach(
      (r: { world_id: string; image_url?: string | null }) => {
        pushThumb(imagesByWorld, r.world_id, r.image_url, "NPC");
      },
    );
    (loreThumbsRes.data || []).forEach(
      (r: { world_id: string; image_url?: string | null; name?: string }) => {
        pushThumb(imagesByWorld, r.world_id, r.image_url, r.name || "Lore");
      },
    );
    (factionThumbsRes.data || []).forEach(
      (r: {
        world_id: string;
        image_url?: string | null;
        banner_url?: string | null;
      }) => {
        pushThumb(imagesByWorld, r.world_id, r.image_url, "Fraktion");
        pushThumb(imagesByWorld, r.world_id, r.banner_url, "Banner");
      },
    );
  }

  const worlds = worldList.map((w) => {
    const images = imagesByWorld[w.id] ?? [];
    const vibes =
      w.vibes && typeof w.vibes === "object"
        ? (w.vibes as { genre?: string; tech_level?: string })
        : null;
    return {
      ...w,
      entries_count:
        (npcCountByWorld[w.id] ?? 0) +
        (loreCountByWorld[w.id] ?? 0) +
        (factionCountByWorld[w.id] ?? 0),
      npc_count: npcCountByWorld[w.id] ?? 0,
      lore_count: loreCountByWorld[w.id] ?? 0,
      location_count: locationCountByWorld[w.id] ?? 0,
      faction_count: factionCountByWorld[w.id] ?? 0,
      campaigns_count: campaignsByWorld[w.id] ?? 0,
      images,
      genre: (w.genre_style?.trim() || vibes?.genre?.trim() || null) as string | null,
      tech_level: (vibes?.tech_level?.trim() || null) as string | null,
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant flex items-center gap-3">
            <Globe className="h-10 w-10 text-accent-gold" />
            Welten & Lore
          </h1>
          <p className="mt-2 font-libre text-gray-400">
            Erstelle und verwalte deine Welten. Jede Kampagne braucht eine Basis-Welt für Lore und NPCs.
          </p>
        </div>
      </div>

      <WorldsListClient worlds={worlds} />
    </div>
  );
}
