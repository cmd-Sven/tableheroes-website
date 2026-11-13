import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { parseWorldChronicle } from "@/src/lib/world/chronicle";
import { WorldChronicleTimeline } from "@/src/components/worlds/WorldChronicleTimeline";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorldZeitstrahlPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id, blueprint")
    .eq("id", id)
    .single();

  if (!world || world.gm_id !== user.id) notFound();

  const chronicle = parseWorldChronicle(world.blueprint);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link
        href={`/dashboard/worlds/${id}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Welt
      </Link>
      {chronicle ? (
        <WorldChronicleTimeline
          chronicle={chronicle}
          worldName={world.name}
          loreBasePath={`/dashboard/worlds/${id}/lore`}
        />
      ) : (
        <p className="font-libre text-gray-300">
          Für {world.name} ist noch keine Weltrechnung hinterlegt.
        </p>
      )}
    </div>
  );
}
