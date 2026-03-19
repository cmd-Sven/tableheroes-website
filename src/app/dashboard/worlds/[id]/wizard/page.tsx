import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { WorldWizard } from "@/src/components/worlds/WorldWizard";
import type { WorldBlueprint } from "@/src/types/world";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorldWizardPage({ params }: Props) {
  const { id: worldId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id, blueprint")
    .eq("id", worldId)
    .single();

  if (!worldRaw) notFound();

  const world = worldRaw as {
    id: string;
    name: string;
    gm_id?: string;
blueprint?: WorldBlueprint | null;
};
  const isOwner = world.gm_id === user.id;
  if (!isOwner) notFound();

  const initialBlueprint: WorldBlueprint | null = (world.blueprint as any) ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link
        href={`/dashboard/worlds/${worldId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Welt
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="h-6 w-6 text-accent-gold" />
        <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant">
          World Wizard für {world.name}
        </h1>
      </div>
      <p className="font-libre text-sm text-gray-300 mb-4">
        Definiere das Fundament deiner Welt. Diese Informationen können später in AI-Hooks, Welt-Skeletons und Generatoren einfließen.
      </p>

      <WorldWizard worldId={worldId} worldName={world.name} initialBlueprint={initialBlueprint} />
    </div>
  );
}

