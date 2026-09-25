import { AsyncLocalStorage } from "async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/lib/database.types";

const storage = new AsyncLocalStorage<SupabaseClient<Database>>();

/** Nur gesetzt, während ein GM/Admin die Spieler-Vorschau lädt. */
export function getDbOverride(): SupabaseClient<Database> | null {
  return storage.getStore() ?? null;
}

export function runWithServiceDb<T>(
  client: SupabaseClient<Database>,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(client, fn);
}
