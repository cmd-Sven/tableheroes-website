import sanitizeHtml from "sanitize-html";

/**
 * Erlaubt Rich-Text aus TipTap (Überschriften, Absätze, Listen, Zitate, Bilder,
 * Farben, Schriftgröße, Schriftart, Ausrichtung) mit XSS-Schutz.
 */
export function sanitizeDescriptionHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "p",
      "br",
      "hr",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "del",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "span",
      "div",
      "figure",
      "figcaption",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "class"],
      img: ["src", "alt", "width", "height", "title", "class"],
      span: ["style", "class"],
      p: ["style", "class"],
      h1: ["style", "class"],
      h2: ["style", "class"],
      h3: ["style", "class"],
      div: ["style", "class"],
      figure: ["class"],
      figcaption: ["class"],
      blockquote: ["class"],
      code: ["class"],
      pre: ["class"],
      li: ["class"],
      ul: ["class"],
      ol: ["class"],
    },
    allowedStyles: {
      "*": {
        color: [
          /^#(?:[0-9a-fA-F]{3,8})$/,
          /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,
          /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/,
        ],
        "background-color": [
          /^#(?:[0-9a-fA-F]{3,8})$/,
          /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,
          /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/,
          /^transparent$/,
        ],
        "font-size": [/^\d{1,2}(?:\.\d+)?(?:px|rem|em)$/],
        "font-family": [
          /^['"]Barlow Condensed['"],\s*sans-serif$/i,
          /^['"]Cinzel['"],\s*serif$/i,
          /^['"]Libre Baskerville['"],\s*serif$/i,
          /^Georgia,?\s*serif$/i,
          /^ui-sans-serif,?\s*system-ui,?\s*sans-serif$/i,
          /^ui-serif,?\s*Georgia,?\s*serif$/i,
          /^[\w\s,.'"-]{1,200}$/,
        ],
        "text-align": [/^(?:left|right|center|justify)$/],
        float: [/^(?:left|right|none)$/],
        display: [/^(?:block|inline|inline-block)$/],
        "max-width": [/^\d{1,4}(?:px|%)$/],
        width: [/^\d{1,4}(?:px|%)$/],
        margin: [
          /^0$/,
          /^\d{1,3}px$/,
          /^\d{1,3}px\s+\d{1,3}px$/,
          /^\d{1,3}px\s+auto$/,
          /^auto\s+\d{1,3}px$/,
        ],
        "vertical-align": [/^(?:top|middle|bottom|baseline)$/],
      },
    },
    allowedSchemesByTag: {
      img: ["http", "https"],
      a: ["http", "https", "mailto"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        const next = { ...attribs };
        if (next.target === "_blank") {
          next.rel = "noopener noreferrer";
        }
        return { tagName, attribs: next };
      },
    },
  });
}
