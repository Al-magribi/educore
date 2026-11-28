import React, { useMemo, useRef } from "react";
import ReactQuill from "react-quill-new";
import { Button, Flex, Tooltip, message } from "antd";
import {
  Columns3,
  Rows3,
  Table2,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
} from "lucide-react";
import "react-quill-new/dist/quill.snow.css";
import { useUploadTeachingModuleImageMutation } from "../../../service/lms/ApiTeachingModule";

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
  [{ align: [] }],
  ["link", "image"],
  ["clean"],
];

const FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "indent",
  "align",
  "link",
  "image",
  "table",
];

const TABLE_ACTIONS = [
  {
    key: "insert",
    title: "Sisipkan tabel 3x3",
    icon: Table2,
    run: (table) => table.insertTable(3, 3),
    requiresCell: false,
  },
  {
    key: "row",
    title: "Tambah baris di bawah",
    icon: Rows3,
    run: (table) => table.insertRowBelow(),
  },
  {
    key: "column",
    title: "Tambah kolom di kanan",
    icon: Columns3,
    run: (table) => table.insertColumnRight(),
  },
  {
    key: "delete-row",
    title: "Hapus baris",
    icon: TableRowsSplit,
    run: (table) => table.deleteRow(),
  },
  {
    key: "delete-column",
    title: "Hapus kolom",
    icon: TableColumnsSplit,
    run: (table) => table.deleteColumn(),
  },
  {
    key: "delete-table",
    title: "Hapus tabel",
    icon: Trash2,
    run: (table) => table.deleteTable(),
    danger: true,
  },
];

const ModuleRichEditor = ({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  allowTable = true,
}) => {
  const quillRef = useRef(null);
  const [uploadImage] = useUploadTeachingModuleImageMutation();

  const modules = useMemo(
    () => ({
      table: allowTable,
      toolbar: {
        container: TOOLBAR,
        handlers: {
          image() {
            const quill = this.quill;
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/png,image/jpeg,image/webp";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              try {
                const formData = new FormData();
                formData.append("file", file);
                const response = await uploadImage(formData).unwrap();
                const range = quill.getSelection(true);
                quill.insertEmbed(
                  range?.index ?? quill.getLength(),
                  "image",
                  response?.data?.url,
                  "user",
                );
              } catch (error) {
                message.error(error?.data?.message || "Gagal upload gambar.");
              }
            };
            input.click();
          },
        },
      },
      clipboard: { matchVisual: false },
    }),
    [allowTable, uploadImage],
  );

  const runTableAction = (action) => {
    const quill = quillRef.current?.getEditor();
    const table = quill?.getModule("table");
    if (!table) return;
    if (action.requiresCell !== false) {
      const [cell] = table.getTable();
      if (!cell) {
        message.info("Letakkan kursor di dalam tabel terlebih dahulu.");
        return;
      }
    }
    action.run(table);
  };

  return (
    <div className='module-rich-editor'>
      {allowTable ? (
        <Flex gap={4} wrap='wrap' className='module-rich-editor__table-bar'>
          {TABLE_ACTIONS.map((action) => (
            <Tooltip key={action.key} title={action.title}>
              <Button
                size='small'
                type='text'
                danger={action.danger}
                icon={<action.icon size={15} />}
                // Jaga fokus & seleksi Quill agar aksi tabel tahu sel aktifnya.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runTableAction(action)}
              />
            </Tooltip>
          ))}
        </Flex>
      ) : null}
      <ReactQuill
        ref={quillRef}
        theme='snow'
        value={value || ""}
        onChange={(html) => onChange?.(html)}
        modules={modules}
        formats={FORMATS}
        placeholder={placeholder}
      />
      <style>{`
        .module-rich-editor {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
        }
        .module-rich-editor__table-bar {
          padding: 4px 8px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .module-rich-editor .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid #e2e8f0;
        }
        .module-rich-editor .ql-container.ql-snow {
          border: none;
          font-size: 14px;
        }
        .module-rich-editor .ql-editor {
          min-height: ${minHeight}px;
        }
        .module-rich-editor .ql-editor table {
          border-collapse: collapse;
          width: 100%;
        }
        .module-rich-editor .ql-editor td {
          border: 1px solid #cbd5e1;
          padding: 4px 6px;
          min-width: 40px;
        }
        .module-rich-editor .ql-editor img {
          max-width: 100%;
        }
      `}</style>
    </div>
  );
};

export default ModuleRichEditor;
