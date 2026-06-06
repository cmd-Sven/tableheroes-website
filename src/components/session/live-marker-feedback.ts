"use client";

import { toast } from "sonner";
import {
  liveMarkerFeedbackMessage,
  type LiveMarkerType,
} from "@/src/lib/session-chronicle/constants";

export async function setLiveMarkerWithFeedback(
  addMarker: (type: LiveMarkerType) => Promise<boolean>,
  type: LiveMarkerType,
): Promise<boolean> {
  const ok = await addMarker(type);
  if (ok) {
    toast.success(liveMarkerFeedbackMessage(type), { duration: 2800 });
  } else {
    toast.error("Markierung konnte nicht gesetzt werden.");
  }
  return ok;
}
