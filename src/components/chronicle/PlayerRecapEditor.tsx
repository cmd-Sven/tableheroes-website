"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, RefreshCw, Save, Send } from "lucide-react";
import type { PlayerRecapRecord } from "@/src/lib/session-chronicle/player-recap-types";
import {
  generatePlayerRecapDraft,
  publishPlayerRecap,
  savePlayerRecapDraft,
  unpublishPlayerRecap,
} from "@/src/app/dashboard/campaigns/[id]/player-recap-actions";
import { PlayerRecapView } from "./PlayerRecapView";

type Props = {
  campaignId: string;
  worldId?: string | null;
  archiveId: string;
  initialRecord: PlayerRecapRecord | null;
};

export function PlayerRecapEditor({
  campaignId,
  worldId = null,
  archiveId,
  initialRecord,
}: Props) {
  const router = useRouter();
  const [record, setRecord] = useState<PlayerRecapRecord | null>(initialRecord);
  const [summaryDraft, setSummaryDraft] = useState(initialRecord?.recap.summary_md ?? "");
  const [isPending, startTransition] = useTransition();

  function refreshFromServer() {
    startTransition(() => router.refresh());
  }

  async function handleGenerate() {
    try {
      const result = await generatePlayerRecapDraft(archiveId);
      if (result.record) {
        setRecord(result.record);
        setSummaryDraft(result.record.recap.summary_md);
      }
      refreshFromServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Generierung fehlgeschlagen.");
    }
  }

  async function handleSave() {
    try {
      const result = await savePlayerRecapDraft(archiveId, summaryDraft);
      setRecord(result.record);
      refreshFromServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    }
  }

  async function handlePublish() {
    if (!confirm("Spieler-Chronik für alle Kampagnen-Mitglieder freigeben?")) return;
    try {
      if (summaryDraft !== record?.recap.summary_md) {
        await savePlayerRecapDraft(archiveId, summaryDraft);
      }
      const result = await publishPlayerRecap(archiveId);
      setRecord(result.record);
      refreshFromServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Freigabe fehlgeschlagen.");
    }
  }

  async function handleUnpublish() {
    if (!confirm("Freigabe zurückziehen? Spieler sehen die Chronik dann nicht mehr.")) return;
    try {
      const result = await unpublishPlayerRecap(archiveId);
      setRecord(result.record);
      refreshFromServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Zurückziehen fehlgeschlagen.");
    }
  }

  const published = record?.status === "published";
  const linkCount = record?.recap.link_entities.length ?? 0;

  return (
    <div className="space-y-4 rounded-lg border border-purple-900/40 bg-purple-950/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-barlow text-sm font-bold uppercase text-purple-200">
            Spieler-Chronik
          </h4>
          <p className="mt-1 font-libre text-xs text-gray-400">
            {published
              ? "Freigegeben — Spieler sehen die Zusammenfassung mit Wiki-Links."
              : record
                ? "Entwurf — erst nach Freigabe für Spieler sichtbar."
                : "Noch kein Entwurf — aus Session-Chronist-Daten generieren."}
          </p>
          {record ? (
            <p className="mt-1 font-libre text-[10px] text-gray-500">
              {linkCount} verlinkbare Entität{linkCount === 1 ? "" : "en"} (nur freigegebene NSCs/Orte)
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => void handleGenerate()}
            className="inline-flex items-center gap-1.5 rounded border border-hero-border px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:border-accent-gold"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {record ? "Neu generieren" : "Generieren"}
          </button>
          {record && !published ? (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-1.5 rounded border border-hero-border px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:border-accent-gold"
              >
                <Save className="h-3.5 w-3.5" />
                Speichern
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => void handlePublish()}
                className="inline-flex items-center gap-1.5 rounded border border-emerald-700/60 bg-emerald-950/40 px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase text-emerald-300 hover:bg-emerald-900/40"
              >
                <Send className="h-3.5 w-3.5" />
                Freigeben
              </button>
            </>
          ) : null}
          {published ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => void handleUnpublish()}
              className="inline-flex items-center gap-1.5 rounded border border-amber-800/50 px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase text-amber-200 hover:border-amber-600"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Zurückziehen
            </button>
          ) : null}
        </div>
      </div>

      {record ? (
        <>
          {!published ? (
            <div>
              <label className="mb-2 block font-barlow text-[10px] font-bold uppercase text-gray-500">
                Zusammenfassung (Markdown)
              </label>
              <textarea
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                rows={8}
                className="w-full rounded border border-hero-border/40 bg-background-dark/80 px-3 py-2 font-libre text-sm text-gray-200"
              />
            </div>
          ) : null}

          <div>
            <p className="mb-2 flex items-center gap-2 font-barlow text-[10px] font-bold uppercase text-gray-500">
              <Eye className="h-3.5 w-3.5" />
              Vorschau {published ? "(Spieler-Ansicht)" : "(Entwurf)"}
            </p>
            <PlayerRecapView
              campaignId={campaignId}
              worldId={worldId}
              recap={{
                ...record.recap,
                summary_md: !published ? summaryDraft : record.recap.summary_md,
              }}
              openLinksInNewTab={published}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
