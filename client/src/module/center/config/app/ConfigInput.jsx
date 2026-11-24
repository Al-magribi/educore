import React, { useState } from "react";
import { Button, Flex, Grid, Image, Input, Space, Typography, Upload, message } from "antd";
import { LoadingOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useUploadConfigImageMutation } from "../../../../service/center/ApiApp";
import { museColors, museRadius } from "../../../../config/theme";

const { TextArea } = Input;
const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const ConfigInput = ({ type, placeholder, value, onChange, ...props }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
        style={{ width: "100%", minWidth: 0 }}
      >
        <div
          style={{
            borderRadius: museRadius.item,
            border: `1px dashed ${museColors.border}`,
            background: museColors.bgLayout,
            padding: isMobile ? 12 : 16,
            width: "100%",
            minWidth: 0,
          }}
        >
          <Flex
            wrap="wrap"
            gap={isMobile ? 12 : 16}
            align="center"
            style={{ width: "100%", minWidth: 0 }}
          >
            <div
              style={{
                width: isMobile ? 72 : 92,
                height: isMobile ? 72 : 92,
                borderRadius: museRadius.item,
                border: `1px solid ${museColors.divider}`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                background: "#fff",
                flexShrink: 0,
              }}
            >
              {loading ? (
                <LoadingOutlined style={{ fontSize: 24, color: museColors.primary }} />
              ) : value ? (
                <Image
                  src={value}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  alt="Pratinjau gambar konfigurasi"
                />
              ) : (
                <PictureOutlined style={{ fontSize: 24, color: museColors.muted }} />
              )}
            </div>

            <Space orientation="vertical" size={8} style={{ flex: 1, minWidth: 0 }}>
              <Upload
                customRequest={handleUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={loading}
                  block={isMobile}
                >
                  {value ? "Ganti Gambar" : "Pilih Gambar"}
                </Button>
              </Upload>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {isMobile
                  ? "PNG, JPG, atau WEBP."
                  : "Format yang disarankan: PNG, JPG, atau WEBP."}
              </Text>
            </Space>
          </Flex>
        </div>
      </MotionDiv>
    );
  }

  if (type === "text") {
    return (
      <TextArea
        rows={isMobile ? 3 : 4}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ width: "100%" }}
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
        style={{ width: "100%" }}
        {...props}
      />
    );
  }

  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ width: "100%" }}
      {...props}
    />
  );
};

export default ConfigInput;
