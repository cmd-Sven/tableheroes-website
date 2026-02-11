import type { ReactNode } from "react";
import { createClient } from "@/src/lib/supabase/server";
import { MarketingLayout } from "@/src/components/marketing/MarketingLayout";
import { TopWelcomeBar } from "@/src/components/landing/TopWelcomeBar";

export default async function Layout({ children }: { children: ReactNode }) {
  // Auth-Check: Prüfe ob ein User eingeloggt ist
  let displayName: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await (supabase.from("users") as any)
        .select("display_name, username")
        .eq("id", user.id)
        .maybeSingle();

      displayName =
        (profile as any)?.display_name ||
        (profile as any)?.username ||
        "Abenteurer";
    }
  } catch {
    // Auth fehlgeschlagen – kein Bar anzeigen
    displayName = null;
  }

  return (
    <>
      {displayName && <TopWelcomeBar displayName={displayName} />}
      <MarketingLayout>{children}</MarketingLayout>
    </>
  );
}
