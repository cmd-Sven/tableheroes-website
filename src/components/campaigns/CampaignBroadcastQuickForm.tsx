"use client";

import { useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { sendMessage } from "@/src/lib/actions/message-actions";
import { toast } from "sonner";

type Props = {
  campaignId: string;
  recipientCount: number;
};

export function CampaignBroadcastQuickForm({
  campaignId,
  recipientCount,
}: Props) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [highPriority, setHighPriority] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await sendMessage({
        type: "broadcast",
        campaignId,
        subject: subject.trim(),
        content: content.trim(),
        priority: highPriority ? "high" : "normal",
      });
      if (res.success) {
        toast.success(`Rundbrief an ${res.count} Spieler gesendet.`);
        setSubject("");
        setContent("");
        setHighPriority(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const canSend =
    subject.trim().length > 0 &&
    content.trim().length > 0 &&
    recipientCount > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {recipientCount === 0 ? (
        <p className="font-libre text-sm text-amber-400/90">
          Noch keine bestätigten Spieler – Rundbrief ist erst möglich, wenn
          Teilnehmer den Status „Akzeptiert“ haben.
        </p>
      ) : (
        <p className="font-libre text-xs text-gray-500">
          Geht an {recipientCount}{" "}
          {recipientCount === 1 ? "Spieler" : "Spieler"} (ohne dich).
        </p>
      )}
      <div>
        <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
          Betreff
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
          placeholder="z. B. Hinweis zur nächsten Session"
        />
      </div>
      <div>
        <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
          Nachricht
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none resize-y"
          placeholder="Kurzer Text an alle Kampagnenteilnehmer…"
        />
      </div>
      <label className="flex items-center gap-2 font-libre text-sm text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={highPriority}
          onChange={(e) => setHighPriority(e.target.checked)}
          className="rounded border-hero-dark bg-slate-900 text-hero-vibrant focus:ring-hero-vibrant"
        />
        Hohe Priorität
      </label>
      <button
        type="submit"
        disabled={!canSend || pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded border border-hero-border bg-hero-vibrant/90 px-4 py-2.5 font-barlow font-bold uppercase text-sm text-black hover:bg-hero-vibrant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Senden…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Rundbrief senden
          </>
        )}
      </button>
    </form>
  );
}
