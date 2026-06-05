"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { normalizeEscapedMarkdown } from "@/src/lib/markdown-normalize";
import { slugifyHeading } from "./TableOfContents";

export type EntityForSmartText = {
  id: string;
  name: string;
  type: "npc" | "location" | "faction";
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
  }
  return null;
}

function processTextWithEntities(
  text: string,
  entities: EntityForSmartText[],
  campaignId: string | null | undefined,
  worldId: string | null | undefined,
  openInNewTab: boolean,
): React.ReactNode[] {
  if (!entities.length) return [text];

  const sortedEntities = [...entities].sort(
    (a, b) => b.name.length - a.name.length
  );
  const pattern = sortedEntities
    .map((e) => escapeRegex(e.name))
    .join("|");
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
    const entity = sortedEntities.find(
      (e) => e.name.toLowerCase() === lower
    );
    if (entity) {
      const url = buildEntityUrl(entity, campaignId, worldId);
      if (url) {
        if (m.index > lastIndex) {
          parts.push(text.slice(lastIndex, m.index));
        }
        parts.push(
          <Link
            key={`${entity.id}-${m.index}`}
            href={url}
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            className="text-hero-vibrant underline hover:text-hero-vibrant/90"
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
}: SmartTextProps) {
  const trimmed = normalizeEscapedMarkdown(text || "").trim();

  const components = useMemo(() => {
    const createProcessor = (tag: string, withId = false, insideLink = false) => {
      const Comp = tag as keyof React.JSX.IntrinsicElements;
      return ({ children }: { children?: React.ReactNode }) => {
        const props: { id?: string } = {};
        if (withId) {
          props.id = slugifyHeading(childrenToText(children));
        }
        const processedChildren = entities.length
          ? processChildren(children, entities, campaignId, worldId, insideLink, openInNewTab)
          : children;
        return React.createElement(Comp, props, processedChildren);
      };
    };
    return {
      p: createProcessor("p"),
      li: createProcessor("li"),
      td: createProcessor("td"),
      th: createProcessor("th"),
      h1: createProcessor("h1", true),
      h2: createProcessor("h2", true),
      h3: createProcessor("h3", true),
      blockquote: createProcessor("blockquote"),
      strong: createProcessor("strong"),
      em: createProcessor("em"),
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
    };
  }, [entities, campaignId, worldId, openInNewTab]);

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
      className={`font-libre text-[#e5e5e5] leading-relaxed prose prose-invert max-w-none
        prose-p:my-2 prose-p:leading-relaxed
        prose-headings:font-barlow prose-headings:text-accent-blood prose-headings:border-b prose-headings:border-hero-border prose-headings:pb-2 prose-headings:mb-2 prose-headings:mt-4
        prose-h1:text-2xl prose-h1:font-semibold
        prose-h2:text-xl prose-h2:font-semibold
        prose-h3:text-lg prose-h3:font-medium prose-h3:text-accent-gold
        prose-strong:text-white prose-strong:font-bold
        prose-em:text-gray-300 prose-em:italic
        prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-1
        prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-1
        prose-blockquote:border-l-4 prose-blockquote:border-accent-gold prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-300 prose-blockquote:my-3
        prose-a:text-hero-vibrant prose-a:hover:underline
        prose-img:rounded-md prose-img:max-w-full prose-img:my-2
        prose-hr:border-hero-border/70 prose-hr:my-6
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
