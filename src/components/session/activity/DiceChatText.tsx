/**
 * Würfelrechnung im Chat. Nur der Erschöpfungsterm ist rot, der Rest bleibt Fließtext.
 */
import type { ReactNode } from "react";
import { EXHAUSTION_CHAT_TERM_RE } from "@/src/lib/session/dice-roll";

type Props = {
  text: string;
};

export function DiceChatText({ text }: Props) {
  const re = new RegExp(EXHAUSTION_CHAT_TERM_RE.source, "g");
  const parts = text.split(re);
  if (parts.length === 1) return <>{text}</>;

  const matches = text.match(new RegExp(EXHAUSTION_CHAT_TERM_RE.source, "g")) ?? [];
  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (part) nodes.push(<span key={`t-${index}`}>{part}</span>);
    const term = matches[index];
    if (term) {
      nodes.push(
        <span key={`e-${index}`} className="font-bold text-red-400">
          {term}
        </span>,
      );
    }
  });
  return <>{nodes}</>;
}
