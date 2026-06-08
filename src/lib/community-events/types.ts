export type CommunityEventKind = "Stammtisch" | "Feier" | "Sonstiges" | "Spielplanung";

export type CommunityEventStatus = "Scheduled" | "Cancelled" | "Completed";

export type CommunityEvent = {
  id: string;
  title: string;
  description: string | null;
  event_kind: CommunityEventKind;
  start_time: string;
  end_time: string | null;
  location: string | null;
  status: CommunityEventStatus;
  rsvp_deadline_days: number | null;
  is_live: boolean;
  visible_on_landing: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityEventInsert = {
  title: string;
  description?: string | null;
  event_kind: CommunityEventKind;
  start_time: string;
  end_time: string;
  location?: string | null;
  rsvp_deadline_days?: 1 | 2 | 3 | null;
  is_live?: boolean;
  visible_on_landing?: boolean;
};

export const COMMUNITY_EVENT_KIND_LABELS: Record<CommunityEventKind, string> = {
  Stammtisch: "Stammtisch / Treffen",
  Feier: "Feier / Jubiläum",
  Sonstiges: "Sonstiges",
  Spielplanung: "Spielplanung / Kennenlernen",
};

/** Nur Admin-Community-Termine (GM nutzt Spielplanung separat). */
export const ADMIN_COMMUNITY_EVENT_KINDS: CommunityEventKind[] = [
  "Stammtisch",
  "Feier",
  "Sonstiges",
];

export const COMMUNITY_EVENT_KINDS: CommunityEventKind[] = [
  "Stammtisch",
  "Feier",
  "Sonstiges",
  "Spielplanung",
];
