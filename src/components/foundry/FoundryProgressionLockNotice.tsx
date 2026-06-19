import { Monitor } from "lucide-react";

export function FoundryProgressionLockNotice({ message }: { message: string }) {
  if (!message.trim()) return null;

  return (
    <div className="flex gap-3 rounded-lg border border-sky-500/30 bg-sky-950/25 px-4 py-3">
      <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden />
      <p className="font-libre text-sm text-sky-100/95 leading-relaxed">{message}</p>
    </div>
  );
}
