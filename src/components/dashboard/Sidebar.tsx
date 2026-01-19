"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import {
  Home,
  Map,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ScrollText,
  Sword,
  Backpack,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Book,
  User,
  Shield,
  FileText,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import { signOut } from "@/src/app/(auth)/signout-action";

type SidebarProps = {
  user: {
    username: string | null;
    avatar_url: string | null;
    email: string | undefined;
    primary_role: string | null;
  };
  initialCollapsed?: boolean;
};

export function Sidebar({ user, initialCollapsed = false }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false); // Mobile menu
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const role = user.primary_role || "Player";

  // Check if we're inside a campaign route
  const isInCampaign = params?.id && pathname?.startsWith("/dashboard/campaigns/");
  const campaignId = isInCampaign ? (params.id as string) : null;
  const currentTab = searchParams?.get("tab") || "overview";

  // Save collapsed state to cookie and sync with server + update CSS variable
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      document.documentElement.style.setProperty("--sidebar-width", "0");
      return;
    }

    // Update CSS variable immediately
    const width = isCollapsed ? "4rem" : "16rem";
    document.documentElement.style.setProperty("--sidebar-width", width);

    // Dispatch custom event for layout update
    window.dispatchEvent(
      new CustomEvent("sidebar-toggle", { detail: isCollapsed })
    );

    // Update cookie via API
    fetch("/api/sidebar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collapsed: isCollapsed }),
    }).catch(console.error);
  }, [isCollapsed]);

  // Mode A: General Dashboard Navigation (Default)
  const generalNav = [
    { href: "/dashboard", label: "Meine Kampagnen", icon: Map },
    { href: "/dashboard/characters", label: "Charaktere", icon: Users },
  ];

  // Campaign-specific Navigation (only visible when in campaign)
  const campaignNav = campaignId
    ? [
        { href: `/dashboard/campaigns/${campaignId}?tab=overview`, label: "Übersicht", icon: Home, tab: "overview" },
        { href: `/dashboard/campaigns/${campaignId}?tab=sessions`, label: "Sessions", icon: Calendar, tab: "sessions" },
        { href: `/dashboard/campaigns/${campaignId}?tab=lore`, label: "Welt & Lore", icon: Book, tab: "lore" },
        { href: `/dashboard/campaigns/${campaignId}?tab=npcs`, label: "NPCs & Fraktionen", icon: User, tab: "npcs" },
        { href: `/dashboard/campaigns/${campaignId}?tab=quests`, label: "Quests", icon: ScrollText, tab: "quests" },
        ...(role === "GameMaster" || role === "Admin"
          ? [{ href: `/dashboard/campaigns/${campaignId}?tab=members`, label: "Mitglieder", icon: Users, tab: "members" }]
          : []),
        { href: `/dashboard/campaigns/${campaignId}?tab=settings`, label: "Einstellungen", icon: Settings, tab: "settings" },
      ]
    : [];

  const settingsNav = [
    { href: "/dashboard/settings", label: "Einstellungen", icon: Settings },
  ];

  function toggleSidebar() {
    setIsOpen(!isOpen);
  }

  function toggleCollapse() {
    setIsCollapsed(!isCollapsed);
  }

  function NavItem({
    href,
    label,
    icon: Icon,
    isActive,
    tab,
  }: {
    href: string;
    label: string;
    icon: any;
    isActive?: boolean;
    tab?: string;
  }) {
    const active = isActive || (tab && currentTab === tab);
    return (
      <Link
        href={href}
        onClick={() => setIsOpen(false)}
        className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-barlow font-bold uppercase transition-colors ${
          active
            ? "bg-hero-dark text-white shadow-md"
            : "text-gray-400 hover:bg-hero-dark/20 hover:text-hero-vibrant"
        }`}
        title={isCollapsed ? label : undefined}
      >
        <Icon
          className={`h-5 w-5 flex-shrink-0 ${
            active ? "text-accent-gold" : "text-gray-500"
          }`}
        />
        {!isCollapsed && <span>{label}</span>}
        {isCollapsed && (
          <span className="absolute left-full ml-2 z-50 hidden rounded bg-black border border-gray-700 px-2 py-1 text-xs font-barlow font-bold uppercase text-white shadow-lg group-hover:block whitespace-nowrap">
            {label}
          </span>
        )}
      </Link>
    );
  }

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={toggleSidebar}
          className="rounded-md bg-background-card border border-hero-border p-2 text-hero-vibrant shadow-lg"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 transform bg-black border-r border-gray-700 transition-all duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "w-16" : "w-64"}`}
      >
        <div className="flex h-full flex-col">
          {/* Logo Header */}
          <div className={`flex h-16 items-center gap-2 border-b border-gray-700 px-6 ${isCollapsed ? "justify-center px-2" : ""}`}>
            <Sparkles className="h-6 w-6 text-accent-gold flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-barlow font-bold text-xl uppercase tracking-wide text-hero-vibrant">
                TableHeroes
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
            {/* Mode B: Campaign Mode - Back Button */}
            {isInCampaign && (
              <div className="mb-4">
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-barlow font-bold uppercase transition-colors text-gray-400 hover:bg-hero-dark/20 hover:text-hero-vibrant ${
                    isCollapsed ? "justify-center" : ""
                  }`}
                  title={isCollapsed ? "Zurück zum Dashboard" : undefined}
                >
                  <ArrowLeft className="h-5 w-5 flex-shrink-0 text-gray-500" />
                  {!isCollapsed && <span>Zurück zum Dashboard</span>}
                  {isCollapsed && (
                    <span className="absolute left-full ml-2 z-50 hidden rounded bg-background-card border border-hero-dark px-2 py-1 text-xs font-barlow font-bold uppercase text-white shadow-lg group-hover:block whitespace-nowrap">
                      Zurück zum Dashboard
                    </span>
                  )}
                </Link>
                {!isCollapsed && (
                  <div className="mx-3 my-2 h-px bg-hero-dark" />
                )}
              </div>
            )}

            {/* Mode A: General Dashboard Navigation (Default) */}
            {!isInCampaign && (
              <div className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 py-2 text-xs font-barlow font-bold uppercase text-gray-500">
                    Navigation
                  </p>
                )}
                {generalNav.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={pathname === item.href}
                  />
                ))}
              </div>
            )}

            {/* Mode B: Campaign Context Section */}
            {isInCampaign && campaignNav.length > 0 && (
              <div className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 py-2 text-xs font-barlow font-bold uppercase text-gray-500">
                    Aktuelle Kampagne
                  </p>
                )}
                {campaignNav.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    tab={item.tab}
                    isActive={false}
                  />
                ))}
              </div>
            )}

            {/* Settings (Always at bottom) */}
            <div className="space-y-1 mt-6 pt-6 border-t border-gray-700">
              {settingsNav.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={pathname === item.href && !isInCampaign}
                />
              ))}
            </div>
          </nav>

          {/* Toggle Collapse Button */}
          <div className="border-t border-gray-700 p-2">
            <button
              onClick={toggleCollapse}
              className="w-full flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-hero-dark/20 hover:text-hero-vibrant transition-colors"
              title={isCollapsed ? "Sidebar erweitern" : "Sidebar einklappen"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* User Footer */}
          <div className="border-t border-gray-700 bg-black p-4">
            <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-hero-border bg-background-dark flex-shrink-0">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username || "User"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-hero-dark text-white font-bold">
                    {(user.username?.[0] || user.email?.[0] || "U").toUpperCase()}
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden min-w-0">
                  <p className="truncate font-barlow font-bold text-sm text-white flex items-center gap-1">
                    {role === "GameMaster" || role === "Admin" ? "👑" : "🛡️"}{" "}
                    {user.username || "Held"}
                  </p>
                  <p className="truncate font-libre text-xs text-gray-500">
                    {user.email}
                  </p>
                </div>
              )}
              <button
                onClick={() => signOut()}
                className="rounded p-1 text-gray-400 hover:bg-red-900/30 hover:text-accent-blood transition-colors flex-shrink-0"
                title="Abmelden"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
