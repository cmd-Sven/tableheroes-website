"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Send, X } from "lucide-react";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import {
  BARNABAS_DEMO_PROMPTS,
  BARNABAS_LORE_IDS,
  buildBarnabasHref,
  matchBarnabasLoreQuery,
  type BarnabasLoreLink,
} from "./barnabas-lore-faq";

const PORTRAIT_SRC = "/images/city/barnabas-gerstenschlag.jpg";

type ChatRole = "user" | "barnabas";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  links?: BarnabasLoreLink[];
};

type Props = {
  worldId?: string | null;
  /** Wenn false, wird nichts gerendert (z. B. Spieleransicht). */
  visible?: boolean;
};

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function BarnabasLoreChatFab({ worldId, visible = true }: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "barnabas",
      text: "Barnabas Gerstenschlag, Daten-Wirt. Du hast eine Frage? Na dann frag — Fraktion, Ort oder Volk, ich schau hinter der Theke nach.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedWorldId = worldId || BARNABAS_LORE_IDS.worldId;

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    inputRef.current?.focus();
  }, [open, messages]);

  if (!visible) return null;

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;

    const match = matchBarnabasLoreQuery(trimmed);
    setMessages((prev) => [
      ...prev,
      { id: nextId("u"), role: "user", text: trimmed },
      {
        id: nextId("b"),
        role: "barnabas",
        text: match.reply,
        links: match.links.length > 0 ? match.links : undefined,
      },
    ]);
    setDraft("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(draft);
  }

  return (
    <div
      className="pointer-events-none fixed z-[91] flex flex-col items-end gap-2"
      style={{
        right: "3.25rem",
        bottom: "calc(var(--th-hand-dock-h, 4.75rem) + 0.75rem)",
      }}
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            key="barnabas-panel"
            id={panelId}
            role="dialog"
            aria-label="Barnabas · Daten-Wirt"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-auto flex h-[min(26rem,52dvh)] w-[min(20rem,calc(100vw-5rem))] flex-col overflow-hidden rounded-xl border border-hero-border bg-background-card/98 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
          >
            <header className="flex items-center gap-3 border-b border-hero-dark/80 px-3 py-2.5">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-accent-gold/60">
                <Image
                  src={PORTRAIT_SRC}
                  alt="Barnabas Gerstenschlag"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-barlow text-sm font-extrabold uppercase tracking-wide text-hero-vibrant">
                  Barnabas
                </p>
                <p className="font-cinzel text-[11px] text-accent-gold">Daten-Wirt</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-accent-white"
                aria-label="Chat schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div
              ref={listRef}
              className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-lg px-2.5 py-2 ${
                      m.role === "user"
                        ? "bg-hero-dark/80 text-gray-100"
                        : "border border-hero-dark/70 bg-background-dark/80 text-gray-200"
                    }`}
                  >
                    <p className="font-libre text-[13px] leading-relaxed">{m.text}</p>
                    {m.links && m.links.length > 0 ? (
                      <ul className="mt-2 space-y-1.5">
                        {m.links.map((link) => (
                          <li key={`${link.kind}-${link.entryId}`}>
                            <a
                              href={buildBarnabasHref(resolvedWorldId, link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded border border-accent-gold/50 bg-accent-gold/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold hover:bg-accent-gold/20"
                            >
                              {link.label}
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-hero-dark/80 px-2.5 pb-1.5 pt-2">
              <div className="mb-1.5 flex flex-wrap gap-1">
                {BARNABAS_DEMO_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => ask(prompt)}
                    className="rounded border border-hero-border/70 bg-background-dark/60 px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400 hover:border-hero-vibrant hover:text-hero-vibrant"
                  >
                    {prompt.length > 28 ? `${prompt.slice(0, 26)}…` : prompt}
                  </button>
                ))}
              </div>
              <form onSubmit={onSubmit} className="flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Frag den Wirt…"
                  className="min-w-0 flex-1 rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-hero-border bg-hero-dark text-accent-white disabled:opacity-40"
                  aria-label="Senden"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-auto group relative">
        {!open ? (
          <div
            className="pointer-events-none absolute bottom-[calc(100%+0.55rem)] right-0 origin-bottom-right whitespace-nowrap rounded-md border border-accent-gold/40 bg-background-card/95 px-2.5 py-1 font-libre text-[11px] text-gray-200 shadow-lg opacity-0 scale-95 translate-y-1 transition-[opacity,transform] duration-200 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0"
          >
            Du hast eine Frage? Na dann frag!
          </div>
        ) : null}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full border-2 border-accent-gold shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-2 ring-background-dark transition-transform duration-200 hover:scale-110 focus-visible:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold"
          title="Barnabas · Daten-Wirt"
        >
          <Image
            src={PORTRAIT_SRC}
            alt=""
            fill
            sizes="72px"
            className="object-cover"
            priority={false}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </button>
      </div>
    </div>
  );
}
