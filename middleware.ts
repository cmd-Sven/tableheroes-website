import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// TODO: Admin-Mail hier anpassen (optional, falls Wartungsmodus aus DB nicht greift)
const ADMIN_EMAIL = "DEINE_EMAIL@BEISPIEL.DE";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // ------------------------------------------------------------
  // Öffentliche Routen (immer erlauben)
  // ------------------------------------------------------------
  const isRoot = path === "/";
  const isLogin =
    path === "/login" || path === "/register" || path === "/signup";
  const isMaintenance = path === "/maintenance";
  const isNextAsset = path.startsWith("/_next");
  const isImagesAsset = path.startsWith("/images");
  const isFavicon = path === "/favicon.ico";
  const isApi = path.startsWith("/api");

  if (
    isRoot ||
    isLogin ||
    isMaintenance ||
    isNextAsset ||
    isImagesAsset ||
    isFavicon ||
    isApi
  ) {
    return response;
  }

  // ------------------------------------------------------------
  // Dashboard: Auth + Wartungsmodus (nur Admin bei Wartung)
  // ------------------------------------------------------------
  if (path.startsWith("/dashboard")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }

    // Optional: Admin-Hintertür per E-Mail (überschreibt DB-Wartung)
    if (user.email === ADMIN_EMAIL) {
      return response;
    }

    // Wartungsmodus aus site_settings: nur Admins dürfen ins Dashboard
    try {
      const { data: settingsRow } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      const maintenanceActive =
        (settingsRow as any)?.value === "true" ||
        (settingsRow as any)?.value === true;

      if (maintenanceActive) {
        const { data: profileRow } = await (supabase as any)
          .from("users")
          .select("primary_role")
          .eq("id", user.id)
          .maybeSingle();
        const role = (profileRow as any)?.primary_role ?? "Player";
        if (role !== "Admin") {
          return NextResponse.redirect(
            new URL("/?error=maintenance", request.url)
          );
        }
      }
    } catch {
      // Tabelle site_settings fehlt oder RLS: Wartungsmodus ignoriert
    }

    return response;
  }

  // Alle anderen Routen: durchlassen (z. B. weitere App-Routen)
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
