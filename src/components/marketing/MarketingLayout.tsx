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
  Trophy,
  Images,
  Menu,
  X,
  Newspaper,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
      { id: "campaigns", label: "Termine", Icon: Flag },
      { id: "news", label: "News", Icon: Newspaper },
      { id: "community", label: "Community", Icon: Users },
      { id: "features", label: "Plattform", Icon: Sparkles },
      { id: "gamification", label: "Deine Reise als Held", Icon: Trophy },
      { id: "systems", label: "Systeme", Icon: BookOpen },
      { id: "impressions", label: "Impressionen", Icon: Images },
      { id: "faq", label: "FAQ", Icon: HelpCircle },
    ],
    []
  );

  const [activeId, setActiveId] = useState<string>("hero");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
    setIsMobileMenuOpen(false); // Menü schließen nach Klick
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Mobile Burger Menu Button - nur auf Homepage */}
      {isHomePage && (
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 right-4 z-[60] md:hidden p-2 rounded-md border border-hero-border/40 bg-background-card text-gray-200 shadow-lg transition-colors hover:border-hero-vibrant hover:text-hero-vibrant"
          aria-label="Menü öffnen"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      )}

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isHomePage && isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 z-[55] md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-64 bg-background-card border-l border-hero-border z-[60] md:hidden overflow-y-auto"
              aria-label="Mobile Navigation"
            >
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-barlow font-bold text-lg uppercase text-hero-vibrant">
                    Navigation
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 rounded-md text-gray-400 hover:text-white transition-colors"
                    aria-label="Menü schließen"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <ul className="space-y-2">
                  {items.map(({ id, label, Icon }) => {
                    const isActive = activeId === id;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => scrollTo(id)}
                          className={[
                            "w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                            isActive
                              ? "bg-hero-dark/50 border border-hero-vibrant/40 text-hero-vibrant"
                              : "text-gray-300 hover:bg-background-dark hover:text-hero-vibrant border border-transparent",
                          ].join(" ")}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
                          <span className="font-barlow font-semibold uppercase text-sm">
                            {label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

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
                      "relative grid h-11 w-11 place-items-center transition-opacity",
                      isActive ? "opacity-100" : "opacity-70 hover:opacity-100",
                    ].join(" ")}
                    style={{
                      backgroundImage: "url('/images/icon-empty.svg')",
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                    aria-label={label}
                  >
                    <Icon
                      className={[
                        "h-5 w-5 relative z-10",
                        isActive ? "text-accent-gold" : "text-gray-200",
                      ].join(" ")}
                      aria-hidden
                    />
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

      <div className="relative">{children}</div>

      <Footer />
    </div>
  );
}
