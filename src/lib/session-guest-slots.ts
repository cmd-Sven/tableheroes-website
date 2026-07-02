export type GuestSlot = {
  slot: number;
  name: string;
  guest_id: string;
};

export function normalizeGuestSlots(raw: unknown): GuestSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const o = entry as Record<string, unknown>;
      const slot = Number(o.slot);
      const name = typeof o.name === "string" ? o.name.trim() : "";
      const guest_id = typeof o.guest_id === "string" ? o.guest_id : "";
      if (!Number.isFinite(slot) || slot < 1 || slot > 3 || !name) return null;
      return { slot, name, guest_id };
    })
    .filter((x): x is GuestSlot => x != null);
}
