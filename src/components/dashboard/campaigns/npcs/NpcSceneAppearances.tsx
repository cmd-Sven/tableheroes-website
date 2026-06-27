"use client";

import Image from "next/image";
import Link from "next/link";
import type { SceneMediaAppearance } from "@/src/lib/scene-media-types";

type Props = {
  campaignId: string;
  appearances: SceneMediaAppearance[];
  title?: string;
  description?: string;
  showLocation?: boolean;
};

export function NpcSceneAppearances({
  campaignId,
  appearances,
  title = "Szenen mit diesem NSC",
  description = "Diese Szenenbilder wurden gezeigt, während der NSC auf der Bühne war.",
  showLocation = true,
}: Props) {
  if (appearances.length === 0) return null;

  return (
    <div className="rounded border border-purple-900/40 bg-purple-950/15 p-4 space-y-3">
      <p className="font-barlow text-xs font-bold uppercase text-purple-200">
        {title}
      </p>
      <p className="font-libre text-xs text-gray-400">
        {description}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {appearances.map((entry) => {
          const scene = entry.scene;
          if (!scene?.image_url) return null;
          return (
            <article
              key={entry.id}
              className="rounded-lg border border-hero-border/50 bg-black/30 overflow-hidden"
            >
              <div className="relative aspect-video">
                <Image
                  src={scene.image_url}
                  alt={scene.title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="p-2 space-y-1">
                <p className="font-cinzel text-sm text-white">{scene.title}</p>
                <p className="font-libre text-[11px] text-gray-500">
                  {entry.session_name ? (
                    entry.archive_id ? (
                      <Link
                        href={`/dashboard/campaigns/${campaignId}?tab=sessions&archive=${entry.archive_id}`}
                        className="text-hero-vibrant hover:underline"
                      >
                        {entry.session_name}
                      </Link>
                    ) : (
                      entry.session_name
                    )
                  ) : (
                    "Live-Session"
                  )}
                  {" · "}
                  {new Date(entry.shown_at).toLocaleDateString("de-DE")}
                  {showLocation && entry.location_name ? (
                    <>
                      {" · "}
                      {entry.location_lore_id ? (
                        <Link
                          href={`/dashboard/campaigns/${campaignId}/lore/${entry.location_lore_id}`}
                          className="text-hero-vibrant hover:underline"
                        >
                          {entry.location_name}
                        </Link>
                      ) : (
                        entry.location_name
                      )}
                    </>
                  ) : null}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
