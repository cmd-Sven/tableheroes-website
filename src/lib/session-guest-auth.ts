import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type GuestSessionCookie = {
  guestId: string;
  sessionId: string;
  exp: number;
};

const COOKIE_NAME = "th_session_guest";

function guestSecret(): string {
  const secret =
    process.env.SESSION_GUEST_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("SESSION_GUEST_SECRET oder SUPABASE_SERVICE_ROLE_KEY fehlt.");
  }
  return secret;
}

function signPayload(payload: GuestSessionCookie): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", guestSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function parseGuestSessionCookie(raw: string | undefined | null): GuestSessionCookie | null {
  if (!raw?.includes(".")) return null;
  const [data, sig] = raw.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", guestSecret()).update(data).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as GuestSessionCookie;
    if (!payload.guestId || !payload.sessionId || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function readGuestSessionCookie(): Promise<GuestSessionCookie | null> {
  const jar = await cookies();
  return parseGuestSessionCookie(jar.get(COOKIE_NAME)?.value);
}

export function createGuestSessionCookieValue(
  sessionId: string,
  guestId: string = randomUUID(),
): { value: string; guestId: string } {
  const payload: GuestSessionCookie = {
    guestId,
    sessionId,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  return { value: signPayload(payload), guestId };
}

export function guestSessionCookieOptions(value: string) {
  return {
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 12 * 60 * 60,
  };
}

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
