import React, { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Popconfirm,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { CloudSyncOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  useGetBackupsQuery,
  useRestoreDataMutation,
} from "../../../../service/center/ApiDatabase";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const Restore = () => {
  const [selectedBackup, setSelectedBackup] = useState(null);
  const { data: backups = [], isLoading: isLoadingBackups } =
    useGetBackupsQuery();
  const [restoreData, { isLoading }] = useRestoreDataMutation();

  const handleRestore = async () => {
    if (!selectedBackup) {
      return message.warning("Silakan pilih folder backup terlebih dahulu");
    }

    try {
      await restoreData(selectedBackup).unwrap();
      message.success("Semua schema database dan assets berhasil dipulihkan!");
      setSelectedBackup(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      message.error(error?.data?.message || "Gagal melakukan restore");
    }
  };

  const backupOptions = backups.map((backup) => ({
    label: `${backup.name} (${backup.size})`,
    value: backup.name,
  }));

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
              Pulihkan semua schema database dan folder assets dari folder
              backup yang tersimpan di server.
            </Text>
          </div>

          <Alert
            title="Perhatian penting"
            description="Proses restore akan menimpa seluruh schema database dan mengganti isi folder assets saat ini dengan isi folder backup. Pastikan Anda memilih backup yang benar sebelum melanjutkan."
            type="warning"
            showIcon
          />

          <Select
            showSearch
            allowClear
            loading={isLoadingBackups}
            options={backupOptions}
            value={selectedBackup}
            onChange={setSelectedBackup}
            placeholder="Pilih folder backup"
            optionFilterProp="label"
            style={{
              width: "100%",
            }}
          />

          <div style={{ textAlign: "right" }}>
            <Popconfirm
              title="Mulai Restore?"
              description="Database dan assets saat ini akan diganti dengan isi backup terpilih."
              onConfirm={handleRestore}
              okText="Restore"
              cancelText="Batal"
              okButtonProps={{ danger: true }}
              disabled={!selectedBackup}
            >
              <Button
                type="primary"
                icon={<CloudSyncOutlined />}
                loading={isLoading}
                disabled={!selectedBackup}
                danger
                style={{ borderRadius: 999, fontWeight: 600 }}
              >
                Mulai Proses Restore
              </Button>
            </Popconfirm>
          </div>
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default Restore;
