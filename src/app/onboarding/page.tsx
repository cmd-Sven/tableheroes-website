import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Prüfe, ob User Onboarding bereits abgeschlossen hat
  const { data } = await (supabase.from("users") as any)
    .select("codex_agreed, status")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as { codex_agreed?: boolean; status?: string } | null;

  // Wenn Kodex schon akzeptiert: Weiter zum Dashboard (oder Pending-Hinweis)
  if (profile?.codex_agreed) {
    if (profile.status === "approved") {
      redirect("/dashboard");
    }
    // Status ist "pending" – zeige Wartehinweis
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-lg border border-hero-border bg-background-card p-8 text-center shadow-2xl">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent-gold bg-accent-gold/10">
              <span className="font-cinzel font-bold text-2xl text-accent-gold">
                ⏳
              </span>
            </div>
            <h1 className="font-cinzel font-bold text-2xl text-accent-gold mb-2">
              Dein Account wartet auf Freigabe
            </h1>
            <p className="font-libre text-gray-300 leading-relaxed">
              Vielen Dank für deine Registrierung! Ein Admin wird deine
              Bewerbung prüfen und dich freischalten. Du erhältst eine
              Benachrichtigung, sobald es soweit ist.
            </p>
          </div>
          <div className="rounded border border-hero-dark bg-background-dark p-4">
            <p className="font-barlow font-bold text-sm uppercase text-gray-500">
              Status
            </p>
            <p className="font-cinzel font-bold text-lg text-accent-gold mt-1">
              Ausstehend
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <div className="container mx-auto max-w-2xl px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
            Willkommen bei TableHeroes
          </h1>
          <p className="mt-3 font-libre text-gray-300 leading-relaxed">
            Bevor dein Abenteuer beginnt, erzähl uns ein wenig über dich. Deine
            Antworten helfen uns, dich mit den richtigen Gruppen
            zusammenzubringen.
          </p>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
