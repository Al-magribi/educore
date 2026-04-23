import React, { useState } from "react";
import { Button, Card, Image, Input, Space, Typography, Upload, message } from "antd";
import { LoadingOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useUploadConfigImageMutation } from "../../../../service/center/ApiApp";

const { TextArea } = Input;
const { Text } = Typography;
const MotionDiv = motion.div;

const ConfigInput = ({ type, placeholder, value, onChange, ...props }) => {
  const [uploadImage] = useUploadConfigImageMutation();
  const [loading, setLoading] = useState(false);

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await uploadImage(formData).unwrap();
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

  if (type === "image") {
    return (
      <MotionDiv
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          variant="borderless"
          style={{
            borderRadius: 18,
            border: "1px dashed #cbd5e1",
            background: "#f8fafc",
          }}
          styles={{ body: { padding: 16 } }}
        >
          <Space
            wrap
            size={[16, 16]}
            style={{ width: "100%", alignItems: "center" }}
          >
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 18,
                border: "1px solid #dbeafe",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                background: "#fff",
                flexShrink: 0,
              }}
            >
              {loading ? (
                <LoadingOutlined style={{ fontSize: 24, color: "#2563eb" }} />
              ) : value ? (
                <Image
                  src={value}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  fallback="https://via.placeholder.com/80?text=Error"
                />
              ) : (
                <PictureOutlined style={{ fontSize: 24, color: "#94a3b8" }} />
              )}
            </div>

            <Space orientation="vertical" size={8}>
              <Upload
                customRequest={handleUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={loading}
                  style={{ borderRadius: 999 }}
                >
                  {value ? "Ganti Gambar" : "Pilih Gambar"}
                </Button>
              </Upload>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                Format yang disarankan: PNG, JPG, atau WEBP.
              </Text>
            </Space>
          </Space>
        </Card>
      </MotionDiv>
    );
  }

  if (type === "text") {
    return (
      <TextArea
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ borderRadius: 14 }}
        {...props}
      />
    );
  }

  if (type === "password") {
    return (
      <Input.Password
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ borderRadius: 14 }}
        {...props}
      />
    );
  }

  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ borderRadius: 14 }}
      {...props}
    />
  );
};

export default ConfigInput;
