import Link from "next/link";
import { LucideIcon, Info } from "lucide-react";

type Props = {
  title: string;
  icon: LucideIcon;
  createHref: string;
  createLabel: string;
  hasPendingTodo?: boolean;
  lastItem?: { name: string; href: string } | null;
};

export function WorldDashboardCard({
  title,
  icon: Icon,
  createHref,
  createLabel,
  hasPendingTodo = false,
  lastItem = null,
}: Props) {
  return (
    <div
      className="relative rounded-lg border border-hero-border/60 overflow-hidden flex flex-col min-h-[160px]"
      style={{
        backgroundImage: "url('/images/dark-marmor.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10 flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-barlow font-bold text-lg uppercase text-hero-vibrant flex items-center gap-2">
            <Icon className="h-5 w-5 text-accent-gold" />
            {title}
          </h3>
          {hasPendingTodo && (
            <span
              className="shrink-0 p-1.5 rounded-full bg-accent-gold/20 text-accent-gold border border-accent-gold/40"
              title="Offene Entwürfe vorhanden"
            >
              <Info className="h-4 w-4" />
            </span>
          )}
        </div>

        <Link
          href={createHref}
          className="inline-flex items-center justify-center gap-2 w-full rounded border-2 border-hero-vibrant bg-hero-vibrant/90 px-4 py-2 font-barlow font-bold text-sm uppercase text-background-dark hover:bg-hero-vibrant hover:border-hero-dark transition-colors mb-3"
        >
          {createLabel}
        </Link>

        {lastItem && (
          <div className="mt-auto">
            <p className="font-libre text-xs text-gray-400 mb-1">Zuletzt erstellt</p>
            <Link
              href={lastItem.href}
              className="font-libre text-sm text-hero-vibrant hover:text-white transition-colors underline underline-offset-2"
            >
              {lastItem.name}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
