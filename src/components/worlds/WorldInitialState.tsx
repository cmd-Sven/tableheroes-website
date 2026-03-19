import Link from "next/link";
import { Book, Sparkles } from "lucide-react";

type WorldInitialStateProps = {
  worldId: string;
  worldName: string;
  worldDescription: string | null;
};

export function WorldInitialState({
  worldId,
  worldName,
  worldDescription,
}: WorldInitialStateProps) {
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

      <div className="mt-8 mb-8 rounded-lg border border-hero-border bg-black/60 p-6 text-center">
        <Sparkles className="h-8 w-8 text-accent-gold mx-auto mb-3" />
        <h2 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant mb-2">
          Willkommen in {worldName}
        </h2>
        <p className="font-libre text-gray-200 mb-4 max-w-xl mx-auto">
          Bevor wir dieser Welt Leben einhauchen, legen wir ihre Regeln fest. Der World Wizard hilft dir,
          Genre, Physik, Kulturen und Alltag dieser Welt als Fundament zu definieren.
        </p>
        <Link
          href={`/dashboard/worlds/${worldId}/wizard`}
          className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-6 py-3 font-barlow font-bold uppercase text-sm text-black hover:bg-lime-400 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          World Wizard starten
        </Link>
      </div>
    </>
  );
}

