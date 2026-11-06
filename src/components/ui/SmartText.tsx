"use client";

import React, { useMemo, type ImgHTMLAttributes } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeEscapedMarkdown, normalizeMarkdownFlow } from "@/src/lib/markdown-normalize";
import { WIKI_HEADING_CLASS } from "@/src/lib/wiki-heading-styles";
import { slugifyHeading } from "./TableOfContents";

export type EntityForSmartText = {
  id: string;
  name: string;
  type: "npc" | "location" | "faction";
  aliases?: string[];
};

type SmartTextProps = {
  text: string;
  entities: EntityForSmartText[];
  campaignId?: string | null;
  worldId?: string | null;
  emptyMessage?: string;
  className?: string;
  /** Spieler-Chronik: Wiki-Links in neuem Tab öffnen */
  openInNewTab?: boolean;
  /** Größere Markdown-Bilder (z. B. NSC-Beschreibungen). */
  largeImages?: boolean;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildEntityUrl(
  entity: EntityForSmartText,
  campaignId: string | null | undefined,
  worldId: string | null | undefined
): string | null {
  if (entity.type === "npc") {
    if (campaignId) return `/dashboard/campaigns/${campaignId}/npcs/${entity.id}`;
    if (worldId) return `/dashboard/worlds/${worldId}/npcs/${entity.id}`;
  }
  if (entity.type === "location") {
    if (campaignId) return `/dashboard/campaigns/${campaignId}/lore/${entity.id}`;
    if (worldId) return `/dashboard/worlds/${worldId}/lore/${entity.id}`;
  }
  if (entity.type === "faction") {
    if (campaignId) return `/dashboard/campaigns/${campaignId}/factions/${entity.id}`;
    if (worldId) return `/dashboard/worlds/${worldId}/factions/${entity.id}`;
  }
  return null;
}

type MatchTerm = { term: string; entity: EntityForSmartText };

function buildMatchTerms(entities: EntityForSmartText[]): MatchTerm[] {
  const terms: MatchTerm[] = [];
  for (const entity of entities) {
    terms.push({ term: entity.name, entity });
    for (const alias of entity.aliases ?? []) {
      const trimmed = alias.trim();
      if (trimmed && trimmed.toLowerCase() !== entity.name.toLowerCase()) {
        terms.push({ term: trimmed, entity });
      }
    }
  }
  return terms.sort((a, b) => b.term.length - a.term.length);
}

function processTextWithEntities(
  text: string,
  entities: EntityForSmartText[],
  campaignId: string | null | undefined,
  worldId: string | null | undefined,
  openInNewTab: boolean,
): React.ReactNode[] {
  if (!entities.length) return [text];

  const matchTerms = buildMatchTerms(entities).filter((t) => t.term.length >= 3);
  if (!matchTerms.length) return [text];

  const pattern = matchTerms.map((t) => escapeRegex(t.term)).join("|");
  const regex = new RegExp(
    `(?:^|(?<=[^\\w]))(?:${pattern})(?=(?:[^\\w]|$))`,
    "gi"
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(regex.source, "g");

  while ((m = re.exec(text)) !== null) {
    const matched = m[0];
    const lower = matched.toLowerCase();
    const hit = matchTerms.find((t) => t.term.toLowerCase() === lower);
    if (hit) {
      const url = buildEntityUrl(hit.entity, campaignId, worldId);
      if (url) {
        if (m.index > lastIndex) {
          parts.push(text.slice(lastIndex, m.index));
        }
        parts.push(
          <Link
            key={`${hit.entity.id}-${m.index}`}
            href={url}
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            className="text-hero-vibrant underline underline-offset-2 hover:text-hero-vibrant/90"
          >
            {matched}
          </Link>
        );
        lastIndex = m.index + matched.length;
      }
    }
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length ? parts : [text];
}

function processChildren(
  children: React.ReactNode,
  entities: EntityForSmartText[],
  campaignId: string | null | undefined,
  worldId: string | null | undefined,
  insideLink: boolean,
  openInNewTab: boolean,
): React.ReactNode {
  if (insideLink) return children;

  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return processTextWithEntities(
        child,
        entities,
        campaignId,
        worldId,
        openInNewTab,
      );
    }
    if (React.isValidElement(child)) {
      const el = child as React.ReactElement<{ children?: React.ReactNode }>;
      const type = typeof el.type === "string" ? el.type : "";
      if (type === "a") {
        return child;
      }
      if (el.props?.children != null) {
        return React.cloneElement(el, {
          children: processChildren(
            el.props.children,
            entities,
            campaignId,
            worldId,
            type === "a",
            openInNewTab,
          ),
        });
      }
    }
    return child;
  });
}

function childrenToText(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (React.isValidElement(child)) {
        const el = child as React.ReactElement<{ children?: React.ReactNode }>;
        return childrenToText(el.props.children);
      }
      return "";
    })
    .join("");
}

function renderLink({
  href,
  children,
  openInNewTab = false,
}: {
  href?: string;
  children?: React.ReactNode;
  openInNewTab?: boolean;
}) {
  if (!href) return <>{children}</>;
  if (href.startsWith("/")) {
    return (
      <Link
        href={href}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        className="text-hero-vibrant underline hover:text-hero-vibrant/90"
      >
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-hero-vibrant underline hover:text-hero-vibrant/90"
    >
      {children}
    </a>
  );
}

export function SmartText({
  text,
  entities,
  campaignId,
  worldId,
  emptyMessage = "Keine Beschreibung vorhanden.",
  className = "",
  openInNewTab = false,
  largeImages = false,
}: SmartTextProps) {
  const trimmed = normalizeMarkdownFlow(normalizeEscapedMarkdown(text || "")).trim();

  const components = useMemo(() => {
    const createHeading = (tag: "h1" | "h2" | "h3") => {
      return ({ children }: { children?: React.ReactNode }) => {
        const processedChildren = entities.length
          ? processChildren(children, entities, campaignId, worldId, false, openInNewTab)
          : children;
        return React.createElement(tag, {
          id: slugifyHeading(childrenToText(children)),
          className: WIKI_HEADING_CLASS[tag],
        }, processedChildren);
      };
    };
    const createProcessor = (tag: string, insideLink = false) => {
      const Comp = tag as keyof React.JSX.IntrinsicElements;
      return ({ children }: { children?: React.ReactNode }) => {
        const processedChildren = entities.length
          ? processChildren(children, entities, campaignId, worldId, insideLink, openInNewTab)
          : children;
        return React.createElement(Comp, {}, processedChildren);
      };
    };
    return {
      p: createProcessor("p"),
      li: createProcessor("li"),
      td: createProcessor("td"),
      th: createProcessor("th"),
      h1: createHeading("h1"),
      h2: createHeading("h2"),
      h3: createHeading("h3"),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="my-3 border-l-4 border-accent-gold py-0.5 pl-4 text-stone-300">
          {entities.length
            ? processChildren(children, entities, campaignId, worldId, false, openInNewTab)
            : children}
        </blockquote>
      ),
      strong: createProcessor("strong"),
      em: ({ children }: { children?: React.ReactNode }) => (
        <em className="italic text-stone-200">
          {entities.length
            ? processChildren(children, entities, campaignId, worldId, false, openInNewTab)
            : children}
        </em>
      ),
      a: ({
        href,
        children,
      }: {
        href?: string;
        children?: React.ReactNode;
      }) =>
        renderLink({
          href,
          children: entities.length
            ? processChildren(children, entities, campaignId, worldId, true, openInNewTab)
            : children,
          openInNewTab,
        }),
      hr: () => <hr className="my-6 border-hero-border/70" />,
      img: ({ src, alt, ...rest }: ImgHTMLAttributes<HTMLImageElement>) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...rest}
          src={typeof src === "string" ? src : undefined}
          alt={alt ?? ""}
          className={
            largeImages
              ? "my-4 mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl rounded-lg border border-hero-border/60 shadow-lg object-contain"
              : "my-2 max-w-full rounded-md"
          }
        />
      ),
    };
  }, [entities, campaignId, worldId, openInNewTab, largeImages]);

  if (!trimmed) {
    return (
      <p
        className={`font-libre text-[#e5e5e5]/70 leading-relaxed italic ${className}`}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={`lore-rich-text w-full min-w-0 break-words font-libre text-gray-200 leading-[1.8]
        [&_strong]:font-bold [&_strong]:text-white
        [&_ul]:list-disc [&_ul]:pl-6
        [&_ol]:list-decimal [&_ol]:pl-6
        [&_a]:text-hero-vibrant [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-hero-vibrant/90
        ${largeImages ? "" : "[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md"}
        [&_hr]:my-6 [&_hr]:border-hero-border/70
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
