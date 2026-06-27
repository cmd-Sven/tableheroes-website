import { Sparkles } from "lucide-react";
import { AI_IMAGE_ATTRIBUTION_TEXT } from "@/src/lib/image-attribution";

type Props = {
  isAiGenerated?: boolean | null;
  className?: string;
};

/** Hinweis unterhalb von NSC-Portraits (nur bei KI-Generierung). */
export function NpcPortraitAttribution({ isAiGenerated, className = "" }: Props) {
  if (!isAiGenerated) return null;

  return (
    <p
      className={`flex items-center justify-center gap-1 text-center font-libre text-[10px] text-gray-500 ${className}`}
    >
      <Sparkles className="h-3 w-3 shrink-0 text-accent-gold/80" aria-hidden />
      {AI_IMAGE_ATTRIBUTION_TEXT}
    </p>
  );
}
