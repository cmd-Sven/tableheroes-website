"use client";

/**
 * Spieler-Board: nur die Bühne. Lauscht auf den Broadcast des Spielleiters im selben Browser.
 */
import { useEffect, useState } from "react";
import { LiveLiteStage } from "@/src/components/live-lite/LiveLiteStage";
import { parseLiteChannelMessage } from "@/src/lib/live-lite/channel";
import {
  EMPTY_LITE_BOARD,
  liveLiteChannelName,
  type LiteBoardState,
} from "@/src/lib/live-lite/types";

type Props = {
  campaignId: string;
};

export function LiveLitePlayerBoard({ campaignId }: Props) {
  const [state, setState] = useState<LiteBoardState>(EMPTY_LITE_BOARD);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(liveLiteChannelName(campaignId));
    const onMessage = (event: MessageEvent) => {
      const message = parseLiteChannelMessage(event.data);
      if (message?.type === "state") setState(message.state);
    };
    channel.addEventListener("message", onMessage);
    channel.postMessage({ type: "hello" });
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [campaignId]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background-dark">
      <LiveLiteStage campaignId={campaignId} state={state} />
    </div>
  );
}
