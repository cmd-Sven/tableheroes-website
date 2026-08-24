"use client";

import React from "react";
import type { NewsPost } from "@/src/lib/constants/news";
import { NEWS_CATEGORIES } from "@/src/lib/constants/news";

const PLACEHOLDER_IMAGE = "/images/dark-marmor.webp";

function resolveNewsImageUrl(url: string | null | undefined): string {
  if (!url?.trim()) return PLACEHOLDER_IMAGE;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return `/images/news/${trimmed}`;
}

type Props = {
  posts: NewsPost[];
};

export function NewsArchiveClient({ posts }: Props) {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!term) return true;
      const haystack =
        (p.title || "") + " " + (p.category || "") + " " + (p.content || "");
      return haystack.toLowerCase().includes(term);
    });
  }, [posts, search, category]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-end">
        <div className="flex-1">
          <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
            Suche
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titel, Kategorie oder Text durchsuchen…"
            className="w-full rounded border border-hero-border bg-slate-900 px-3 py-2 font-libre text-sm text-gray-100 focus:border-hero-vibrant outline-none"
          />
        </div>
        <div className="w-full md:w-56">
          <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
            Kategorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded border border-hero-border bg-slate-900 px-3 py-2 font-libre text-sm text-gray-100 focus:border-hero-vibrant outline-none"
          >
            <option value="all">Alle Kategorien</option>
            {NEWS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-hero-border bg-background-card p-6">
          <p className="font-libre text-sm text-gray-400">
            Keine News gefunden. Probiere einen anderen Suchbegriff oder Filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((post) => {
            const imgSrc = resolveNewsImageUrl(post.image_url);
            const created =
              post.created_at &&
              new Date(post.created_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
            const teaser =
              (post.content || "")
                .replace(/[#*_`>]/g, "")
                .slice(0, 200)
                .trim() + ((post.content || "").length > 200 ? " …" : "");

            return (
              <article
                key={post.id}
                className="rounded-lg border border-hero-border bg-background-card shadow-lg overflow-hidden flex flex-col"
                style={{
                  backgroundImage: "url('/images/dark-marmor.webp')",
                  backgroundSize: "cover",
                }}
              >
                <div className="w-full aspect-square overflow-hidden border-b border-hero-border/60 bg-hero-dark/40 flex items-center justify-center">
                  <img
                    src={imgSrc}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                    }}
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full border border-accent-gold/50 bg-accent-gold/10 px-2 py-0.5 font-barlow text-[10px] uppercase tracking-wide text-accent-gold">
                      {post.category}
                    </span>
                    {created && (
                      <span className="font-libre text-xs text-gray-400">
                        {created}
                      </span>
                    )}
                  </div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-white line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mt-1 font-libre text-sm text-gray-200/90 leading-relaxed line-clamp-4">
                    {teaser || "Neuigkeiten aus den Welten von TableHeroes."}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
