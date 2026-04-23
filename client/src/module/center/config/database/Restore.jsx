import React, { useState } from "react";
import { Alert, Button, Card, Space, Typography, Upload, message } from "antd";
import { CloudSyncOutlined, InboxOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useRestoreDataMutation } from "../../../../service/center/ApiDatabase";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const Restore = () => {
  const [fileList, setFileList] = useState([]);
  const [restoreData, { isLoading }] = useRestoreDataMutation();

  const handleRestore = async () => {
    if (fileList.length === 0) {
      return message.warning(
        "Silakan upload file backup (.zip) terlebih dahulu",
      );
    }

    const formData = new FormData();
    formData.append("backupFile", fileList[0]);

    try {
      await restoreData(formData).unwrap();
      message.success("Database dan aset berhasil dipulihkan!");
      setFileList([]);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      message.error(error?.data?.message || "Gagal melakukan restore");
    }
  };

  const uploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      const isZip =
        file.type === "application/zip" ||
        file.type === "application/x-zip-compressed" ||
        file.name.endsWith(".zip");

      if (!isZip) {
        message.error(`${file.name} bukan file ZIP!`);
        return Upload.LIST_IGNORE;
      }

      setFileList([file]);
      return false;
    },
    fileList,
    maxCount: 1,
  };

  return (
    <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <Card
        variant="borderless"
        style={{
          height: "100%",
          borderRadius: 22,
          border: "1px solid rgba(148, 163, 184, 0.14)",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: 18 } }}
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <div>
            <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
              Restore Database
            </Title>
            <Text style={{ color: "#64748b" }}>
              Pulihkan database dan aset dari file backup dengan kontrol yang
              lebih aman.
            </Text>
          </div>

          <Alert
            title="Perhatian penting"
            description="Proses restore akan menimpa seluruh data database dan folder aset saat ini dengan isi file backup. Pastikan Anda telah membuat backup terbaru sebelum melanjutkan."
            type="warning"
            showIcon
          />

          <Dragger
            {...uploadProps}
            style={{
              borderRadius: 18,
              paddingBlock: 10,
              background: "#fafafa",
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: "#f59e0b" }} />
            </p>
            <p className="ant-upload-text">
              Klik atau tarik file backup (.zip) ke area ini
            </p>
            <p className="ant-upload-hint">
              Hanya mendukung satu file berekstensi `.zip`
            </p>
          </Dragger>

          <div style={{ textAlign: "right" }}>
            <Button
              type="primary"
              icon={<CloudSyncOutlined />}
              onClick={handleRestore}
              loading={isLoading}
              disabled={fileList.length === 0}
              danger
              style={{ borderRadius: 999, fontWeight: 600 }}
            >
              Mulai Proses Restore
            </Button>
          </div>
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default Restore;
