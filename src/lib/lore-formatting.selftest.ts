/**
 * Lore-Formatierung: harte Umbrüche lassen sich in eigene Absätze teilen,
 * und gespeichertes Markdown rendert H2, Zitat und Kursiv als eigene Elemente.
 * Run: npx tsx src/lib/lore-formatting.selftest.ts
 */
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { normalizeEscapedMarkdown, normalizeMarkdownFlow } from "./markdown-normalize";
import { splitHardBreaksInSelection } from "./split-hard-breaks";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "inline*",
      group: "block",
    },
    text: { group: "inline" },
    hardBreak: {
      inline: true,
      group: "inline",
      atom: true,
    },
  },
  marks: {
    italic: {},
  },
});

function paragraphWithBreaks() {
  const italic = schema.marks.italic.create();
  return schema.nodes.paragraph.create(null, [
    schema.text("Alpha"),
    schema.nodes.hardBreak.create(),
    schema.text("Beta", [italic]),
    schema.nodes.hardBreak.create(),
    schema.text("Gamma"),
  ]);
}

function renderMarkdown(source: string): string {
  const prepared = normalizeMarkdownFlow(normalizeEscapedMarkdown(source));
  return renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkGfm] },
      prepared,
    ),
  );
}

function run() {
  const doc = schema.nodes.doc.create(null, [paragraphWithBreaks()]);
  // Absatz startet bei 1: "Alpha"(5) + hardBreak(1) => "Beta" liegt bei 7..11
  let state = EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, 7, 11),
  });

  const tr = state.tr;
  assert.equal(splitHardBreaksInSelection(tr), true);
  state = state.apply(tr);

  assert.equal(state.doc.childCount, 3);
  assert.equal(state.doc.child(0).textContent, "Alpha");
  assert.equal(state.doc.child(1).textContent, "Beta");
  assert.equal(state.doc.child(2).textContent, "Gamma");
  assert.equal(state.doc.child(1).firstChild?.marks.some((mark) => mark.type.name === "italic"), true);
  assert.equal(state.selection.$from.parent.textContent, "Beta");

  const plain = schema.nodes.doc.create(null, [
    schema.nodes.paragraph.create(null, [schema.text("Nur ein Absatz")]),
  ]);
  const plainState = EditorState.create({ schema, doc: plain });
  assert.equal(splitHardBreaksInSelection(plainState.tr), false);

  const quoted = renderMarkdown("> *Alpha beta.* \\\n> \\\n> Gamma \\\n");
  assert.match(quoted, /<blockquote>/);
  assert.match(quoted, /<em>Alpha beta\.<\/em>/);
  assert.match(quoted, /Gamma/);

  const heading = renderMarkdown("> Einstieg\n\n## Kapitel\n\nFliesstext *kursiv*\n");
  assert.match(heading, /<h2>Kapitel<\/h2>/);
  assert.match(heading, /<blockquote>/);
  assert.match(heading, /<em>kursiv<\/em>/);

  const insideQuote = renderMarkdown("> ## Kapitel\n>\n> Folgezeile\n");
  assert.match(insideQuote, /<blockquote>[\s\S]*<h2>Kapitel<\/h2>[\s\S]*Folgezeile[\s\S]*<\/blockquote>/);
}

run();
console.log("lore-formatting.selftest ok");
process.exit(0);
