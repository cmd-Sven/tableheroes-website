import Link from "next/link";
import { Book, Globe2, Map, PawPrint, User, Users } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { getWorldTasks } from "@/src/app/dashboard/worlds/world-tasks-actions";
import { getWorldDashboardData } from "@/src/app/dashboard/worlds/world-dashboard-actions";
import type { WorldBlueprint } from "@/src/types/world";
import { WorldRoadmap } from "@/src/components/worlds/WorldRoadmap";
import { WorldTaskBoard } from "@/src/components/worlds/WorldTaskBoard";
import { WorldDashboardCard } from "@/src/components/worlds/WorldDashboardCard";

type WorldDashboardProps = {
  worldId: string;
  worldName: string;
  worldDescription: string | null;
  blueprint: WorldBlueprint | null | undefined;
  tab: string;
};

export async function WorldDashboard({
  worldId,
  worldName,
  worldDescription,
  blueprint,
  tab,
}: WorldDashboardProps) {
  const supabase = await createClient();

  const { data: campaignsRaw } = await (supabase.from("campaigns") as any)
    .select("id, name")
    .eq("world_id", worldId)
    .order("created_at", { ascending: false });

  const campaigns = (campaignsRaw as { id: string; name: string }[]) || [];
  const hasBlueprint = !!blueprint;

  const worldTasks = hasBlueprint ? await getWorldTasks(worldId) : [];
  const pendingTasks = worldTasks.filter((t: any) => t.status === "pending");
  const dashboardData = hasBlueprint ? await getWorldDashboardData(worldId) : null;

  return (
    <>
      <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant flex items-center gap-3">
        <Book className="h-8 w-8 text-accent-gold" />
        {worldName}
      </h1>
      {worldDescription && (
        <p className="mt-4 font-libre text-gray-300 leading-relaxed">
          {worldDescription}
        </p>
      )}

      {hasBlueprint && (
        <>
          <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 mt-6">
            Weltenbau-Roadmap
          </h2>
          <WorldRoadmap
            worldId={worldId}
            worldName={worldName}
            blueprint={blueprint ?? null}
          />

          {pendingTasks.length > 0 && (
            <div className="mt-6 mb-6">
              <WorldTaskBoard worldId={worldId} tasks={pendingTasks} />
            </div>
          )}

          <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mt-8 mb-4">
            Welt verwalten
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            <WorldDashboardCard
              title="NPCs"
              icon={User}
              createHref={`/dashboard/worlds/${worldId}/npcs`}
              createLabel="NPC jetzt erstellen"
              hasPendingTodo={!!dashboardData && dashboardData.pendingTasksByType.npc > 0}
              lastItem={
                dashboardData?.lastNpc
                  ? { name: dashboardData.lastNpc.name, href: `/dashboard/worlds/${worldId}/npcs/${dashboardData.lastNpc.id}` }
                  : null
              }
            />
            <WorldDashboardCard
              title="Orte"
              icon={Map}
              createHref={`/dashboard/worlds/${worldId}/locations/new`}
              createLabel="Ort jetzt erstellen"
              hasPendingTodo={!!dashboardData && dashboardData.pendingTasksByType.location > 0}
              lastItem={
                dashboardData?.lastLocation
                  ? { name: dashboardData.lastLocation.name, href: `/dashboard/worlds/${worldId}/lore/${dashboardData.lastLocation.id}` }
                  : null
              }
            />
            <WorldDashboardCard
              title="Lore"
              icon={Book}
              createHref={`/dashboard/worlds/${worldId}/lore/new`}
              createLabel="Lore jetzt erstellen"
              lastItem={
                dashboardData?.lastLore
                  ? { name: dashboardData.lastLore.name, href: `/dashboard/worlds/${worldId}/lore/${dashboardData.lastLore.id}` }
                  : null
              }
            />
            <WorldDashboardCard
              title="Fraktionen"
              icon={Users}
              createHref={`/dashboard/worlds/${worldId}/factions/new`}
              createLabel="Fraktion jetzt erstellen"
              hasPendingTodo={!!dashboardData && dashboardData.pendingTasksByType.faction > 0}
              lastItem={
                dashboardData?.lastFaction
                  ? { name: dashboardData.lastFaction.name, href: `/dashboard/worlds/${worldId}/factions/${dashboardData.lastFaction.id}` }
                  : null
              }
            />
            <WorldDashboardCard
              title="Bestarium"
              icon={PawPrint}
              createHref={`/dashboard/worlds/${worldId}/bestarium`}
              createLabel="Kreatur anlegen"
              lastItem={
                dashboardData?.lastBestarium
                  ? {
                      name: dashboardData.lastBestarium.name,
                      href: `/dashboard/worlds/${worldId}/bestarium/${dashboardData.lastBestarium.id}`,
                    }
                  : null
              }
            />
            <WorldDashboardCard
              title="Weltkarten"
              icon={Globe2}
              createHref={`/dashboard/worlds/${worldId}/maps`}
              createLabel="Karte anlegen"
              lastItem={null}
            />
          </div>

          <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mt-8 mb-4">
            Kampagnen in dieser Welt
          </h2>
          {campaigns.length === 0 ? (
            <p className="font-libre text-gray-500">
              Noch keine Kampagnen mit dieser Welt verknüpft. Beim Anlegen einer neuen Kampagne kannst du
              diese Welt als Basis-Welt wählen.
            </p>
          ) : (
            <ul className="space-y-2">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/campaigns/${c.id}?tab=lore`}
                    className="inline-flex items-center gap-2 font-libre text-hero-vibrant hover:text-white transition-colors"
                  >
                    <Map className="h-4 w-4" />
                    {c.name}
                  </Link>
                  <span className="text-gray-500 text-sm ml-2">
                    — Sichtbarkeit (Auge) & Spieler-Ansicht
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

