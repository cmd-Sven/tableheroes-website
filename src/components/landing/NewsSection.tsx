"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { NewsMarkdownBody } from "@/src/components/ui/NewsMarkdownBody";
import type { NewsPost } from "@/src/lib/constants/news";

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

export function NewsSection() {
  const [posts, setPosts] = useState<NewsPost[] | null>(null);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/news/landing");
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) {
          setPosts(Array.isArray(data.posts) ? data.posts : []);
        }
      } catch {
        if (!cancelled) setPosts([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!posts || posts.length === 0) return null;

  return (
    <section id="news" className="relative py-12 md:py-16 overflow-hidden">
      {/* Z-0: Hintergrundbild „Foggy Forest“ */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        style={{
          backgroundImage: "url('/images/foggy-forest.webp')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />

      {/* Z-10: Dunkles Overlay für bessere Lesbarkeit */}
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-black/75"
        aria-hidden="true"
      />

      {/* Z-20: Langsam ziehender, diffuser Nebel (animierte Layers) */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        aria-hidden="true"
      >
        <div className="news-mist-layer news-mist-layer-1" />
        <div className="news-mist-layer news-mist-layer-2" />
        <div className="news-mist-layer news-mist-layer-3" />
        <style jsx>{`
          .news-mist-layer {
            position: absolute;
            left: -50%;
            width: 200%;
            height: 100%;
            background-repeat: no-repeat;
            background-size: cover;
            filter: blur(16px);
            opacity: 0.18;
            animation-name: news-mist-drift;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform, opacity;
          }

          .news-mist-layer-1 {
            top: 55%;
            background-image: url("/images/clouds/cloud3.webp");
            animation-duration: 160s;
            animation-delay: -40s;
          }

          .news-mist-layer-2 {
            top: 35%;
            background-image: url("/images/clouds/cloud5.webp");
            filter: blur(20px);
            opacity: 0.24;
            animation-duration: 210s;
            animation-delay: -80s;
          }

          .news-mist-layer-3 {
            top: 15%;
            background-image: url("/images/clouds/cloud7.webp");
            filter: blur(20px);
            opacity: 0.14;
            animation-duration: 260s;
            animation-delay: -120s;
          }

          /* Links starten, langsam nach rechts ziehen (eine volle Durchquerung) */
          @keyframes news-mist-drift {
            0% {
              transform: translateX(-60%);
              opacity: 0.12;
            }
            50% {
              transform: translateX(0%);
              opacity: 0.28;
            }
            100% {
              transform: translateX(60%);
              opacity: 0.12;
            }
          }
        `}</style>
      </div>

      {/* Z-30: Content-Ebene (Überschrift + Karten) */}
      <div className="relative z-30 max-w-6xl mx-auto px-4 md:px-8">
        <div className="mb-6 md:mb-8 text-center">
          <h2 className="marketing-section-h2">
            Neuigkeiten aus den Reichen
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => {
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
                .slice(0, 180)
                .trim() + ((post.content || "").length > 180 ? " …" : "");

            return (
              <article
                key={post.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPost(post)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedPost(post);
                  }
                }}
                className="rounded-lg border border-hero-border/60 bg-background-card/90 shadow-lg overflow-hidden flex flex-col cursor-pointer transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-hero-vibrant focus:ring-offset-2 focus:ring-offset-background-dark"
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
                  <p className="mt-1 font-libre text-sm text-gray-200/90 leading-relaxed line-clamp-3">
                    {teaser || "Neuigkeiten aus den Welten von TableHeroes."}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Modal: vollständiger Beitrag */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setSelectedPost(null)}
          role="dialog"
          aria-modal="true"
          aria-label="News lesen"
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg border border-hero-dark bg-background-card shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundImage: "url('/images/dark-marmor.webp')",
              backgroundSize: "cover",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 z-10 rounded-full p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-gold"
              aria-label="Schließen"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="w-full aspect-square max-h-[min(90vw,22rem)] shrink-0 overflow-hidden border-b border-hero-border/50 bg-hero-dark/40 flex items-center justify-center mx-auto">
              <img
                src={resolveNewsImageUrl(selectedPost.image_url)}
                alt=""
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                }}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <span className="inline-block font-barlow text-xs uppercase text-accent-gold bg-accent-gold/10 border border-accent-gold/30 rounded px-2 py-1 mb-2">
                {selectedPost.category}
              </span>
              {selectedPost.created_at && (
                <span className="block font-libre text-xs text-gray-400 mb-2">
                  {new Date(selectedPost.created_at).toLocaleDateString(
                    "de-DE",
                    {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </span>
              )}
              <h2 className="font-cinzel font-bold text-2xl text-hero-vibrant mb-4">
                {selectedPost.title}
              </h2>
              <NewsMarkdownBody markdown={selectedPost.content ?? ""} />
            </div>
          </div>
        </div>
      )}

      {/* Z-40: Goldene, sich wiederholende Border zwischen Sektionen (border_top-bottom_gold) */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 z-40">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "url('/images/border_top-bottom_gold.webp')",
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "bottom center",
          }}
        />
      </div>
    </section>
  );
}
