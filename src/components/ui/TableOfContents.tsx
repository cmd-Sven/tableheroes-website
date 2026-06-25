"use client";

import { useMemo } from "react";
import { normalizeEscapedMarkdown } from "@/src/lib/markdown-normalize";

type TocHeading = {
  id: string;
  level: 1 | 2 | 3;
  text: string;
};

type Props = {
  content: string | null | undefined;
  title?: string;
  className?: string;
};

export function slugifyHeading(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || "abschnitt";
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractMarkdownHeadings(content: string): TocHeading[] {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const match = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line.trim());
      if (!match) return null;
      const text = stripInlineMarkdown(match[2]);
      if (!text) return null;
      return {
        id: slugifyHeading(text),
        level: match[1].length as 1 | 2 | 3,
        text,
      };
    })
    .filter((heading): heading is TocHeading => Boolean(heading));
}

function extractHtmlHeadings(content: string): TocHeading[] {
  if (typeof window === "undefined") return [];

  const doc = new DOMParser().parseFromString(content, "text/html");
  return Array.from(doc.querySelectorAll("h1, h2, h3"))
    .map((node) => {
      const text = node.textContent?.trim() ?? "";
      if (!text) return null;
      const tag = node.tagName.toLowerCase();
      const level = tag === "h1" ? 1 : tag === "h2" ? 2 : 3;
      return {
        id: node.id || slugifyHeading(text),
        level,
        text,
      };
    })
    .filter((heading): heading is TocHeading => Boolean(heading));
}

function extractHeadings(content: string): TocHeading[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  if (/<h[123][\s>]/i.test(trimmed)) return extractHtmlHeadings(trimmed);
  return extractMarkdownHeadings(trimmed);
}

/** Prüft, ob für den Inhalt ein Inhaltsverzeichnis angezeigt werden kann. */
export function hasDocumentHeadings(content: string | null | undefined): boolean {
  return extractHeadings(normalizeEscapedMarkdown(content ?? "")).length > 0;
}

export function TableOfContents({
  content,
  title = "Inhalt",
  className = "",
}: Props) {
  const headings = useMemo(
    () => extractHeadings(normalizeEscapedMarkdown(content ?? "")),
    [content],
  );

  if (headings.length === 0) return null;

  return (
    <nav
      aria-label={title}
      className={`rounded-md border border-hero-border bg-background-card/80 p-4 shadow-lg ${className}`}
    >
      <h2 className="mb-3 font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
        {title}
      </h2>
      <ol className="space-y-1">
        {headings.map((heading, index) => (
          <li
            key={`${heading.id}-${index}`}
            className={
              heading.level === 3 ? "pl-4" : heading.level === 2 ? "pl-2" : ""
            }
          >
            <a
              href={`#${heading.id}`}
              onClick={(event) => {
                event.preventDefault();
                const target = document.getElementById(heading.id);
                target?.scrollIntoView({ behavior: "smooth", block: "start" });
                if (target) {
                  window.history.replaceState(null, "", `#${heading.id}`);
                }
              }}
              className="block rounded px-2 py-1 font-barlow text-xs font-bold uppercase text-gray-300 transition-colors hover:bg-hero-dark/60 hover:text-hero-vibrant"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
