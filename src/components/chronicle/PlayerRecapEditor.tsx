"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Mic,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import type { PlayerRecapRecord } from "@/src/lib/session-chronicle/player-recap-types";
import { emptyPlayerRecapPayload } from "@/src/lib/session-chronicle/player-recap-types";
import { isRecapSummaryPlaceholder } from "@/src/lib/session-chronicle/player-recap-starter";
import {
  getPlayerRecapEditorMeta,
  getRecapStarterText,
  importChronistSummaryIntoRecap,
  publishPlayerRecap,
  savePlayerRecapDraft,
  unpublishPlayerRecap,
} from "@/src/app/dashboard/campaigns/[id]/player-recap-actions";
import { PlayerRecapView } from "./PlayerRecapView";

type Props = {
  campaignId: string;
  worldId?: string | null;
  archiveId: string;
  sessionId: string | null;
  initialRecord: PlayerRecapRecord | null;
};

function StepBadge({
  done,
  active,
  label,
}: {
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-barlow text-[10px] font-bold uppercase ${
        done
          ? "border-emerald-700/50 bg-emerald-950/40 text-emerald-300"
          : active
            ? "border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
            : "border-hero-border/40 text-gray-500"
      }`}
    >
      {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {label}
    </span>
  );
}

export function PlayerRecapEditor({
  campaignId,
  worldId = null,
  archiveId,
  sessionId,
  initialRecord,
}: Props) {
  const router = useRouter();
  const [record, setRecord] = useState<PlayerRecapRecord | null>(initialRecord);
  const [summaryDraft, setSummaryDraft] = useState(initialRecord?.recap.summary_md ?? "");
  const [starterLoaded, setStarterLoaded] = useState(Boolean(initialRecord));
  const [hasChronistRecap, setHasChronistRecap] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRecord(initialRecord);
    setSummaryDraft(initialRecord?.recap.summary_md ?? "");
    setStarterLoaded(Boolean(initialRecord));
  }, [initialRecord, archiveId]);

  useEffect(() => {
    if (initialRecord || starterLoaded) return;
    let cancelled = false;
    void getRecapStarterText(archiveId).then((text) => {
      if (!cancelled) {
        setSummaryDraft(text);
        setStarterLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [archiveId, initialRecord, starterLoaded]);

  useEffect(() => {
    void getPlayerRecapEditorMeta(archiveId).then((meta) => {
      setHasChronistRecap(meta.hasChronistRecap);
    });
  }, [archiveId]);

  function refreshFromServer() {
    startTransition(() => router.refresh());
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await savePlayerRecapDraft(archiveId, summaryDraft);
      setRecord(result.record);
      setSummaryDraft(result.record.recap.summary_md);
      refreshFromServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImportChronist(mode: "replace" | "append") {
    if (
      mode === "replace" &&
      summaryDraft.trim() &&
      !isRecapSummaryPlaceholder(summaryDraft) &&
      !confirm("Deinen bisherigen Text durch den Chronist-Text ersetzen?")
    ) {
      return;
    }
    setIsSaving(true);
    try {
      const result = await importChronistSummaryIntoRecap(archiveId, mode);
      setRecord(result.record);
      setSummaryDraft(result.record.recap.summary_md);
      refreshFromServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Chronist-Text konnte nicht übernommen werden.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (isRecapSummaryPlaceholder(summaryDraft)) {
      alert("Bitte schreibe zuerst einen Recap-Text, bevor du freigibst.");
      return;
    }
    if (!confirm("Spieler-Recap für alle Kampagnen-Mitglieder freigeben?")) return;
    setIsSaving(true);
    try {
      if (!record || summaryDraft !== record.recap.summary_md) {
        await savePlayerRecapDraft(archiveId, summaryDraft);
      }
      const result = await publishPlayerRecap(archiveId);
      setRecord(result.record);
      refreshFromServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Freigabe fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnpublish() {
    if (!confirm("Freigabe zurückziehen? Spieler sehen den Recap dann nicht mehr.")) return;
    try {
      const result = await unpublishPlayerRecap(archiveId);
      setRecord(result.record);
      refreshFromServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Zurückziehen fehlgeschlagen.");
    }
  }

  const published = record?.status === "published";
  const hasWrittenRecap = !isRecapSummaryPlaceholder(summaryDraft);
  const previewRecap = {
    ...(record?.recap ?? emptyPlayerRecapPayload()),
    summary_md: summaryDraft,
  };
  const showPreview = summaryDraft.trim().length > 0;
  const busy = isPending || isSaving;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-purple-900/35 bg-purple-950/15 p-4">
        <h4 className="font-barlow text-sm font-bold uppercase text-purple-100">
          Spieler-Recap für diesen Abend
        </h4>
        <p className="mt-2 font-libre text-sm text-gray-300 leading-relaxed">
          Hier schreibst du die <strong className="text-white">lesbare Zusammenfassung</strong> für
          deine Spieler — unabhängig vom Chronist. Orte und NSCs aus dem Archiv erscheinen
          automatisch unter dem Text, sobald der Recap freigegeben ist.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StepBadge done={hasWrittenRecap} active={!hasWrittenRecap && !published} label="1 · Text schreiben" />
          <StepBadge done={Boolean(record)} active={hasWrittenRecap && !record && !published} label="2 · Speichern" />
          <StepBadge done={published} active={Boolean(record) && hasWrittenRecap && !published} label="3 · Freigeben" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-libre text-xs text-gray-500">
          {published
            ? "Freigegeben — sichtbar für alle Spieler in der Kampagne."
            : record
              ? "Entwurf gespeichert — noch nicht für Spieler sichtbar."
              : "Noch nicht gespeichert — Text schreiben und speichern."}
        </p>
        <div className="flex flex-wrap gap-2">
          {sessionId ? (
            <Link
              href={`/dashboard/campaigns/${campaignId}/chronist`}
              className="inline-flex items-center gap-1.5 rounded border border-hero-border/50 px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:border-accent-gold hover:text-accent-gold"
            >
              <Mic className="h-3.5 w-3.5" />
              Chronist (Audio-KI)
              <ExternalLink className="h-3 w-3" />
            </Link>
          ) : null}
          {hasChronistRecap ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleImportChronist("replace")}
                className="inline-flex items-center gap-1.5 rounded border border-violet-700/50 bg-violet-950/30 px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase text-violet-200 hover:bg-violet-900/30 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Chronist-Text einfügen
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleImportChronist("append")}
                className="inline-flex items-center gap-1.5 rounded border border-hero-border/40 px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-400 hover:text-gray-200 disabled:opacity-50"
              >
                Anhängen
              </button>
            </>
          ) : null}
        </div>
      </div>

      {!hasChronistRecap && sessionId ? (
        <p className="rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 font-libre text-xs text-amber-100/90">
          Kein Chronist-Text für diese Session — du kannst den Recap trotzdem manuell schreiben.
          Optional: Audio-Auswertung im Chronist abwarten und später einfügen.
        </p>
      ) : null}

      {!published ? (
        <div>
          <label
            htmlFor={`recap-editor-${archiveId}`}
            className="mb-2 block font-barlow text-[10px] font-bold uppercase text-gray-400"
          >
            Recap-Text (Markdown)
          </label>
          <textarea
            id={`recap-editor-${archiveId}`}
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(e.target.value)}
            rows={12}
            placeholder="Was ist in dieser Session passiert?"
            className="w-full rounded-lg border border-hero-border/40 bg-background-dark/80 px-3 py-3 font-libre text-sm leading-relaxed text-gray-100"
          />
          <p className="mt-2 font-libre text-[11px] text-gray-500">
            Tipp: Überschriften mit <code className="text-gray-400">##</code>, Aufzählungen mit{" "}
            <code className="text-gray-400">-</code>. Wiki-Links zu freigegebenen NSCs/Orten
            erscheinen automatisch in der Vorschau.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!published ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-1.5 rounded border border-accent-gold/60 bg-accent-gold/10 px-4 py-2 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Entwurf speichern
            </button>
            <button
              type="button"
              disabled={busy || !hasWrittenRecap}
              onClick={() => void handlePublish()}
              className="inline-flex items-center gap-1.5 rounded border border-emerald-700/60 bg-emerald-950/40 px-4 py-2 font-barlow text-xs font-bold uppercase text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Für Spieler freigeben
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleUnpublish()}
            className="inline-flex items-center gap-1.5 rounded border border-amber-800/50 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-amber-200 hover:border-amber-600"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Freigabe zurückziehen
          </button>
        )}
      </div>

      {showPreview ? (
        <div>
          <p className="mb-2 flex items-center gap-2 font-barlow text-[10px] font-bold uppercase text-gray-500">
            <Eye className="h-3.5 w-3.5" />
            Vorschau {published ? "(so sehen es die Spieler)" : "(Entwurf)"}
          </p>
          <PlayerRecapView
            campaignId={campaignId}
            worldId={worldId}
            recap={previewRecap}
            openLinksInNewTab={published}
          />
        </div>
      ) : null}
    </div>
  );
}
