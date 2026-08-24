/**
 * StageFactionPlayerNotesButton — Player-only sticky-note modal for faction observations.
 */
"use client";

import { useState, useTransition } from "react";
import { StickyNote } from "lucide-react";
import {
  getCampaignNote,
  upsertCampaignNote,
} from "@/src/app/dashboard/campaigns/[id]/campaign-notes-actions";

export function StageFactionPlayerNotesButton({
  campaignId,
  factionId,
  factionName,
}: {
  campaignId: string;
  factionId: string;
  factionName: string;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const openModal = () => {
    setOpen(true);
    if (loaded) return;
    startTransition(async () => {
      try {
        const note = await getCampaignNote(campaignId, "faction", factionId);
        const text = note?.content ?? "";
        setContent(text);
        setSaved(text);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Meine Notizen zu ${factionName}`}
        title="Meine Notizen"
        onClick={(e) => {
          e.stopPropagation();
          openModal();
        }}
        className="absolute left-2 top-2 z-30 grid h-8 w-8 place-items-center rounded-full border border-hero-vibrant/50 bg-black/75 text-hero-vibrant shadow-lg backdrop-blur transition-colors hover:bg-hero-vibrant/20"
      >
        <StickyNote className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[200] bg-black/50"
            aria-label="Notizen schließen"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[201] w-[min(92vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-hero-border bg-background-card p-4 shadow-2xl">
            <h4 className="font-barlow font-bold text-sm uppercase text-accent-gold mb-2">
              Meine Notizen — {factionName}
            </h4>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Beobachtungen zu dieser Fraktion…"
              className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-sm text-gray-200 resize-y"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-400"
              >
                Schließen
              </button>
              <button
                type="button"
                disabled={isPending || content === saved}
                onClick={() => {
                  startTransition(async () => {
                    await upsertCampaignNote(campaignId, "faction", factionId, content);
                    setSaved(content);
                    setOpen(false);
                  });
                }}
                className="rounded border border-hero-vibrant/50 bg-hero-vibrant/10 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-40"
              >
                {isPending ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
