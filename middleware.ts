import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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
  const isNextAsset = path.startsWith("/_next");
  const isImagesAsset = path.startsWith("/images");
  const isFavicon = path === "/favicon.ico";
  const isApi = path.startsWith("/api");
  const isOnboarding = path === "/onboarding";
  const isKodex = path === "/kodex";
  const isMarketingPublic =
    path === "/impressum" ||
    path === "/datenschutz" ||
    path.startsWith("/campaigns/") ||
    path === "/support";

  if (
    isRoot ||
    isLogin ||
    isMarketingPublic ||
    isNextAsset ||
    isImagesAsset ||
    isFavicon ||
    isApi ||
    isKodex
  ) {
    return response;
  }

  // ------------------------------------------------------------
  // Onboarding: Eingeloggte User ohne codex_agreed → /onboarding
  // /onboarding selbst immer erlauben für eingeloggte User
  // ------------------------------------------------------------
  if (user && !isOnboarding && path.startsWith("/dashboard")) {
    try {
      const { data: profileRow } = await (supabase as any)
        .from("users")
        .select("codex_agreed, status")
        .eq("id", user.id)
        .maybeSingle();
      const codexAgreed = (profileRow as any)?.codex_agreed === true;
      const userStatus = (profileRow as any)?.status as string | undefined;

      if (!codexAgreed) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }

      // Onboarding abgeschlossen aber noch nicht freigegeben → /onboarding (Pending-Hinweis)
      if (codexAgreed && userStatus !== "approved") {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    } catch {
      // Fehler ignorieren – Spalte existiert ggf. noch nicht
    }
  }

  // /onboarding nur für eingeloggte User
  if (isOnboarding) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
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
