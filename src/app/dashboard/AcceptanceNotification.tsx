"use client";

import { useState, useTransition } from "react";
import { PartyPopper, ArrowRight } from "lucide-react";
import { markAcceptanceAsSeen } from "./campaigns/[id]/actions";
import { useRouter } from "next/navigation";

type AcceptanceNotificationProps = {
  memberId: string;
  campaignId: string;
  campaignName: string;
};

export function AcceptanceNotification({
  memberId,
  campaignId,
  campaignName,
}: AcceptanceNotificationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleGoToCampaign() {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Mark as seen first
      await markAcceptanceAsSeen(memberId);
      
      // Then redirect
      startTransition(() => {
        router.push(`/dashboard/campaigns/${campaignId}`);
      });
    } catch (err) {
      console.error("Error marking acceptance as seen:", err);
      setIsProcessing(false);
      // Still redirect on error
      router.push(`/dashboard/campaigns/${campaignId}`);
    }
  }

  return (
    <div className="rounded-lg border-l-4 border-l-green-500 bg-green-950/20 border border-green-900/50 p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-green-900/50 border border-green-700">
          <PartyPopper className="h-5 w-5 text-green-400 animate-bounce" />
        </div>
        <div className="flex-1">
          <h3 className="font-barlow font-bold text-lg text-green-400 uppercase mb-2">
            Bewerbung akzeptiert! 🎉
          </h3>
          <p className="font-libre text-sm text-gray-200 mb-4">
            Du wurdest in der Kampagne <strong className="text-white">{campaignName}</strong> aufgenommen.
          </p>
          <button
            onClick={handleGoToCampaign}
            disabled={isProcessing || isPending}
            className="inline-flex items-center gap-2 rounded-md border border-green-700 bg-green-900/50 px-4 py-2 font-barlow font-bold uppercase text-xs text-green-400 hover:bg-green-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing || isPending ? (
              <>
                <span className="animate-spin">⏳</span>
                Lädt...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Zur Kampagne
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}





