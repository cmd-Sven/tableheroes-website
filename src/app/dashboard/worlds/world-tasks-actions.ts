"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type WorldTaskType = "location" | "faction" | "npc" | "religion";

export type WorldTask = {
  id: string;
  world_id: string;
  type: WorldTaskType;
  proposed_name: string;
  description: string | null;
  source_npc_id: string | null;
  status: "pending" | "completed";
  created_at: string;
  priority: number | null;
  due_date: string | null;
};

async function assertWorldGm(supabase: Awaited<ReturnType<typeof createClient>>, worldId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();
  const w = world as { gm_id?: string } | null;
  if (!w || w.gm_id !== user.id) throw new Error("Keine Berechtigung für diese Welt.");
  return user.id;
}

/** Alle Tasks einer Welt laden (nur GM). Gibt bei fehlender Tabelle oder RLS-Fehler [] zurück, damit die Welt-Übersicht weiter lädt. */
export async function getWorldTasks(worldId: string): Promise<WorldTask[]> {
  const supabase = await createClient();
  try {
    await assertWorldGm(supabase, worldId);
  } catch {
    throw new Error("Keine Berechtigung für diese Welt.");
  }

  const { data, error } = await (supabase.from("world_tasks") as any)
    .select("*")
    .eq("world_id", worldId)
    .order("created_at", { ascending: false });

  if (error) {
    const code = (error as { code?: string }).code;
    const message = (error as { message?: string }).message ?? String(error);
    const tableMissing =
      code === "42P01" ||
      code === "PGRST205" ||
      message?.includes("does not exist") ||
      message?.includes("existiert nicht") ||
      message?.includes("Could not find the table") ||
      message?.includes("schema cache");
    if (tableMissing) {
      return [];
    }
    console.error("getWorldTasks:", code ?? message, message);
    throw new Error(message || "Fehler beim Laden der Welt-Aufgaben.");
  }
  return (data ?? []) as WorldTask[];
}

/** Einzelnen Task anlegen. */
export async function createWorldTask(params: {
  world_id: string;
  type: WorldTaskType;
  proposed_name: string;
  description?: string | null;
  source_npc_id?: string | null;
  status?: "pending" | "completed";
  priority?: number | null;
  due_date?: string | null;
}): Promise<WorldTask> {
  const supabase = await createClient();
  await assertWorldGm(supabase, params.world_id);

  const { data, error } = await (supabase.from("world_tasks") as any)
    .insert({
      world_id: params.world_id,
      type: params.type,
      proposed_name: params.proposed_name,
      description: params.description ?? null,
      source_npc_id: params.source_npc_id ?? null,
      status: params.status ?? "pending",
      priority: params.priority ?? null,
      due_date: params.due_date ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("createWorldTask:", error);
    throw new Error(error.message);
  }
  revalidatePath(`/dashboard/worlds/${params.world_id}`);
  return data as WorldTask;
}

/** Mehrere Tasks auf einmal anlegen (z. B. aus Wizard Step 3). */
export async function insertWorldTasksBatch(
  worldId: string,
  tasks: Array<{
    type: WorldTaskType;
    proposed_name: string;
    description?: string | null;
    source_npc_id?: string | null;
  }>
): Promise<WorldTask[]> {
  if (tasks.length === 0) return [];
  const supabase = await createClient();
  await assertWorldGm(supabase, worldId);

  const rows = tasks.map((t) => ({
    world_id: worldId,
    type: t.type,
    proposed_name: t.proposed_name,
    description: t.description ?? null,
    source_npc_id: t.source_npc_id ?? null,
    status: "pending" as const,
    priority: null,
    due_date: null,
  }));

  const { data, error } = await (supabase.from("world_tasks") as any).insert(rows).select();

  if (error) {
    console.error("insertWorldTasksBatch:", error);
    throw new Error(error.message);
  }
  revalidatePath(`/dashboard/worlds/${worldId}`);
  return (data ?? []) as WorldTask[];
}

/** Task als erledigt markieren. */
export async function completeWorldTask(taskId: string): Promise<void> {
  const supabase = await createClient();

  const { data: task } = await (supabase.from("world_tasks") as any)
    .select("id, world_id")
    .eq("id", taskId)
    .single();
  if (!task) throw new Error("Task nicht gefunden.");
  await assertWorldGm(supabase, (task as { world_id: string }).world_id);

  const { error } = await (supabase.from("world_tasks") as any)
    .update({ status: "completed" })
    .eq("id", taskId);

  if (error) {
    console.error("completeWorldTask:", error);
    throw new Error(error.message);
  }
  revalidatePath(`/dashboard/worlds/${(task as { world_id: string }).world_id}`);
}

/** Task (Vorschlag) endgültig löschen. */
export async function deleteWorldTask(taskId: string): Promise<void> {
  const supabase = await createClient();

  const { data: task } = await (supabase.from("world_tasks") as any)
    .select("id, world_id")
    .eq("id", taskId)
    .single();
  if (!task) throw new Error("Task nicht gefunden.");
  await assertWorldGm(supabase, (task as { world_id: string }).world_id);

  const { error } = await (supabase.from("world_tasks") as any).delete().eq("id", taskId);

  if (error) {
    console.error("deleteWorldTask:", error);
    throw new Error(error.message);
  }
  revalidatePath(`/dashboard/worlds/${(task as { world_id: string }).world_id}`);
}
