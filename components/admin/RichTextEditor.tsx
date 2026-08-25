"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough,
  faListUl,
  faListOl,
  faQuoteLeft,
  faLink,
  faRotateLeft,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";

export type RichTextEditorHandle = {
  setContent: (html: string) => void;
};

const toolbarButtonClass = (active: boolean) =>
  `flex h-7 w-7 items-center justify-center rounded text-sm transition-colors ${
    active
      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
  }`;

const RichTextEditor = forwardRef<RichTextEditorHandle, { name: string; defaultValue?: string; placeholder?: string }>(
  function RichTextEditor({ name, defaultValue, placeholder }, ref) {
    const [html, setHtml] = useState(defaultValue ?? "");

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
        }),
        Placeholder.configure({ placeholder: placeholder ?? "Schrijf hier..." }),
      ],
      content: defaultValue ?? "",
      immediatelyRender: false,
      onUpdate: ({ editor }) => setHtml(editor.getHTML()),
      editorProps: {
        attributes: {
          class:
            "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[160px] px-3 py-2 text-zinc-900 dark:text-white",
        },
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        setContent: (nextHtml: string) => {
          editor?.commands.setContent(nextHtml);
          setHtml(nextHtml);
        },
      }),
      [editor],
    );

    function toggleLink() {
      if (!editor) return;
      const previousUrl = editor.getAttributes("link").href as string | undefined;
      const url = window.prompt("Link URL (leeg laten om te verwijderen)", previousUrl ?? "https://");
      if (url === null) return;
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }

    if (!editor) return null;

    const buttons: { icon?: typeof faBold; label?: string; active: boolean; onClick: () => void; title: string }[] = [
      { icon: faBold, active: editor.isActive("bold"), onClick: () => editor.chain().focus().toggleBold().run(), title: "Vet" },
      {
        icon: faItalic,
        active: editor.isActive("italic"),
        onClick: () => editor.chain().focus().toggleItalic().run(),
        title: "Cursief",
      },
      {
        icon: faUnderline,
        active: editor.isActive("underline"),
        onClick: () => editor.chain().focus().toggleUnderline().run(),
        title: "Onderstreept",
      },
      {
        icon: faStrikethrough,
        active: editor.isActive("strike"),
        onClick: () => editor.chain().focus().toggleStrike().run(),
        title: "Doorhalen",
      },
      {
        label: "H2",
        active: editor.isActive("heading", { level: 2 }),
        onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        title: "Kop 2",
      },
      {
        label: "H3",
        active: editor.isActive("heading", { level: 3 }),
        onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        title: "Kop 3",
      },
      {
        icon: faListUl,
        active: editor.isActive("bulletList"),
        onClick: () => editor.chain().focus().toggleBulletList().run(),
        title: "Opsomming",
      },
      {
        icon: faListOl,
        active: editor.isActive("orderedList"),
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
        title: "Genummerde lijst",
      },
      {
        icon: faQuoteLeft,
        active: editor.isActive("blockquote"),
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
        title: "Citaat",
      },
      { icon: faLink, active: editor.isActive("link"), onClick: toggleLink, title: "Link" },
      { icon: faRotateLeft, active: false, onClick: () => editor.chain().focus().undo().run(), title: "Ongedaan maken" },
      { icon: faRotateRight, active: false, onClick: () => editor.chain().focus().redo().run(), title: "Opnieuw" },
    ];

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 p-1.5 dark:border-zinc-700">
          {buttons.map((button, index) => (
            <button
              key={index}
              type="button"
              title={button.title}
              onClick={button.onClick}
              className={toolbarButtonClass(button.active)}
            >
              {button.icon ? <FontAwesomeIcon icon={button.icon} className="h-3.5 w-3.5" /> : button.label}
            </button>
          ))}
        </div>
        <EditorContent editor={editor} />
        <input type="hidden" name={name} value={html} readOnly />
      </div>
    );
  },
);

export default RichTextEditor;
