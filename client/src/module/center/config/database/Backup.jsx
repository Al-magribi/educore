import React, { useState } from "react";
import {
  Button,
  Empty,
  Flex,
  Grid,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  useCreateBackupMutation,
  useDeleteBackupMutation,
  useDownloadBackupMutation,
  useGetBackupsQuery,
} from "../../../../service/center/ApiDatabase";
import { formatDate } from "../../../../utils/helper";
import { CardTitle, IconBox, MuseCard } from "../../../../components/ui/muse";
import { museColors, museRadius } from "../../../../config/theme";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const triggerBrowserDownload = (blob, filename) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};

const DeleteBackupButton = ({ record, onDelete, isDeleting, block = false }) => (
  <Popconfirm
    title="Hapus Backup?"
    description="Folder backup yang dihapus tidak dapat dikembalikan."
    onConfirm={() => onDelete(record.name)}
    okText="Hapus"
    cancelText="Batal"
    okButtonProps={{ danger: true }}
  >
    <Button
      danger
      icon={<DeleteOutlined />}
      size="small"
      loading={isDeleting}
      block={block}
      aria-label={block ? undefined : "Hapus backup"}
    >
      {block ? "Hapus" : null}
    </Button>
  </Popconfirm>
);

const DownloadBackupButton = ({
  record,
  onDownload,
  isDownloading,
  block = false,
}) => (
  <Button
    icon={<DownloadOutlined />}
    size="small"
    loading={isDownloading}
    onClick={() => onDownload(record.name)}
    block={block}
    aria-label={block ? undefined : "Unduh backup"}
  >
    {block ? "Unduh" : null}
  </Button>
);

const BackupFolderCell = ({ record, isMobile }) => (
  <Flex align="flex-start" gap={isMobile ? 10 : 12} style={{ minWidth: 0, width: "100%" }}>
    <IconBox icon={<FolderOpenOutlined />} size={isMobile ? 32 : 40} />
    <Space orientation="vertical" size={4} style={{ minWidth: 0, flex: 1 }}>
      <Text
        strong
        ellipsis={{ tooltip: record.name }}
        style={{ maxWidth: "100%", fontSize: isMobile ? 13 : undefined, display: "block" }}
      >
        {record.name}
      </Text>
      <Space wrap size={[4, 4]}>
        <Tag
          color="blue"
          style={{
            width: "fit-content",
            margin: 0,
            fontSize: isMobile ? 11 : undefined,
          }}
        >
          Total: {record.size}
        </Tag>
        <Tag
          color="cyan"
          style={{
            width: "fit-content",
            margin: 0,
            fontSize: isMobile ? 11 : undefined,
          }}
        >
          SQL: {record.sqlSize}
        </Tag>
      </Space>
    </Space>
  </Flex>
);

const Backup = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [downloadingName, setDownloadingName] = useState(null);

  const { data: backups = [], isLoading, refetch } = useGetBackupsQuery();
  const [createBackup, { isLoading: isCreating }] = useCreateBackupMutation();
  const [deleteBackup, { isLoading: isDeleting }] = useDeleteBackupMutation();
  const [downloadBackup] = useDownloadBackupMutation();

  const handleCreateBackup = async () => {
    try {
      const result = await createBackup().unwrap();
      await refetch();
      message.success(
        result?.filename
          ? `Backup berhasil dibuat: ${result.filename}`
          : "Backup semua schema dan assets berhasil dibuat!",
      );
    } catch (error) {
      message.error(
        error?.data?.message ||
          error?.error ||
          error?.message ||
          "Gagal membuat backup",
      );
    }
  };

  const handleDelete = async (filename) => {
    try {
      await deleteBackup(filename).unwrap();
      message.success("Folder backup dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus file");
    }
  };

  const handleDownload = async (filename) => {
    setDownloadingName(filename);
    try {
      const result = await downloadBackup(filename).unwrap();
      triggerBrowserDownload(result.blob, result.filename);
      message.success("Backup berhasil diunduh");
    } catch (error) {
      message.error(
        error?.data?.message ||
          error?.error ||
          error?.message ||
          "Gagal mengunduh backup",
      );
    } finally {
      setDownloadingName(null);
    }
  };

  const columns = [
    {
      title: "FOLDER BACKUP",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (_, record) => <BackupFolderCell record={record} isMobile={false} />,
    },
    {
      title: "TANGGAL DIBUAT",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (date) => (
        <Text style={{ whiteSpace: "nowrap" }}>{formatDate(date)}</Text>
      ),
    },
    {
      title: "AKSI",
      key: "action",
      align: "center",
      width: 120,
      render: (_, record) => (
        <Space size={6}>
          <DownloadBackupButton
            record={record}
            onDownload={handleDownload}
            isDownloading={downloadingName === record.name}
          />
          <DeleteBackupButton
            record={record}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </Space>
      ),
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
    >
      <MuseCard
        flush={!isMobile}
        title={
          <CardTitle
            title="Riwayat Backup"
            description={
              isMobile
                ? "Snapshot database & assets di server."
                : "Salinan penuh database dan folder server/assets disimpan ke folder backup di server."
            }
          />
        }
        extra={
          <Flex gap={8} style={{ padding: "8px 0" }}>
            <Tooltip title="Muat ulang">
              <Button icon={<ReloadOutlined />} onClick={refetch} aria-label="Muat ulang daftar backup" />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={isCreating}
              onClick={handleCreateBackup}
            >
              {isMobile ? "Backup" : "Buat Backup Baru"}
            </Button>
          </Flex>
        }
      >
        <div style={{ width: "100%", minWidth: 0 }}>
          {isMobile ? (
            <SpinningList
              loading={isLoading}
              backups={backups}
              isDeleting={isDeleting}
              downloadingName={downloadingName}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
          ) : (
            <div style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
              <Table
                dataSource={backups}
                columns={columns}
                rowKey="name"
                loading={isLoading}
                pagination={{ pageSize: 5, style: { paddingInline: 24 } }}
                scroll={{ x: 640 }}
                locale={{ emptyText: "Belum ada riwayat backup." }}
              />
            </div>
          )}
        </div>
      </MuseCard>
    </MotionDiv>
  );
};

const SpinningList = ({
  loading,
  backups,
  isDeleting,
  downloadingName,
  onDelete,
  onDownload,
}) => (
  <Spin spinning={loading}>
    <div style={{ minHeight: loading && !backups.length ? 160 : undefined, width: "100%", minWidth: 0 }}>
      {!loading && !backups.length ? (
        <div
          style={{
            minHeight: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: museRadius.item,
            background: museColors.bgLayout,
            border: `1px dashed ${museColors.border}`,
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Belum ada riwayat backup."
          />
        </div>
      ) : (
        <Flex vertical gap={10} style={{ width: "100%", minWidth: 0 }}>
          {backups.map((record) => (
            <div
              key={record.name}
              style={{
                borderRadius: museRadius.card,
                border: `1px solid ${museColors.divider}`,
                background: "#ffffff",
                padding: 12,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <Flex vertical gap={10} style={{ width: "100%", minWidth: 0 }}>
                <BackupFolderCell record={record} isMobile />
                <Flex
                  justify="space-between"
                  align="center"
                  gap={8}
                  style={{ width: "100%", minWidth: 0 }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDate(record.createdAt)}
                  </Text>
                  <Space size={6}>
                    <DownloadBackupButton
                      record={record}
                      onDownload={onDownload}
                      isDownloading={downloadingName === record.name}
                    />
                    <DeleteBackupButton
                      record={record}
                      onDelete={onDelete}
                      isDeleting={isDeleting}
                    />
                  </Space>
                </Flex>
              </Flex>
            </div>
          ))}
        </Flex>
      )}
    </div>
  </Spin>
);

export default Backup;
