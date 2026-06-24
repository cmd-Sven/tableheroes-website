"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Globe, GlobeLock, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { PublicSeoEntityType, PublicSeoGmState } from "@/src/lib/public-seo-types";
import {
  getPublicSeoGmState,
  setPublicSeoVisibility,
} from "@/src/app/dashboard/campaigns/[id]/public-seo-actions";

type Props = {
  campaignId: string;
  entityType: PublicSeoEntityType;
  entityId: string;
  entityName: string;
};

export function PublicSeoPanel({ campaignId, entityType, entityId, entityName }: Props) {
  const [state, setState] = useState<PublicSeoGmState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [imageIsAiGenerated, setImageIsAiGenerated] = useState(false);
  const [uploadRightsConfirmed, setUploadRightsConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPublicSeoGmState(campaignId, entityType, entityId);
        if (!cancelled && data) {
          setState(data);
          setImageIsAiGenerated(data.imageIsAiGenerated);
          setUploadRightsConfirmed(data.imageUploadRightsConfirmed === true);
        }
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, entityType, entityId]);

  const hasImage = Boolean(state?.imageUrl);

  const handleToggle = (nextPublic: boolean) => {
    startTransition(async () => {
      try {
        const result = await setPublicSeoVisibility(
          campaignId,
          entityType,
          entityId,
          nextPublic,
          hasImage
            ? {
                imageIsAiGenerated,
                imageUploadRightsConfirmed: uploadRightsConfirmed,
              }
            : undefined,
        );
        const refreshed = await getPublicSeoGmState(campaignId, entityType, entityId);
        if (refreshed) setState(refreshed);
        toast.success(
          nextPublic
            ? `„${entityName}" ist jetzt öffentlich unter /${result.slug}`
            : `„${entityName}" ist nicht mehr öffentlich.`,
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-hero-border bg-hero-dark/40 p-4 text-sm text-gray-400">
        SEO-Einstellungen werden geladen…
      </div>
    );
  }

  if (!state) return null;

  return (
    <section className="rounded-xl border border-hero-border bg-gradient-to-br from-hero-dark/80 to-black/40 p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-cinzel text-lg text-hero-vibrant flex items-center gap-2">
            {state.isPublic ? (
              <Globe className="h-5 w-5 text-accent-gold" />
            ) : (
              <GlobeLock className="h-5 w-5 text-gray-500" />
            )}
            Öffentliche Lore-Datenbank (SEO)
          </h3>
          <p className="mt-1 text-sm text-gray-400 font-libre max-w-2xl">
            Du entscheidest, ob dieser Eintrag auf der Website für alle sichtbar ist.
            GM-Notizen und Geheimnisse werden nie veröffentlicht.
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleToggle(!state.isPublic)}
          className={`px-4 py-2 rounded-lg font-barlow font-bold uppercase text-sm border transition-colors disabled:opacity-50 ${
            state.isPublic
              ? "border-red-800/60 bg-red-950/40 text-red-300 hover:bg-red-950/60"
              : "border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20"
          }`}
        >
          {state.isPublic ? "Veröffentlichung beenden" : "Öffentlich schalten"}
        </button>
      </div>

      <div className="text-sm space-y-1">
        <p className="text-gray-400">
          URL-Vorschau:{" "}
          <Link
            href={`/${state.slug}`}
            className="text-accent-gold hover:underline font-mono"
            target="_blank"
            rel="noopener noreferrer"
          >
            /{state.slug}
          </Link>
          {state.isPublic ? (
            <ExternalLink className="inline h-3.5 w-3.5 ml-1 text-accent-gold/80" />
          ) : null}
        </p>
        {state.isPublic && state.publishedAt ? (
          <p className="text-gray-500 text-xs">
            Veröffentlicht am{" "}
            {new Date(state.publishedAt).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : null}
      </div>

      {hasImage ? (
        <div className="rounded-lg border border-hero-border/80 bg-black/30 p-3 space-y-3">
          <p className="text-sm font-barlow font-bold uppercase text-gray-300">
            Bildrechte für öffentliche Anzeige
          </p>
          <p className="text-xs text-gray-500 font-libre">
            Bilder werden nur veröffentlicht, wenn du die Rechte bestätigst oder das Bild als
            KI-generiert kennzeichnest.
          </p>
          <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={imageIsAiGenerated}
              onChange={(e) => {
                setImageIsAiGenerated(e.target.checked);
                if (e.target.checked) setUploadRightsConfirmed(false);
              }}
            />
            <span className="flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-accent-gold/80" />
              Bild ist KI-generiert
            </span>
          </label>
          {!imageIsAiGenerated ? (
            <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={uploadRightsConfirmed}
                onChange={(e) => setUploadRightsConfirmed(e.target.checked)}
              />
              <span>
                Ich bestätige, dass ich die Nutzungsrechte an diesem Bild besitze und es
                veröffentlichen darf.
              </span>
            </label>
          ) : null}
          {state.imageBlockReason && !state.isPublic ? (
            <p className="text-xs text-amber-400/90">{state.imageBlockReason}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type PublicSeoCardProps = {
  slug: string;
  name: string;
  entitySubtype: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  imageIsAiGenerated: boolean;
};

export function PublicSeoEntryCard({
  slug,
  name,
  entitySubtype,
  excerpt,
  imageUrl,
  imageIsAiGenerated,
}: PublicSeoCardProps) {
  return (
    <Link
      href={`/${slug}`}
      className="group block rounded-xl border border-hero-border/70 bg-hero-dark/50 overflow-hidden hover:border-accent-gold/50 transition-colors"
    >
      {imageUrl ? (
        <div className="relative aspect-[16/9] bg-black/40">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
          {imageIsAiGenerated ? (
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-gray-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> KI
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="p-4 space-y-1">
        {entitySubtype ? (
          <p className="text-[11px] uppercase tracking-wider text-accent-gold/80 font-barlow">
            {entitySubtype}
          </p>
        ) : null}
        <h3 className="font-cinzel text-lg text-hero-vibrant group-hover:text-accent-gold transition-colors">
          {name}
        </h3>
        {excerpt ? <p className="text-sm text-gray-400 font-libre line-clamp-3">{excerpt}</p> : null}
      </div>
    </Link>
  );
}
