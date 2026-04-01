"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, Map, PawPrint, User, Users, LayoutDashboard } from "lucide-react";

type Props = {
  worldId: string;
};

const TABS: { key: string; label: string; href: (worldId: string) => string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Übersicht", href: (id) => `/dashboard/worlds/${id}`, icon: LayoutDashboard },
  { key: "npcs", label: "NPCs", href: (id) => `/dashboard/worlds/${id}/npcs`, icon: User },
  { key: "orte", label: "Orte", href: (id) => `/dashboard/worlds/${id}/locations`, icon: Map },
  { key: "lore", label: "Lore", href: (id) => `/dashboard/worlds/${id}/lore`, icon: Book },
  { key: "factions", label: "Fraktionen", href: (id) => `/dashboard/worlds/${id}/factions`, icon: Users },
  { key: "bestarium", label: "Bestarium", href: (id) => `/dashboard/worlds/${id}/bestarium`, icon: PawPrint },
];

export function WorldTabs({ worldId }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-hero-dark pb-4 mb-6">
      {TABS.map(({ key, label, href, icon: Icon }) => {
        const tabHref = href(worldId);
        const isActive =
          pathname === tabHref ||
          (pathname?.startsWith(tabHref + "/") ?? false);
        return (
          <Link
            key={key}
            href={tabHref}
            className={`flex items-center gap-2 rounded px-4 py-2 font-barlow font-bold text-sm uppercase transition-colors ${
              isActive
                ? "bg-hero-dark text-white"
                : "text-gray-400 hover:bg-hero-dark/30 hover:text-hero-vibrant"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
