/** PostgREST/Supabase-Fehler haben oft nicht-enumerable Props → `console.error(err)` loggt `{}`. */
export function formatPostgrestError(
  error: unknown,
): { message: string; code?: string; details?: string; hint?: string } {
  if (error == null) {
    return { message: "Unknown error (null)" };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    const message =
      typeof e.message === "string"
        ? e.message
        : typeof e.error === "string"
          ? e.error
          : JSON.stringify(error);
    const out: {
      message: string;
      code?: string;
      details?: string;
      hint?: string;
    } = { message };
    if (typeof e.code === "string") out.code = e.code;
    if (typeof e.details === "string") out.details = e.details;
    if (typeof e.hint === "string") out.hint = e.hint;
    return out;
  }
  return { message: String(error) };
}

export function logPostgrestError(context: string, error: unknown): void {
  console.error(context, formatPostgrestError(error));
}
