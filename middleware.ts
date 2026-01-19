import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// TODO: Admin-Mail hier anpassen
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
  // 1. Statische Ausnahmen (öffentlich zugänglich)
  // ------------------------------------------------------------
  const isRoot = path === "/";
  const isMaintenance = path === "/maintenance";
  const isNextAsset = path.startsWith("/_next");
  const isImagesAsset = path.startsWith("/images");
  const isFavicon = path === "/favicon.ico";

  // Admin-Hintertür: Admin darf alles sehen
  if (user && user.email === ADMIN_EMAIL) {
    return response;
  }

  // Öffentliche Routen (Landingpage, Maintenance & Assets) immer erlauben
  if (isRoot || isMaintenance || isNextAsset || isImagesAsset || isFavicon) {
    return response;
  }

  // Alle anderen Routen werden auf die Maintenance-Seite umgeleitet
  return NextResponse.redirect(new URL("/maintenance", request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - direkte Bilddateien (per Erweiterung)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};





