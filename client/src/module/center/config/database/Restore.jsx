import React, { useState } from "react";
import { Alert, Button, Grid, Popconfirm, Select, Space, message } from "antd";
import { CloudSyncOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  useGetBackupsQuery,
  useRestoreDataMutation,
} from "../../../../service/center/ApiDatabase";
import { CardTitle, MuseCard } from "../../../../components/ui/muse";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const Restore = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
    <MotionDiv
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ width: "100%", minWidth: 0 }}
    >
      <MuseCard
        title={
          <CardTitle
            title="Restore Database"
            description={
              isMobile
                ? "Pulihkan database & assets dari folder backup."
                : "Pulihkan semua schema database dan folder assets dari folder backup di server."
            }
          />
        }
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            title="Perhatian penting"
            description={
              isMobile
                ? "Restore akan menimpa seluruh schema database dan folder assets saat ini."
                : "Proses restore akan menimpa seluruh schema database dan mengganti isi folder assets saat ini dengan isi folder backup. Pastikan Anda memilih backup yang benar sebelum melanjutkan."
            }
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
            aria-label="Pilih folder backup"
            style={{ width: "100%", maxWidth: 480 }}
          />

          <div style={{ textAlign: isMobile ? "left" : "right", width: "100%" }}>
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
                block={isMobile}
              >
                {isMobile ? "Mulai Restore" : "Mulai Proses Restore"}
              </Button>
            </Popconfirm>
          </div>
        </Space>
      </MuseCard>
    </MotionDiv>
  );
};

export default Restore;
