import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { WorldWizard } from "@/src/components/worlds/WorldWizard";

type Props = {
  searchParams: Promise<{ name?: string }>;
};

export default async function NewWorldWizardPage({ searchParams }: Props) {
  const { name: nameParam } = await searchParams;
  const worldName = (nameParam ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { primary_role?: string } | null;
  const isGM =
    profile?.primary_role === "GameMaster" || profile?.primary_role === "Admin";
  if (!isGM) redirect("/dashboard");

  if (!worldName) {
    redirect("/dashboard/worlds");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link
        href="/dashboard/worlds"
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Welten
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="h-6 w-6 text-accent-gold" />
        <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant">
          Neue Welt: {worldName}
        </h1>
      </div>
      <p className="font-libre text-sm text-gray-300 mb-4">
        Lege das Fundament deiner Welt fest. Am Ende wird die Welt mit diesem Namen und dem Blueprint erstellt.
      </p>

      <WorldWizard worldName={worldName} initialBlueprint={null} />
    </div>
  );
}
