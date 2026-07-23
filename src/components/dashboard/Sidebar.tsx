"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  usePathname,
  useParams,
  useSearchParams,
  useRouter,
} from "next/navigation";
import {
  Home,
  Map,
  MapPin,
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
  Inbox,
  Award,
  Trophy,
  Megaphone,
  Mic,
  Newspaper,
  Hammer,
  Coins,
  Store,
  BarChart3,
  PawPrint,
  Scale,
  Globe2,
} from "lucide-react";
import Image from "next/image";
import { signOut } from "@/src/app/(auth)/signout-action";
import { toggleMaintenanceMode } from "@/src/lib/actions/admin-actions";
import { getCampaignWorldId } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-actions";
import { createClient as createBrowserSupabaseClient } from "@/src/lib/supabase/client";

type SidebarProps = {
  user: {
    id?: string;
    username: string | null;
    avatar_url: string | null;
    email: string | undefined;
    primary_role: string | null;
    role?: string | null;
    display_name?: string | null;
  };
  initialCollapsed?: boolean;
  /** Anzahl ausstehender Bewerbungen (für GM) – wird am GM-Inbox-Link als Badge angezeigt */
  pendingApplicationsCount?: number;
  /** Wartungsmodus aktiv (nur für Admins) */
  maintenanceMode?: boolean;
};

export function Sidebar({
  user,
  initialCollapsed = false,
  pendingApplicationsCount = 0,
  maintenanceMode = false,
}: SidebarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false); // Mobile menu
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [maintenanceToggling, setMaintenanceToggling] = useState(false);
  const [campaignWorldId, setCampaignWorldId] = useState<string | null>(null);
  const [worldHasBlueprint, setWorldHasBlueprint] = useState<boolean | null>(null);
  /** Spieler ohne Charakter: Sessions-Link nicht nutzbar (GM der Kampagne ausgenommen). */
  const [sessionsNavLocked, setSessionsNavLocked] = useState<boolean | null>(null);
  /** Anzeigename der aktuellen Kampagne (Pfad /dashboard/campaigns/[id]/…) */
  const [campaignScopeName, setCampaignScopeName] = useState<string | null>(null);
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const role = user.primary_role || user?.role || "Player";

  // Kampagnen-ID: useParams().id kommt aus dem dynamischen Segment [id]; im Dashboard-Root-Layout
  // kann das in seltenen Fällen leer sein. Zuverlässiger Fallback: erstes Segment nach /dashboard/campaigns/
  // (nicht pathSegments[4] – bei /campaigns/[uuid] ist die UUID Index 3, bei /campaigns/[uuid]/lore wäre [4] = "lore".)
  function campaignIdFromPath(path: string | null | undefined): string | undefined {
    if (!path?.startsWith("/dashboard/campaigns/")) return undefined;
    const m = path.match(/^\/dashboard\/campaigns\/([^/]+)/);
    const seg = m?.[1];
    if (!seg || seg === "new") return undefined;
    return seg;
  }
  const rawParamId = params?.id;
  const paramCampaignId =
    typeof rawParamId === "string"
      ? rawParamId
      : Array.isArray(rawParamId)
        ? rawParamId[0]
        : undefined;
  const campaignId = paramCampaignId || campaignIdFromPath(pathname ?? null);
  const isInCampaign = !!campaignId;

  // Welt-Kontext: nur wenn wir unter /dashboard/worlds/[id]/ sind; "new" und leere Werte ausschließen
  const worldPathMatch = pathname?.match(/^\/dashboard\/worlds\/([^/]+)/);
  const rawWorldSegment = worldPathMatch?.[1];
  const worldId: string | undefined =
    rawWorldSegment &&
    rawWorldSegment !== "new" &&
    rawWorldSegment !== "undefined"
      ? rawWorldSegment
      : undefined;
  const isInWorld = !!worldId;

  useEffect(() => {
    if (campaignId && (role === "GameMaster" || role === "Admin")) {
      getCampaignWorldId(campaignId).then(setCampaignWorldId);
    } else {
      setCampaignWorldId(null);
    }
  }, [campaignId, role]);

  useEffect(() => {
    const uid = user?.id;
    if (!campaignId || !uid) {
      setSessionsNavLocked(null);
      return;
    }
    const supabase = createBrowserSupabaseClient();
    let cancelled = false;
    (async () => {
      const { data: camp } = await supabase
        .from("campaigns")
        .select("gm_id")
        .eq("id", campaignId)
        .maybeSingle();
      if (cancelled) return;
      if ((camp as { gm_id?: string } | null)?.gm_id === uid) {
        setSessionsNavLocked(false);
        return;
      }
      const { data: m } = await supabase
        .from("campaign_members")
        .select("character_id")
        .eq("campaign_id", campaignId)
        .eq("user_id", uid)
        .maybeSingle();
      let hasChar = !!(m as { character_id?: string | null } | null)?.character_id;
      if (!hasChar) {
        const { data: ch } = await supabase
          .from("characters")
          .select("id")
          .eq("user_id", uid)
          .eq("campaign_id", campaignId)
          .maybeSingle();
        hasChar = !!ch;
      }
      if (!cancelled) setSessionsNavLocked(!hasChar);
    })().catch(() => {
      if (!cancelled) setSessionsNavLocked(false);
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, user?.id]);

  useEffect(() => {
    if (!campaignId) {
      setCampaignScopeName(null);
      return;
    }
    const supabase = createBrowserSupabaseClient();
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("name")
        .eq("id", campaignId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setCampaignScopeName(null);
        return;
      }
      setCampaignScopeName(
        (data as { name?: string | null }).name?.trim() || null,
      );
    })().catch(() => {
      if (!cancelled) setCampaignScopeName(null);
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  // Welt-Blueprint für Welt-Kontext laden (clientseitig, damit Sidebar weiß, ob NPCs/Lore/Fraktionen freigeschaltet werden sollen)
  useEffect(() => {
    if (!isInWorld || !worldId) {
      setWorldHasBlueprint(null);
      return;
    }
    const supabase = createBrowserSupabaseClient();
    (async () => {
      try {
        const { data, error } = await supabase
          .from("worlds")
          .select("id, blueprint")
          .eq("id", worldId)
          .single();
        if (error) {
          console.error("Sidebar: Fehler beim Laden des World-Blueprints:", error);
          setWorldHasBlueprint(false);
        } else {
          setWorldHasBlueprint(!!(data as any)?.blueprint);
        }
      } catch (err) {
        console.error("Sidebar: Unerwarteter Fehler beim Laden des World-Blueprints:", err);
        setWorldHasBlueprint(false);
      }
    })();
  }, [isInWorld, worldId]);

  const isAdmin =
    user?.role === "Admin" ||
    user?.primary_role === "Admin" ||
    user?.username === "Gamemaster";

  // Debug: Rollen-Anzeige (F12 → Konsole)
  useEffect(() => {
    console.log("DEBUG SIDEBAR:", {
      role: user?.role,
      primary: user?.primary_role,
      username: user?.username,
      isAdmin,
    });
  }, [user?.role, user?.primary_role, user?.username, isAdmin]);

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
    { href: "/dashboard", label: "Mein Dashboard", icon: Home },
    { href: "/dashboard/my-campaigns", label: "Meine Kampagnen", icon: Map },
    { href: "/dashboard/sessions", label: "Termine", icon: Calendar },
    ...(role === "GameMaster" || role === "Admin"
      ? [
          { href: "/dashboard/worlds", label: "Welten & Lore", icon: Book },
        ]
      : []),
    { href: "/dashboard/characters", label: "Charaktere", icon: Users },
    { href: "/dashboard/achievements", label: "Achievements", icon: Award },
    { href: "/dashboard/points", label: "Punkte", icon: Coins },
    { href: "/dashboard/news", label: "News-Archiv", icon: Newspaper },
    ...(role === "GameMaster"
      ? [
          {
            href: "/dashboard/gm/planning-events",
            label: "Spielplanung (Einladungen)",
            icon: Calendar,
          },
          {
            href: "/dashboard/gm/achievements",
            label: "Achievement anlegen (GM)",
            icon: Trophy,
          },
          {
            href: "/dashboard/gm/points-catalog",
            label: "Punktekatalog (GM)",
            icon: Coins,
          },
        ]
      : []),
  ];

  // Admin-Sektion: ausschließlich über isAdmin steuern
  const adminItems = isAdmin
    ? [
        {
          href: "/dashboard/admin/users",
          label: "Nutzer-Verwaltung",
          icon: Users,
        },
        {
          href: "/dashboard/admin/events",
          label: "Community-Termine",
          icon: Calendar,
        },
        {
          href: "/dashboard/gm/planning-events",
          label: "Spielplanung (Einladungen)",
          icon: Calendar,
        },
        {
          href: "/dashboard/admin/news",
          label: "Plattform-News",
          icon: Newspaper,
        },
        {
          href: "/dashboard/gm/achievements",
          label: "Achievement-Studio",
          icon: Trophy,
        },
        {
          href: "/dashboard/gm/points-catalog",
          label: "Punktekatalog",
          icon: Coins,
        },
      ]
    : [];

  async function handleToggleMaintenance() {
    setMaintenanceToggling(true);
    try {
      await toggleMaintenanceMode();
      router.refresh();
    } finally {
      setMaintenanceToggling(false);
    }
  }

  // Campaign-specific Navigation (only visible when in campaign)
  const campaignNav = campaignId
    ? [
        {
          href: `/dashboard/campaigns/${campaignId}?tab=overview`,
          label: "Übersicht",
          icon: Home,
          tab: "overview",
        },
        {
          href: `/dashboard/campaigns/${campaignId}?tab=sessions`,
          label: "Sessions",
          icon: Calendar,
          tab: "sessions",
        },
        {
          href: `/dashboard/campaigns/${campaignId}/lore`,
          label: "Welt & Lore",
          icon: Book,
          tab: "lore",
        },
        {
          href: `/dashboard/campaigns/${campaignId}/npcs`,
          label: "NPCs",
          icon: User,
          tab: "npcs",
        },
        {
          href: `/dashboard/campaigns/${campaignId}/factions`,
          label: "Fraktionen",
          icon: Shield,
          tab: "factions",
        },
        {
          href: `/dashboard/campaigns/${campaignId}/bestarium`,
          label: "Bestarium",
          icon: PawPrint,
          tab: undefined,
        },
        {
          href: `/dashboard/campaigns/${campaignId}/maps`,
          label: "Weltkarten",
          icon: Globe2,
          tab: undefined,
        },
        {
          href: `/dashboard/campaigns/${campaignId}?tab=quests`,
          label: "Quests",
          icon: ScrollText,
          tab: "quests",
        },
        {
          href: `/dashboard/campaigns/${campaignId}?tab=polls`,
          label: "Umfragen",
          icon: BarChart3,
          tab: "polls",
        },
        {
          href: `/dashboard/campaigns/${campaignId}/regelsystem`,
          label: "Regelsystem",
          icon: Scale,
          tab: undefined,
        },
        ...(role === "GameMaster" || role === "Admin"
          ? [
              ...(campaignWorldId
                ? [
                    {
                      href: `/dashboard/worlds/${campaignWorldId}`,
                      label: "Zum Welt-Editor",
                      icon: Book,
                      tab: undefined as string | undefined,
                    },
                  ]
                : []),
              {
                href: `/dashboard/campaigns/${campaignId}?tab=members`,
                label: "Teilnehmer",
                icon: Users,
                tab: "members",
              },
              {
                href: `/dashboard/campaigns/${campaignId}/shops`,
                label: "Shops",
                icon: Store,
                tab: undefined,
              },
              {
                href: `/dashboard/campaigns/${campaignId}/chronist`,
                label: "Chronist",
                icon: Mic,
                tab: undefined,
              },
              {
                href: `/dashboard/campaigns/${campaignId}/gm-inbox`,
                label: "GM Inbox",
                icon: Inbox,
                tab: undefined,
                badge: pendingApplicationsCount,
              },
              {
                href: `/dashboard/campaigns/${campaignId}?tab=settings`,
                label: "Einstellungen",
                icon: Settings,
                tab: "settings",
              },
            ]
          : []),
      ]
    : [];

  const settingsNav = [
    { href: "/dashboard/settings", label: "Einstellungen", icon: Settings },
  ];

  // Welt-Kontext-Navigation – gleiche Reihenfolge und Bezeichnungen wie die Tabs auf der Welt-Übersicht
  const worldNav = worldId
    ? [
        { href: `/dashboard/worlds/${worldId}`, label: "Übersicht", icon: Home, tab: "overview" as string | undefined },
        { href: `/dashboard/worlds/${worldId}/npcs`, label: "NPCs", icon: User },
        { href: `/dashboard/worlds/${worldId}/locations`, label: "Orte", icon: Map },
        { href: `/dashboard/worlds/${worldId}/lore`, label: "Lore", icon: Book },
        { href: `/dashboard/worlds/${worldId}/factions`, label: "Fraktionen", icon: Shield },
        { href: `/dashboard/worlds/${worldId}/bestarium`, label: "Bestarium", icon: PawPrint },
      ]
    : [];

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
    badge,
    disabled,
    disabledTitle,
  }: {
    href: string;
    label: string;
    icon: any;
    isActive?: boolean;
    tab?: string;
    badge?: number;
    disabled?: boolean;
    disabledTitle?: string;
  }) {
    const active = isActive || (tab && currentTab === tab);
    const showBadge = typeof badge === "number" && badge > 0;
    if (disabled) {
      return (
        <span
          className="group relative flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-sm font-barlow font-bold uppercase text-gray-400"
          title={
            disabledTitle ||
            (isCollapsed ? label : undefined) ||
            undefined
          }
        >
          <Icon className="h-5 w-5 flex-shrink-0 text-gray-500" />
          {!isCollapsed && <span className="flex-1">{label}</span>}
          {isCollapsed && (
            <span className="absolute left-full ml-2 z-50 hidden rounded bg-black border border-gray-700 px-2 py-1 text-xs font-barlow font-bold uppercase text-white shadow-lg group-hover:block whitespace-nowrap">
              {disabledTitle || label}
            </span>
          )}
        </span>
      );
    }
    return (
      <Link
        href={href}
        onClick={() => setIsOpen(false)}
        className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-barlow font-bold uppercase transition-colors ${
          active
            ? "bg-hero-dark text-white shadow-md"
            : "text-gray-300 hover:bg-hero-dark/20 hover:text-hero-vibrant"
        }`}
        title={isCollapsed ? label : undefined}
      >
        <Icon
          className={`h-5 w-5 flex-shrink-0 ${
            active ? "text-accent-gold" : "text-gray-500"
          }`}
        />
        {!isCollapsed && (
          <>
            <span className="flex-1">{label}</span>
            {showBadge && (
              <span className="bg-red-500 text-white text-xs rounded-full min-w-5 px-2 py-0.5 text-center font-barlow font-bold">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </>
        )}
        {isCollapsed && showBadge && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
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

      {/* Sidebar Container – Marmor (Dashboard) vs Holz (Kampagne) für klare Ebenen-Trennung */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 transform border-r border-hero-border shadow-2xl shadow-black/70 transition-all duration-200 ease-in-out md:translate-x-0 ${
          !isInCampaign ? "gothic-sidebar" : ""
        } ${isOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "w-16" : "w-64"}`}
        style={
          isInCampaign
            ? {
                backgroundColor: "#0d1f0a",
                backgroundImage: "url('/images/dark-wood.jpg')",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="flex h-full flex-col relative">
          {/* Logo Header – transparent damit Marmor/Holz sichtbar */}
          <div
            className={`flex h-16 items-center gap-2 border-b border-hero-border/60 bg-black/30 backdrop-blur-sm px-6 ${
              isCollapsed ? "justify-center px-2" : ""
            }`}
          >
            <Image
              src="/images/tableHeroes-logo.png"
              alt="TableHeroes"
              width={200}
              height={40}
              className={`h-auto flex-shrink-0 ${
                isCollapsed ? "w-10" : "w-40"
              }`}
              style={{ height: "auto" }}
              priority={false}
            />
          </div>

          {/* Navigation – transparent damit Marmor/Holz sichtbar */}
          <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto bg-black/30">
            {/* Welt-Kontext: Zurück + Welt-Navigation */}
            {isInWorld && (
              <div className="mb-4 space-y-1">
                <Link
                  href="/dashboard/worlds"
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-barlow font-bold uppercase transition-colors text-gray-300 hover:bg-hero-dark/20 hover:text-hero-vibrant ${
                    isCollapsed ? "justify-center" : ""
                  }`}
                  title={isCollapsed ? "Zurück zu Welten" : undefined}
                >
                  <ArrowLeft className="h-5 w-5 flex-shrink-0 text-gray-500" />
                  {!isCollapsed && <span>Zurück zu Welten</span>}
                  {isCollapsed && (
                    <span className="absolute left-full ml-2 z-50 hidden rounded bg-background-card border border-hero-dark px-2 py-1 text-xs font-barlow font-bold uppercase text-white shadow-lg group-hover:block whitespace-nowrap">
                      Zurück zu Welten
                    </span>
                  )}
                </Link>
                {!isCollapsed && <div className="mx-3 my-2 h-px bg-hero-dark" />}
                <p className="px-3 py-2 text-xs font-barlow font-bold uppercase text-gray-500">
                  Welt & Lore
                </p>
                {worldNav
                  .filter((item) =>
                    worldHasBlueprint ? true : item.href === `/dashboard/worlds/${worldId}`,
                  )
                  .map((item) => {
                    const onOverview = pathname === `/dashboard/worlds/${worldId}`;
                    const isActive =
                      "tab" in item && item.tab
                        ? onOverview && (currentTab === item.tab || (item.tab === "overview" && !currentTab))
                        : pathname === item.href || (item.href !== `/dashboard/worlds/${worldId}` && pathname?.startsWith(item.href + "/"));
                    return (
                      <NavItem
                        key={item.href + (item.tab ?? "")}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        isActive={isActive}
                      />
                    );
                  })}
              </div>
            )}

            {/* Mode B: Campaign Mode - Back Button */}
            {isInCampaign && !isInWorld && (
              <div className="mb-4">
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-barlow font-bold uppercase transition-colors text-gray-300 hover:bg-hero-dark/20 hover:text-hero-vibrant ${
                    isCollapsed ? "justify-center" : ""
                  }`}
                  title={isCollapsed ? "Zurück zum Dashboard" : undefined}
                >
                  <ArrowLeft className="h-5 w-5 flex-shrink-0 text-gray-400" />
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

            {/* Mode A: General Dashboard Navigation (Default, nicht wenn in Kampagne oder Welt) */}
            {!isInCampaign && !isInWorld && (
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
                    badge={"badge" in item && typeof item.badge === "number" ? item.badge : undefined}
                  />
                ))}
              </div>
            )}

            {/* ADMINISTRATION: nur sichtbar wenn isAdmin, nicht in Kampagne/Welt */}
            {!isInCampaign && !isInWorld && isAdmin && (
              <div className="space-y-1 mt-6 pt-6">
                <hr className="border-hero-border/60 mb-4 mx-3" />
                {!isCollapsed && (
                  <p className="px-3 py-2 text-xs font-barlow font-bold uppercase text-accent-gold/90 tracking-wider">
                    ADMINISTRATION
                  </p>
                )}
                {adminItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={pathname === item.href}
                  />
                ))}
                {!isCollapsed && (
                  <div className="px-3 py-2 flex items-center justify-between gap-2 rounded-md hover:bg-hero-dark/10">
                    <span className="flex items-center gap-2 text-xs font-barlow font-bold uppercase text-gray-500">
                      <Hammer className="h-4 w-4 text-accent-gold/70" />
                      Wartungsmodus
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleMaintenance}
                      disabled={maintenanceToggling}
                      className={`relative h-6 w-10 rounded-full transition-colors shrink-0 ${
                        maintenanceMode
                          ? "bg-accent-gold/70"
                          : "bg-hero-dark border border-hero-border"
                      } ${maintenanceToggling ? "opacity-60" : ""}`}
                      title={maintenanceMode ? "Wartung aus" : "Wartung an"}
                    >
                      <span
                        className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          maintenanceMode ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mode B: Campaign Context Section (nur wenn in Kampagne, nicht in Welt) */}
            {isInCampaign && !isInWorld && campaignNav.length > 0 && (
              <div className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-barlow font-bold uppercase tracking-wider text-gray-500">
                      Aktuelle Kampagne
                    </p>
                    <p
                      className="mt-1 line-clamp-2 break-words font-barlow text-sm font-extrabold uppercase leading-tight tracking-wide text-hero-vibrant"
                      title={campaignScopeName ?? undefined}
                    >
                      {campaignScopeName ?? "Kampagne wird geladen …"}
                    </p>
                  </div>
                )}
                {isCollapsed && campaignScopeName ? (
                  <div
                    className="flex justify-center pb-1"
                    title={campaignScopeName}
                  >
                    <MapPin
                      className="h-4 w-4 shrink-0 text-hero-vibrant"
                      aria-label={`Kampagne: ${campaignScopeName}`}
                    />
                  </div>
                ) : null}
                {campaignNav.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    tab={item.tab}
                    isActive={
                      pathname === item.href ||
                      (item.href?.includes("/gm-inbox") && pathname.includes("/gm-inbox")) ||
                      (item.href?.includes("/chronist") && pathname.includes("/chronist")) ||
                      (!!pathname && item.href.endsWith("/bestarium") && pathname.startsWith(item.href)) ||
                      (!!pathname && item.href.endsWith("/regelsystem") && pathname.startsWith(item.href))
                    }
                    badge={"badge" in item && typeof item.badge === "number" ? item.badge : undefined}
                    disabled={
                      item.tab === "sessions" && sessionsNavLocked === true
                    }
                    disabledTitle="Rückmeldung nur mit Charakter möglich"
                  />
                ))}
              </div>
            )}

            {/* Einstellungen & System: bleibt unten, wenn nicht in Kampagne/Welt */}
            {!isInCampaign && !isInWorld && (
              <div className="space-y-1 mt-auto pt-6 border-t border-hero-border/60">
                {!isCollapsed && (
                  <p className="px-3 py-2 text-xs font-barlow font-bold uppercase text-gray-500">
                    System
                  </p>
                )}
                {settingsNav.map((item) => (
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
          </nav>

          {/* Toggle Collapse Button */}
          <div className="border-t border-hero-border/60 bg-black/30 p-2">
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
          <div className="border-t border-hero-border/60 bg-black/40 p-4">
            <div
              className={`flex items-center gap-3 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
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
                    {(
                      user.username?.[0] ||
                      user.email?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden min-w-0">
                  <p className="truncate font-barlow font-bold text-sm text-white flex items-center gap-1">
                    {role === "GameMaster" || isAdmin ? "👑" : "🛡️"}{" "}
                    {user.display_name || user.username || "Abenteurer"}
                  </p>
                  <p className="truncate font-libre text-xs text-gray-500">
                    {user.email}
                  </p>
                </div>
              )}
              <button
                onClick={() => signOut()}
                className="rounded p-1 text-gray-300 hover:bg-red-900/40 hover:text-accent-blood transition-colors flex-shrink-0"
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
