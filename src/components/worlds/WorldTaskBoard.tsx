"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListTodo, MapPin, Users, UserPlus, Trash2, CheckCircle2 } from "lucide-react";
import type { WorldTask, WorldTaskType } from "@/src/app/dashboard/worlds/world-tasks-actions";
import { deleteWorldTask, completeWorldTask, createWorldTask } from "@/src/app/dashboard/worlds/world-tasks-actions";

type Props = {
  worldId: string;
  tasks: WorldTask[];
};

const TYPE_LABELS: Record<string, string> = {
  location: "Ort",
  faction: "Fraktion",
  npc: "NPC",
  religion: "Religion",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  location: <MapPin className="h-4 w-4" />,
  faction: <Users className="h-4 w-4" />,
  npc: <UserPlus className="h-4 w-4" />,
  religion: <ListTodo className="h-4 w-4" />,
};

function buildWizardLink(worldId: string, task: WorldTask): string {
  const name = encodeURIComponent(task.proposed_name);
  switch (task.type) {
    case "faction":
      return `/dashboard/worlds/${worldId}/factions/new?name=${name}`;
    case "location":
      // Orte werden über den Orts-Wizard angelegt, nicht mehr über die Lore-Seite
      return `/dashboard/worlds/${worldId}/locations/create`;
    case "npc":
      return `/dashboard/worlds/${worldId}/npcs/create?prefillName=${name}`;
    case "religion":
      // Startet den Religions-Wizard (Lore-Eintrag vom Typ Religion, vorbelegter Name aus Gottheit)
      return `/dashboard/worlds/${worldId}/lore/new?type=Religion&deityName=${name}`;
    default:
      return `/dashboard/worlds/${worldId}`;
  }
}

export function WorldTaskBoard({ worldId, tasks }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<WorldTaskType>("location");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<number | null>(2);
  const [newDueDate, setNewDueDate] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      if (typeof window !== "undefined") alert("Bitte einen Aufgabentitel eingeben.");
      return;
    }
    setCreating(true);
    try {
      await createWorldTask({
        world_id: worldId,
        type: newType,
        proposed_name: newTitle.trim(),
        description: newDescription.trim() || null,
        priority: newPriority,
        due_date: newDueDate || null,
      });
      setNewTitle("");
      setNewDescription("");
      setNewPriority(2);
      setNewDueDate("");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erstellen fehlgeschlagen.";
      if (typeof window !== "undefined") alert(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (deletingId) return;
    setDeletingId(taskId);
    try {
      await deleteWorldTask(taskId);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen.";
      if (typeof window !== "undefined") alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleComplete = async (taskId: string) => {
    if (completingId) return;
    setCompletingId(taskId);
    try {
      await completeWorldTask(taskId);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Abhaken fehlgeschlagen.";
      if (typeof window !== "undefined") alert(msg);
    } finally {
      setCompletingId(null);
    }
  };

  if (tasks.length === 0) return null;

  return (
    <div className="rounded-lg border border-hero-border bg-slate-900/40 p-4">
      <h2 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
        <ListTodo className="h-5 w-5" />
        Weltenbau-Aufgaben
      </h2>
      <p className="font-libre text-sm text-gray-400 mb-4">
        Hier kannst du offene Weltenbau-Aufgaben verwalten. Einträge können aus KI/Wizard-Vorschlägen stammen oder von dir selbst angelegt werden.
      </p>

      <div className="mb-4 rounded-md border border-hero-border/60 bg-black/40 p-3 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <label className="block font-barlow font-semibold text-[10px] uppercase text-gray-400 mb-1">
              Typ
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as WorldTaskType)}
              className="w-full rounded bg-slate-900 border border-hero-dark p-1.5 text-xs text-white focus:border-hero-vibrant outline-none"
            >
              <option value="location">Ort / Region</option>
              <option value="faction">Fraktion</option>
              <option value="npc">NPC</option>
              <option value="religion">Religion</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block font-barlow font-semibold text-[10px] uppercase text-gray-400 mb-1">
              Aufgabe / Titel
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder='z.B. Region "Die Pechsteppe" inkl. Stadt mit Questziel'
              className="w-full rounded bg-slate-900 border border-hero-dark p-1.5 text-xs text-white focus:border-hero-vibrant outline-none"
            />
          </div>
          <div>
            <label className="block font-barlow font-semibold text-[10px] uppercase text-gray-400 mb-1">
              Priorität
            </label>
            <select
              value={newPriority ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setNewPriority(v ? Number(v) : null);
              }}
              className="w-full rounded bg-slate-900 border border-hero-dark p-1.5 text-xs text-white focus:border-hero-vibrant outline-none"
            >
              <option value="">Keine</option>
              <option value="1">Prio 1 – Hoch</option>
              <option value="2">Prio 2 – Mittel</option>
              <option value="3">Prio 3 – Niedrig</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div className="md:col-span-3">
            <label className="block font-barlow font-semibold text-[10px] uppercase text-gray-400 mb-1">
              Notizen / Details (optional)
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="z.B. mindestens 3 markante Schauplätze, 1 Dungeon, 1 Questziel"
              className="w-full rounded bg-slate-900 border border-hero-dark p-1.5 text-xs text-white focus:border-hero-vibrant outline-none"
            />
          </div>
          <div>
            <label className="block font-barlow font-semibold text-[10px] uppercase text-gray-400 mb-1">
              Fällig bis
            </label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full rounded bg-slate-900 border border-hero-dark p-1.5 text-xs text-white focus:border-hero-vibrant outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded bg-hero-vibrant px-3 py-1.5 font-barlow font-bold text-[11px] uppercase text-black hover:bg-yellow-400 disabled:opacity-50"
          >
            {creating ? "Speichere..." : "Aufgabe hinzufügen"}
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center justify-between gap-3 rounded border border-hero-border bg-background-card p-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-accent-gold shrink-0">{TYPE_ICONS[task.type] ?? <ListTodo className="h-4 w-4" />}</span>
              <div className="min-w-0">
                <span className="font-barlow font-bold text-sm text-white">{task.proposed_name}</span>
                <span className="ml-2 font-libre text-xs text-gray-500">{TYPE_LABELS[task.type] ?? task.type}</span>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  {task.priority !== null && (
                    <span className="inline-flex items-center rounded-full bg-hero-dark/80 px-2 py-0.5 text-[10px] font-barlow uppercase text-hero-vibrant">
                      Prio {task.priority}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-barlow uppercase text-gray-300">
                      Bis {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="font-libre text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleComplete(task.id)}
                disabled={completingId === task.id}
                title="Aufgabe abhaken"
                className="rounded border border-hero-vibrant/70 bg-hero-vibrant/10 p-1.5 text-hero-vibrant hover:bg-hero-vibrant/30 hover:text-black disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <Link
                href={buildWizardLink(worldId, task)}
                className="rounded border border-hero-vibrant bg-hero-vibrant/20 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-hero-vibrant hover:bg-hero-vibrant/30 transition-colors"
              >
                Anlegen
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                disabled={deletingId === task.id}
                title="Vorschlag löschen"
                className="rounded border border-red-900/60 bg-red-950/40 p-1.5 text-red-400 hover:bg-red-900/50 hover:text-red-300 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
