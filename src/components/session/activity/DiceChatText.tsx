/**
 * Würfelrechnung im Chat.
 * Übungsbonus blau, Erschöpfung rot, der Rest bleibt Fließtext.
 */
import type { ReactNode } from "react";
import {
  EXHAUSTION_CHAT_TERM_RE,
  PROFICIENCY_CHAT_TERM_RE,
} from "@/src/lib/session/dice-roll";

type Props = {
  text: string;
};

const TERM_RE = new RegExp(
  `${PROFICIENCY_CHAT_TERM_RE.source}|${EXHAUSTION_CHAT_TERM_RE.source}`,
  "g",
);

export function DiceChatText({ text }: Props) {
  const parts = text.split(TERM_RE);
  if (parts.length === 1) return <>{text}</>;

  const matches = text.match(TERM_RE) ?? [];
  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (part) nodes.push(<span key={`t-${index}`}>{part}</span>);
    const term = matches[index];
    if (!term) return;
    const blue = term.startsWith("Übung");
    nodes.push(
      <span
        key={`c-${index}`}
        className={blue ? "font-bold text-sky-300" : "font-bold text-red-400"}
      >
        {term}
      </span>,
    );
  });
  return <>{nodes}</>;
}
