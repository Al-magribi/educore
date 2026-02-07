import { useState } from "react";
import { Card, Upload, Button, message, Typography, Alert, Steps } from "antd";
import { InboxOutlined, CloudSyncOutlined } from "@ant-design/icons";
import { useRestoreDataMutation } from "../../../../service/center/ApiDatabase";

const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

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
      message.success("Database dan Aset berhasil dipulihkan!");
      setFileList([]);
      // Reload halaman agar data baru ter-load sempurna (opsional tapi disarankan untuk restore DB)
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      message.error(error?.data?.message || "Gagal melakukan restore");
    }
  };

  const uploadProps = {
    onRemove: (file) => {
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
      return false; // Prevent auto upload
    },
    fileList,
    maxCount: 1,
  };

  return (
    <Card title="Restore Database" style={{ height: "100%" }}>
      <Alert
        title="Perhatian!"
        description="Proses restore akan menimpa seluruh data database dan folder assets saat ini dengan data dari file backup. Pastikan Anda telah membackup data terkini sebelum melanjutkan."
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Dragger {...uploadProps} style={{ marginBottom: 24 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ color: "#faad14" }} />
        </p>
        <p className="ant-upload-text">
          Klik atau tarik file backup (.zip) ke area ini
        </p>
        <p className="ant-upload-hint">
          Hanya mendukung satu file berekstensi .zip
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
        >
          Mulai Proses Restore
        </Button>
      </div>
    </Card>
  );
};

export default Restore;
