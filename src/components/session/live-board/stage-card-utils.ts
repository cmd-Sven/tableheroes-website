/**
 * stage-card-utils — Glow colors and faction status visuals for stage NPC/faction cards.
 */
import {
  Handshake,
  Minus,
  Shield,
  Skull,
  Swords,
  type LucideIcon,
} from "lucide-react";

export function getStageCardGlowColor(kind: "npc" | "faction") {
  return kind === "faction" ? "#cab926" : "#8b5cf6";
}

export function getFactionStatusVisual(status: string | null | undefined): {
  Icon: LucideIcon;
  color: string;
  label: string;
} | null {
  switch (status) {
    case "Feindlich":
      return { Icon: Skull, color: "text-red-400", label: "Feindlich" };
    case "Im Krieg":
      return { Icon: Swords, color: "text-red-500", label: "Im Krieg" };
    case "Verbündet":
      return { Icon: Shield, color: "text-hero-vibrant", label: "Verbündet" };
    case "Freundlich":
      return { Icon: Handshake, color: "text-emerald-400", label: "Freundlich" };
    case "Neutral":
      return { Icon: Minus, color: "text-gray-400", label: "Neutral" };
    default:
      return null;
  }
}
