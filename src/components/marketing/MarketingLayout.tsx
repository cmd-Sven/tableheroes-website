"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Flag,
  HelpCircle,
  Home,
  Sparkles,
  Users,
  ArrowLeft,
} from "lucide-react";
import { Footer } from "@/src/components/layout/Footer";

type NavItem = {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const items: NavItem[] = useMemo(
    () => [
      { id: "hero", label: "Start", Icon: Home },
      { id: "campaigns", label: "Runden", Icon: Flag },
      { id: "community", label: "Community", Icon: Users },
      { id: "features", label: "Plattform", Icon: Sparkles },
      { id: "systems", label: "Systeme", Icon: BookOpen },
      { id: "faq", label: "FAQ", Icon: HelpCircle },
    ],
    []
  );

  const [activeId, setActiveId] = useState<string>("hero");

  useEffect(() => {
    // Only setup ScrollSpy on Homepage
    if (!isHomePage) return;

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)
          );
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      {
        root: null,
        threshold: [0.2, 0.35, 0.5, 0.7],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items, isHomePage]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Conditional Navigation: Anchor Links on Home, Back Button on Sub-Pages */}
      {isHomePage ? (
        /* Right-side vertical navigation (Home Page Only) */
        <nav
          aria-label="Abschnitts-Navigation"
          className="fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 md:block"
        >
          <ul className="flex flex-col gap-3">
            {items.map(({ id, label, Icon }) => {
              const isActive = activeId === id;
              return (
                <li key={id} className="relative group">
                  <button
                    type="button"
                    onClick={() => scrollTo(id)}
                    className={[
                      "relative grid h-11 w-11 place-items-center rounded-full border transition-colors",
                      isActive
                        ? "border-hero-border bg-hero-vibrant text-background-dark"
                        : "border-hero-border/40 bg-background-card text-gray-200 hover:border-hero-border hover:bg-background-card/80",
                    ].join(" ")}
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </button>

                  {/* Tooltip */}
                  <div className="pointer-events-none absolute right-14 top-1/2 hidden -translate-y-1/2 md:block">
                    <div className="translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                      <div className="rounded-md border border-hero-border/40 bg-background-card px-3 py-2 shadow-lg">
                        <span className="font-barlow font-bold uppercase text-gray-100">
                          {label}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : (
        /* Back Button (Sub-Pages) */
        <Link
          href="/"
          className="fixed right-4 top-6 z-50 hidden md:inline-flex items-center gap-2 rounded-md border border-hero-border/40 bg-background-card px-4 py-2 font-barlow font-bold uppercase text-gray-200 text-sm shadow-lg transition-colors hover:border-hero-vibrant hover:text-hero-vibrant"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
      )}

      {/* Login Button (Fixed Top-Right Desktop, Footer Link Mobile) */}
      {isHomePage && (
        <a
          href="/login"
          className="fixed top-6 right-6 z-50 hidden md:inline-flex items-center justify-center rounded-md border border-hero-border/60 bg-background-card px-6 py-2 font-barlow font-bold uppercase text-gray-100 shadow-lg transition-transform hover:scale-105 hover:bg-background-card/80 hover:text-hero-vibrant"
        >
          Login
        </a>
      )}

      <div className="relative">{children}</div>

      <Footer />
    </div>
  );
}
