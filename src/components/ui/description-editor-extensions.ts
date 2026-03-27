import StarterKit from "@tiptap/starter-kit";
import {
  TextStyle,
  Color,
  FontFamily,
  FontSize,
} from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";

/** Gemeinsame TipTap-Konfiguration für Kampagnen-Beschreibung (Rich Text). */
export const descriptionEditorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  TextStyle.configure({ mergeNestedSpanStyles: true }),
  Color.configure({ types: ["textStyle"] }),
  FontFamily.configure({ types: ["textStyle"] }),
  FontSize.configure({ types: ["textStyle"] }),
  TextAlign.configure({
    types: ["heading", "paragraph", "image"],
  }),
  Image.configure({
    inline: true,
    allowBase64: false,
    HTMLAttributes: {
      class: "max-w-full h-auto rounded-md align-middle",
    },
  }),
];

export const DESCRIPTION_EDITOR_FONT_OPTIONS: { label: string; value: string }[] =
  [
    { label: "Libre Baskerville", value: "'Libre Baskerville', serif" },
    { label: "Barlow Condensed", value: "'Barlow Condensed', sans-serif" },
    { label: "Cinzel", value: "'Cinzel', serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "System Sans", value: "ui-sans-serif, system-ui, sans-serif" },
  ];

export const DESCRIPTION_EDITOR_SIZE_OPTIONS = [
  "12px",
  "14px",
  "16px",
  "18px",
  "22px",
  "28px",
  "36px",
];
