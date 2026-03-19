"use client";

import { useState, useTransition } from "react";
import { Users, Coins, Plus, Minus, AlertTriangle, Loader2 } from "lucide-react";
import { distributeGroupPoints } from "@/src/lib/actions/point-actions";
import { toast } from "sonner";

type Props = {
  campaignId: string;
  memberCount: number;
};

export function GroupRewardForm({ campaignId, memberCount }: Props) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount === 0) {
      toast.error("Bitte gib einen gültigen Betrag ein.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Bitte gib einen Grund ein (mind. 3 Zeichen).");
      return;
    }

    // Zeige Bestätigung
    setShowConfirm(true);
  }

  function handleConfirm() {
    const numAmount = parseInt(amount, 10);
    
    startTransition(async () => {
      const result = await distributeGroupPoints(
        campaignId,
        numAmount,
        reason.trim()
      );

      setShowConfirm(false);

      if (result.success) {
        toast.success(
          `${numAmount > 0 ? "+" : ""}${numAmount} Punkte an ${result.affectedCount} Spieler verteilt! 🎉`
        );
        setAmount("");
        setReason("");
        
        if (result.failedUsers && result.failedUsers.length > 0) {
          toast.warning(`Warnung: ${result.failedUsers.join(", ")} konnten nicht belohnt werden.`);
        }

        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(result.error ?? "Fehler beim Verteilen der Punkte.");
      }
    });
  }

  return (
    <>
      <div className="rounded-lg border-2 border-accent-gold/40 bg-gradient-to-r from-accent-gold/5 via-accent-gold/10 to-accent-gold/5 p-5 shadow-lg" suppressHydrationWarning>
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-gold/20 border-2 border-accent-gold/50">
            <Coins className="h-6 w-6 text-accent-gold" />
          </div>
          <div>
            <h3 className="font-cinzel font-bold text-lg text-accent-gold flex items-center gap-2">
              Gruppen-Belohnung
            </h3>
            <p className="font-libre text-xs text-gray-400">
              Belohne alle {memberCount} Mitglieder gleichzeitig
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Betrag */}
            <div>
              <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1.5">
                Betrag pro Spieler
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setAmount((prev) =>
                      prev === "-" ? "" : prev ? `-${prev}` : "-"
                    )
                  }
                  className="rounded border border-red-800/50 bg-red-950/20 px-2.5 py-2 text-red-400 hover:bg-red-950/40 transition-colors"
                  title="Negativ"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || val === "-" || /^-?\d+$/.test(val)) {
                      setAmount(val);
                    }
                  }}
                  placeholder="z.B. 100"
                  className="flex-1 rounded border border-hero-dark bg-slate-900 px-3 py-2 font-barlow text-white text-center focus:border-accent-gold outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAmount((prev) =>
                      prev && prev.startsWith("-")
                        ? prev.slice(1)
                        : prev || "+"
                    )
                  }
                  className="rounded border border-green-800/50 bg-green-950/20 px-2.5 py-2 text-green-400 hover:bg-green-950/40 transition-colors"
                  title="Positiv"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Grund */}
            <div>
              <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1.5">
                Grund
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="z.B. Session-Abschluss"
                maxLength={200}
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-sm text-white focus:border-accent-gold outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || !amount || !reason.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-accent-gold/60 bg-accent-gold/20 px-5 py-3 font-barlow font-bold uppercase text-sm text-accent-gold hover:bg-accent-gold/30 hover:border-accent-gold transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Users className="h-5 w-5" />
            Gruppe belohnen ({memberCount} Spieler)
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => !isPending && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border-2 border-accent-gold/40 bg-background-card shadow-2xl overflow-hidden"
            style={{
              backgroundImage: "url('/images/dark-marmor.jpg')",
              backgroundSize: "cover",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-accent-gold/30 bg-black/60">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-accent-gold" />
                <h3 className="font-cinzel font-bold text-xl text-accent-gold">
                  Bestätigung erforderlich
                </h3>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 bg-black/40">
              <p className="font-libre text-gray-300 leading-relaxed mb-4">
                Möchtest du wirklich{" "}
                <strong className="text-accent-gold font-bold">
                  {parseInt(amount) > 0 ? "+" : ""}
                  {amount} Punkte
                </strong>{" "}
                an alle{" "}
                <strong className="text-white font-bold">
                  {memberCount} Mitglieder
                </strong>{" "}
                dieser Kampagne vergeben?
              </p>
              <div className="rounded border border-hero-border/30 bg-hero-dark/50 p-3">
                <p className="font-barlow text-xs uppercase text-gray-500 mb-1">
                  Grund
                </p>
                <p className="font-libre text-sm text-white">
                  {reason}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-accent-gold/30 bg-black/60 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2.5 font-barlow font-bold uppercase text-sm text-gray-400 hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-accent-gold/60 bg-accent-gold/20 px-4 py-2.5 font-barlow font-bold uppercase text-sm text-accent-gold hover:bg-accent-gold/30 transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verarbeite...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4" />
                    Bestätigen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
