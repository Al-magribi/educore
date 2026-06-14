"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
      Memuat editor...
    </div>
  ),
});

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ align: [] }],
  ["blockquote", "link"],
  ["clean"],
];

/**
 * @param {{
 *   value: string;
 *   onChange: (html: string) => void;
 *   placeholder?: string;
 *   editorKey?: string;
 * }} props
 */
export function NewsRichTextEditor({ value, onChange, placeholder, editorKey = "default" }) {
  const modules = useMemo(
    () => ({
      toolbar: TOOLBAR,
      clipboard: { matchVisual: false },
    }),
    []
  );

  const formats = useMemo(
    () => [
      "header",
      "bold",
      "italic",
      "underline",
      "strike",
      "color",
      "background",
      "list",
      "indent",
      "align",
      "blockquote",
      "link",
    ],
    []
  );

  return (
    <div className="admin-quill">
      <ReactQuill
        key={editorKey}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder ?? "Tulis isi berita di sini..."}
      />
    </div>
  );
}
