"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { upsertCampaignNote } from "@/src/app/dashboard/campaigns/[id]/campaign-notes-actions";

type Props = {
  campaignId: string;
  creatureId: string;
  initialContent: string;
};

export function BestariumPlayerNotes({ campaignId, creatureId, initialContent }: Props) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  const dirty = content !== saved;

  return (
    <section className="rounded-lg border border-hero-border/40 bg-background-dark/50 p-4">
      <h2 className="font-barlow font-semibold text-lg text-accent-gold border-b border-hero-border pb-2 mb-3">
        Meine Notizen
      </h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Eigene Beobachtungen zu dieser Kreatur …"
        className="w-full rounded border border-hero-border bg-background-card px-3 py-2 font-libre text-sm text-gray-200 resize-y min-h-[100px]"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          disabled={!dirty || isPending}
          onClick={() => {
            startTransition(async () => {
              await upsertCampaignNote(campaignId, "bestarium", creatureId, content);
              setSaved(content);
            });
          }}
          className="inline-flex items-center gap-2 rounded border border-hero-vibrant/50 bg-hero-vibrant/10 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-40"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Speichern
        </button>
      </div>
    </section>
  );
}
