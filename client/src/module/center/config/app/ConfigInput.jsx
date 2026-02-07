import React, { useState } from "react";
import { Input, Upload, Button, Image, message } from "antd";
import { UploadOutlined, LoadingOutlined } from "@ant-design/icons";
import { useUploadConfigImageMutation } from "../../../../service/center/ApiApp";

const { TextArea } = Input;

// Props 'value' dan 'onChange' otomatis dikirim oleh Form.Item Ant Design
const ConfigInput = ({ type, placeholder, value, onChange, ...props }) => {
  const [uploadImage] = useUploadConfigImageMutation();
  const [loading, setLoading] = useState(false);

  // --- LOGIKA UPLOAD ---
  const handleUpload = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Kirim file ke backend
      const response = await uploadImage(formData).unwrap();

      // 2. Jika sukses, panggil onChange parent (Form.Item) dengan URL baru
      // Ini akan memperbarui value di form "App.jsx" secara otomatis
      onChange(response.url);

      message.success("Upload berhasil!");
      onSuccess("Ok");
    } catch (err) {
      console.error(err);
      message.error("Gagal mengupload gambar.");
      onError({ err });
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER COMPONENT BERDASARKAN TIPE ---

  // 1. Tipe IMAGE (Logo, Favicon, OG Image)
  if (type === "image") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Preview Image */}
        <div
          style={{
            width: 80,
            height: 80,
            border: "1px dashed #d9d9d9",
            borderRadius: 8,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            background: "#fafafa",
            flexShrink: 0, // Mencegah gambar mengecil
          }}
        >
          {loading ? (
            <LoadingOutlined style={{ fontSize: 24, color: "#1890ff" }} />
          ) : value ? (
            <Image
              src={value}
              alt="preview"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              fallback="https://via.placeholder.com/80?text=Error"
            />
          ) : (
            <span style={{ fontSize: 10, color: "#ccc" }}>No Image</span>
          )}
        </div>

        {/* Tombol Upload (Input text URL dihapus) */}
        <div>
          <Upload
            customRequest={handleUpload}
            showUploadList={false}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />} loading={loading}>
              {value ? "Ganti Gambar" : "Pilih Gambar"}
            </Button>
          </Upload>
          <div style={{ marginTop: 4, fontSize: 12, color: "#888" }}>
            Format: PNG, JPG, WEBP
          </div>
        </div>
      </div>
    );
  }

  // 2. Tipe TEXT/TEXTAREA
  if (type === "text") {
    return (
      <TextArea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
    );
  }

  // 3. Tipe PASSWORD
  if (type === "password") {
    return (
      <Input.Password
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
    );
  }

  // Default Input (String, Number, dll)
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
};

export default ConfigInput;
