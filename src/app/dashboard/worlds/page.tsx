import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, ArrowLeft } from "lucide-react";
import { WorldsListClient } from "./WorldsListClient";

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

  const { data: worldsRaw } = await (supabase.from("worlds") as any)
    .select("id, name, description, created_at, blueprint")
    .eq("gm_id", user.id)
    .order("created_at", { ascending: false });

  const worldList = (worldsRaw as { id: string; name: string; description: string | null; created_at: string; blueprint?: unknown }[]) || [];
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

    const [npcsRes, loreRes, factionsRes, campaignsRes] = await Promise.all([
      (supabase.from("npcs") as any).select("world_id, image_url").in("world_id", worldIds),
      (supabase.from("world_lore") as any).select("world_id, image_url, additional_images, name, type").in("world_id", worldIds),
      (supabase.from("factions") as any).select("world_id, image_url, banner_url").in("world_id", worldIds),
      (supabase.from("campaigns") as any).select("world_id").in("world_id", worldIds),
    ]);

    (npcsRes.data || []).forEach((r: { world_id: string; image_url?: string | null }) => {
      if (r.world_id) {
        npcCountByWorld[r.world_id] = (npcCountByWorld[r.world_id] ?? 0) + 1;
        if (r.image_url?.trim()) {
          imagesByWorld[r.world_id]!.push({ url: r.image_url.trim(), description: "NPC" });
        }
      }
    });
    (loreRes.data || []).forEach((r: { world_id: string; image_url?: string | null; additional_images?: unknown; name?: string; type?: string }) => {
      if (r.world_id) {
        loreCountByWorld[r.world_id] = (loreCountByWorld[r.world_id] ?? 0) + 1;
        const isLocation = ["Stadt", "Region", "Insel", "Gebäude", "Tempel", "Dorf", "Ort"].includes(r.type ?? "");
        if (isLocation) locationCountByWorld[r.world_id] = (locationCountByWorld[r.world_id] ?? 0) + 1;
        if (r.image_url?.trim()) {
          imagesByWorld[r.world_id]!.push({ url: r.image_url.trim(), description: r.name || r.type || "Lore" });
        }
        if (r.additional_images && Array.isArray(r.additional_images)) {
          (r.additional_images as Array<{ url?: string; description?: string }>).forEach((img) => {
            if (img?.url?.trim()) {
              imagesByWorld[r.world_id]!.push({ url: img.url.trim(), description: img.description || r.name || "Bild" });
            }
          });
        }
      }
    });
    (factionsRes.data || []).forEach((r: { world_id: string; image_url?: string | null; banner_url?: string | null }) => {
      if (r.world_id) {
        factionCountByWorld[r.world_id] = (factionCountByWorld[r.world_id] ?? 0) + 1;
        if (r.image_url?.trim()) imagesByWorld[r.world_id]!.push({ url: r.image_url!.trim(), description: "Fraktion" });
        if (r.banner_url?.trim()) imagesByWorld[r.world_id]!.push({ url: r.banner_url!.trim(), description: "Banner" });
      }
    });
    (campaignsRes.data || []).forEach((r: { world_id: string }) => {
      if (r.world_id) campaignsByWorld[r.world_id] = (campaignsByWorld[r.world_id] ?? 0) + 1;
    });
  }

  const worlds = worldList.map((w) => {
    const images = imagesByWorld[w.id] ?? [];
    const bp = w.blueprint as { vibes?: { genre?: string; tech_level?: string; magic_prevalence?: string } } | null;
    return {
      ...w,
      entries_count: (npcCountByWorld[w.id] ?? 0) + (loreCountByWorld[w.id] ?? 0) + (factionCountByWorld[w.id] ?? 0),
      npc_count: npcCountByWorld[w.id] ?? 0,
      lore_count: loreCountByWorld[w.id] ?? 0,
      location_count: locationCountByWorld[w.id] ?? 0,
      faction_count: factionCountByWorld[w.id] ?? 0,
      campaigns_count: campaignsByWorld[w.id] ?? 0,
      images: images,
      genre: bp?.vibes?.genre ?? null,
      tech_level: bp?.vibes?.tech_level ?? null,
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
