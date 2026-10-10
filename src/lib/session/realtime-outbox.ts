/**
 * realtime-outbox — Hält Broadcasts, bis der Session-Kanal wirklich subscribed ist.
 * Ein Send vor SUBSCRIBED geht bei Supabase verloren; die Warteschlange spielt ihn nach.
 */
import type { RealtimeChannel } from "@supabase/supabase-js";

type Outbound = { event: string; payload: Record<string, unknown> };

const queue: Outbound[] = [];
let readyChannel: RealtimeChannel | null = null;

const MAX_QUEUE = 40;

export function markSessionBroadcastReady(channel: RealtimeChannel | null): void {
  readyChannel = channel;
  if (!channel) return;
  const batch = queue.splice(0, queue.length);
  for (const item of batch) {
    void channel.send({ type: "broadcast", event: item.event, payload: item.payload });
  }
}

export function sendSessionBroadcast(event: string, payload: Record<string, unknown>): void {
  if (!readyChannel) {
    queue.push({ event, payload });
    if (queue.length > MAX_QUEUE) queue.shift();
    return;
  }
  void readyChannel.send({ type: "broadcast", event, payload });
}
