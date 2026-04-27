import React, { useCallback, useRef } from "react";
import PropTypes from "prop-types";
import ReactQuill, { Quill } from "react-quill-new";
import QuillResizeImage from "quill-resize-image";
import { Input, Space, Typography } from "antd";
import { motion } from "framer-motion";

// Import CSS standar Quill dan KaTeX
import "react-quill-new/dist/quill.snow.css";
import "katex/dist/katex.min.css";
import katex from "katex";

// Pasang katex ke window agar Quill dapat mendeteksinya secara otomatis
window.katex = katex;

// Register module untuk resize gambar
Quill.register("modules/resize", QuillResizeImage);

// Custom Blot untuk Audio (Tetap dipertahankan dari versi sebelumnya)
const AudioBlot = Quill.import("blots/block/embed");
class Audio extends AudioBlot {
  static create(value) {
    const node = super.create();
    node.setAttribute("controls", "");
    node.setAttribute("src", value);
    return node;
  }
  static value(node) {
    return node.getAttribute("src");
  }
}
Audio.blotName = "audio";
Audio.tagName = "audio";
Audio.className = "ql-audio";
Quill.register(Audio);

const MotionDiv = motion.div;

const Editor = ({
  placeholder,
  value,
  onChange,
  height,
  classname,
  variant,
  label,
  helper,
  maxLength,
  showCount,
}) => {
  const isShortAnswer = variant === "short";
  const wrapperHeight = height || (isShortAnswer ? "160px" : "350px");

  const editorHtml = value || "";
  const reactQuillRef = useRef(null);

  const syncValue = useCallback(
    (nextValue) => {
      onChange(nextValue);
    },
    [onChange],
  );

  const handleChange = useCallback(
    (html) => {
      syncValue(html);
    },
    [syncValue],
  );

  const handlePlainChange = useCallback(
    (event) => {
      syncValue(event?.target?.value ?? "");
    },
    [syncValue],
  );

  const handleImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const response = await fetch(`/api/cbt/upload/image`, {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          const editor = reactQuillRef.current?.getEditor();
          if (editor) {
            const range = editor.getSelection(true);
            editor.insertEmbed(range.index, "image", data.url);
          }
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      }
    };
  }, []);

  const handleAudioUpload = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "audio/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const response = await fetch(`/api/cbt/upload/audio`, {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          const editor = reactQuillRef.current?.getEditor();
          if (editor) {
            const range = editor.getSelection(true);
            editor.insertEmbed(range.index, "audio", data.url);
          }
        } catch (error) {
          console.error("Error uploading audio:", error);
        }
      }
    };
  }, []);

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`border-editor ${classname}`}
      style={{
        minHeight: wrapperHeight,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        borderRadius: 12,
        border: "1px solid #e6eaf2",
        background: "#fff",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        padding: 12,
        gap: 8,
      }}
    >
      {(label || helper) && (
        <Space direction='vertical' size={2}>
          {label && (
            <Typography.Text strong style={{ fontSize: 14 }}>
              {label}
            </Typography.Text>
          )}
          {helper && (
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              {helper}
            </Typography.Text>
          )}
        </Space>
      )}

      {isShortAnswer ? (
        <Input.TextArea
          value={editorHtml}
          onChange={handlePlainChange}
          placeholder={placeholder}
          autoSize={{ minRows: 4, maxRows: 8 }}
          maxLength={maxLength}
          showCount={showCount}
          style={{
            minHeight: wrapperHeight,
            borderRadius: 10,
            borderColor: "#e6eaf2",
          }}
        />
      ) : (
        <ReactQuill
          ref={reactQuillRef}
          theme='snow'
          value={editorHtml}
          onChange={handleChange}
          modules={Editor.modules(handleImageUpload, handleAudioUpload)}
          formats={Editor.formats}
          placeholder={placeholder}
          className='react-quill'
          style={{
            minHeight: wrapperHeight,
            display: "flex",
            flexDirection: "column",
            borderRadius: 10,
            overflow: "hidden",
          }}
        />
      )}
    </MotionDiv>
  );
};

Editor.modules = (handleImageUpload, handleAudioUpload) => ({
  toolbar: {
    container: [
      [{ header: "1" }, { header: "2" }, { font: [] }],
      [{ size: [] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],
      ["link", "image", "audio", "video", "formula"],
      ["clean"],
    ],
    handlers: {
      image: handleImageUpload,
      audio: handleAudioUpload,
    },
  },
  clipboard: {
    matchVisual: false,
  },
  resize: {
    modules: ["Resize"],
  },
});

Editor.formats = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "indent",
  "link",
  "image",
  "audio",
  "video",
  "formula",
];

Editor.propTypes = {
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  height: PropTypes.string,
  classname: PropTypes.string,
  variant: PropTypes.string,
  label: PropTypes.string,
  helper: PropTypes.string,
  maxLength: PropTypes.number,
  showCount: PropTypes.bool,
};

export default Editor;
