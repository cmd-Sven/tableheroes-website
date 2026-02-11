import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  displayName: string;
};

export function TopWelcomeBar({ displayName }: Props) {
  return (
    <Link
      href="/dashboard"
      className="group block w-full border-b border-accent-gold/20"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(30,10,10,0.9) 50%, rgba(10,10,10,0.95) 100%)",
      }}
    >
      <div className="container mx-auto max-w-7xl px-4 py-2 flex items-center justify-center gap-2">
        {/* Desktop */}
        <span className="hidden sm:inline font-libre text-sm text-gray-400">
          Hi{" "}
          <strong className="font-barlow font-bold text-accent-gold">
            {displayName}
          </strong>
          , hier geht&apos;s direkt zu deinem Dashboard.
        </span>

        {/* Mobil */}
        <span className="sm:hidden font-barlow font-bold text-sm text-accent-gold">
          Zum Dashboard
        </span>

        <ArrowRight className="h-3.5 w-3.5 text-accent-gold/60 transition-transform group-hover:translate-x-1 group-hover:text-accent-gold" />
      </div>
    </Link>
  );
}
