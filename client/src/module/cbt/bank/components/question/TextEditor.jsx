import React, { Component } from "react";
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

class Editor extends Component {
  constructor(props) {
    super(props);
    this.state = { editorHtml: props.value || "" };
    this.reactQuillRef = React.createRef();
  }

  handleChange = (html) => {
    this.setState({ editorHtml: html });
    this.props.onChange(html);
  };

  handlePlainChange = (event) => {
    const value = event?.target?.value ?? "";
    this.setState({ editorHtml: value });
    this.props.onChange(value);
  };

  componentDidUpdate(prevProps) {
    if (prevProps.value !== this.props.value) {
      this.setState({ editorHtml: this.props.value });
    }
  }

  handleImageUpload = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const response = await fetch(`/api/cbt/upload/image`, {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          const editor = this.reactQuillRef.current?.getEditor();
          if (editor) {
            const range = editor.getSelection(true);
            editor.insertEmbed(range.index, "image", data.url);
          }
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      }
    };
  };

  handleAudioUpload = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "audio/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const response = await fetch(`/api/cbt/upload/audio`, {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          const editor = this.reactQuillRef.current?.getEditor();
          if (editor) {
            const range = editor.getSelection(true);
            editor.insertEmbed(range.index, "audio", data.url);
          }
        } catch (error) {
          console.error("Error uploading audio:", error);
        }
      }
    };
  };

  render() {
    const {
      placeholder,
      height,
      classname,
      variant,
      label,
      helper,
      maxLength,
      showCount,
    } = this.props;
    const isShortAnswer = variant === "short";
    const wrapperHeight = height || (isShortAnswer ? "160px" : "350px");

    return (
      <motion.div
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
          <Space direction="vertical" size={2}>
            {label && (
              <Typography.Text strong style={{ fontSize: 14 }}>
                {label}
              </Typography.Text>
            )}
            {helper && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {helper}
              </Typography.Text>
            )}
          </Space>
        )}

        {isShortAnswer ? (
          <Input.TextArea
            value={this.state.editorHtml}
            onChange={this.handlePlainChange}
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
            ref={this.reactQuillRef}
            theme="snow"
            value={this.state.editorHtml}
            onChange={this.handleChange}
            modules={Editor.modules(
              this.handleImageUpload,
              this.handleAudioUpload,
            )}
            formats={Editor.formats}
            placeholder={placeholder}
            className="react-quill"
            style={{
              minHeight: wrapperHeight,
              display: "flex",
              flexDirection: "column",
              borderRadius: 10,
              overflow: "hidden",
            }}
          />
        )}
      </motion.div>
    );
  }
}

Editor.modules = (handleImageUpload, handleAudioUpload) => {
  return {
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
        // Tombol 'formula' ditambahkan di sini
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
  };
};

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
