"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, X } from "lucide-react";
import { toast } from "sonner";
import { sendPlayerMessage } from "@/src/lib/actions/message-actions";
import type { PlayerMessageTargets } from "@/src/lib/queries/message-queries";

type Props = {
  targets: PlayerMessageTargets;
};

type Mode = "gm" | "admin";

export function PlayerMessageCompose({ targets }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(
    targets.campaignGms.length > 0 ? "gm" : "admin",
  );
  const [campaignId, setCampaignId] = useState(targets.campaignGms[0]?.campaignId ?? "");
  const [adminUserId, setAdminUserId] = useState(targets.admins[0]?.userId ?? "");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const canWriteGm = targets.campaignGms.length > 0;
  const canWriteAdmin = targets.admins.length > 0;
  const canWrite = canWriteGm || canWriteAdmin;

  const selectedGmLabel = useMemo(() => {
    const match = targets.campaignGms.find((entry) => entry.campaignId === campaignId);
    if (!match) return null;
    return `${match.gmUsername} · ${match.campaignName}`;
  }, [campaignId, targets.campaignGms]);

  if (!canWrite) return null;

  function resetAndClose() {
    setOpen(false);
    setSubject("");
    setContent("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await sendPlayerMessage(
        mode === "gm"
          ? {
              target: "gm",
              campaignId,
              subject,
              content,
            }
          : {
              target: "admin",
              adminUserId,
              subject,
              content,
            },
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        mode === "gm"
          ? "Nachricht an den Spielleiter gesendet."
          : "Nachricht an den Admin gesendet.",
      );
      resetAndClose();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hero-border bg-background-card p-4">
        <p className="font-libre text-sm text-gray-300">
          Schreibe deinem Spielleiter in einer Kampagne oder direkt dem Table-Heroes-Admin.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/15 px-4 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant hover:bg-hero-vibrant/25"
        >
          <Mail className="h-4 w-4" />
          Nachricht schreiben
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={resetAndClose}
          role="dialog"
          aria-modal="true"
          aria-label="Nachricht schreiben"
        >
          <div
            className="relative w-full max-w-lg rounded-lg border border-hero-border bg-background-card p-6 shadow-2xl"
            style={{
              backgroundImage: "url('/images/dark-marmor.webp')",
              backgroundSize: "cover",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={resetAndClose}
              className="absolute right-3 top-3 rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="pr-8 font-barlow text-xl font-bold uppercase text-white">
              Nachricht schreiben
            </h3>
            <p className="mt-1 font-libre text-sm text-gray-400">
              Der Empfänger sieht die Nachricht im Dashboard und erhält eine E-Mail-Info.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {canWriteGm ? (
                  <button
                    type="button"
                    onClick={() => setMode("gm")}
                    className={`rounded border px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide ${
                      mode === "gm"
                        ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                        : "border-hero-dark text-gray-300 hover:border-hero-vibrant"
                    }`}
                  >
                    Spielleiter
                  </button>
                ) : null}
                {canWriteAdmin ? (
                  <button
                    type="button"
                    onClick={() => setMode("admin")}
                    className={`rounded border px-3 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide ${
                      mode === "admin"
                        ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                        : "border-hero-dark text-gray-300 hover:border-hero-vibrant"
                    }`}
                  >
                    Table-Heroes-Admin
                  </button>
                ) : null}
              </div>

              {mode === "gm" ? (
                <div>
                  <label
                    htmlFor="player-msg-campaign"
                    className="mb-1 block font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold"
                  >
                    Kampagne / Spielleiter
                  </label>
                  <select
                    id="player-msg-campaign"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    required
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
                  >
                    {targets.campaignGms.map((entry) => (
                      <option key={entry.campaignId} value={entry.campaignId}>
                        {entry.campaignName} — {entry.gmUsername}
                      </option>
                    ))}
                  </select>
                  {selectedGmLabel ? (
                    <p className="mt-1 font-libre text-xs text-gray-400">An: {selectedGmLabel}</p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="player-msg-admin"
                    className="mb-1 block font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold"
                  >
                    Admin
                  </label>
                  <select
                    id="player-msg-admin"
                    value={adminUserId}
                    onChange={(e) => setAdminUserId(e.target.value)}
                    required
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
                  >
                    {targets.admins.map((admin) => (
                      <option key={admin.userId} value={admin.userId}>
                        {admin.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="player-msg-subject"
                  className="mb-1 block font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold"
                >
                  Betreff
                </label>
                <input
                  id="player-msg-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={120}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white outline-none focus:border-hero-vibrant"
                  placeholder="Worum geht es?"
                />
              </div>

              <div>
                <label
                  htmlFor="player-msg-content"
                  className="mb-1 block font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold"
                >
                  Nachricht
                </label>
                <textarea
                  id="player-msg-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={6}
                  maxLength={4000}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
                  placeholder="Deine Nachricht…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="rounded border border-hero-border bg-background-dark px-4 py-2 font-barlow text-sm font-bold uppercase text-gray-300 hover:bg-hero-dark"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow text-sm font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {isPending ? "Wird gesendet…" : "Senden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
