"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { NewsMarkdownBody } from "@/src/components/ui/NewsMarkdownBody";
import type { NewsPost } from "@/src/lib/constants/news";

const NEW_BADGE_STYLE =
  "absolute top-2 right-2 z-10 rounded-full bg-accent-gold/90 px-2 py-0.5 font-barlow font-bold text-[10px] uppercase text-background-dark shadow-md";
const NEW_GLOW_STYLE = "shadow-[0_0_15px_rgba(212,175,55,0.5)] animate-pulse";
const NEWS_IMAGE_BASE = "/images/news/";
const PLACEHOLDER_IMAGE = "/images/dark-marmor.jpg";

/** Löst image_url auf: absoluter Pfad bleibt, reiner Dateiname wird zu /images/news/[dateiname]. */
function resolveNewsImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith("/") || u.startsWith("http")) return u;
  return NEWS_IMAGE_BASE + u;
}

type Props = {
  posts: NewsPost[];
  hasNewContent?: boolean;
  onMarkAsRead?: () => void | Promise<void>;
};

export function NewsInfoCard({
  posts,
  hasNewContent = false,
  onMarkAsRead,
}: Props) {
  const [modalPost, setModalPost] = useState<NewsPost | null>(null);

  const openModal = (post: NewsPost) => {
    setModalPost(post);
    onMarkAsRead?.();
  };

  return (
    <div className="w-full p-4">
      <div
        className={`relative rounded-lg border border-hero-border/40 bg-hero-dark/20 overflow-hidden shadow-lg ${
          hasNewContent ? NEW_GLOW_STYLE : ""
        }`}
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        {hasNewContent && (
          <span className={NEW_BADGE_STYLE} aria-hidden>
            NEU
          </span>
        )}
        {posts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-libre text-sm text-gray-400 italic">
              Willkommen bei TableHeroes. Hier erscheinen Ankündigungen, neue
              Features und Tipps für deine Runden.
            </p>
            <p className="font-libre text-xs text-gray-500 mt-2">
              Aktuell keine neuen Meldungen.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-hero-border/30">
            {posts.map((post) => {
              const thumbSrc =
                resolveNewsImageUrl(post.image_url) ?? PLACEHOLDER_IMAGE;
              return (
                <li key={post.id} className="p-4">
                  <div className="flex gap-3">
                    <div className="shrink-0 w-20 h-20 rounded border border-hero-border/40 overflow-hidden bg-hero-dark/50 flex items-center justify-center">
                      <img
                        src={thumbSrc}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            PLACEHOLDER_IMAGE;
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="inline-block font-barlow text-[10px] uppercase text-accent-gold bg-accent-gold/10 border border-accent-gold/30 rounded px-2 py-0.5 mb-1">
                        {post.category}
                      </span>
                      <h3 className="font-cinzel font-bold text-sm text-white truncate">
                        {post.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => openModal(post)}
                        className="mt-2 font-barlow font-bold text-xs uppercase text-hero-vibrant hover:underline focus:outline-none focus:ring-2 focus:ring-hero-vibrant/50 rounded"
                      >
                        Vollständige News lesen
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modalPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setModalPost(null)}
          role="dialog"
          aria-modal="true"
          aria-label="News lesen"
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg border border-hero-dark bg-background-card shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundImage: "url('/images/dark-marmor.jpg')",
              backgroundSize: "cover",
            }}
          >
            <button
              type="button"
              onClick={() => setModalPost(null)}
              className="absolute top-4 right-4 z-10 rounded-full p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-gold"
              aria-label="Schließen"
            >
              <X className="h-6 w-6" />
            </button>
            {(() => {
              const modalSrc = resolveNewsImageUrl(modalPost.image_url);
              if (!modalSrc) return null;
              return (
                <div className="w-full aspect-square max-h-[min(90vw,22rem)] shrink-0 overflow-hidden border-b border-hero-border/50 bg-hero-dark/40 flex items-center justify-center mx-auto">
                  <img
                    src={modalSrc}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                    }}
                  />
                </div>
              );
            })()}
            <div className="flex-1 overflow-y-auto p-6">
              <span className="inline-block font-barlow text-xs uppercase text-accent-gold bg-accent-gold/10 border border-accent-gold/30 rounded px-2 py-1 mb-2">
                {modalPost.category}
              </span>
              <h2 className="font-cinzel font-bold text-2xl text-hero-vibrant mb-4">
                {modalPost.title}
              </h2>
              <NewsMarkdownBody markdown={modalPost.content ?? ""} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
