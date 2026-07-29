import React, { useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
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

const { Title, Text } = Typography;
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
      style={{ borderRadius: 999 }}
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
    style={{ borderRadius: 999 }}
  >
    {block ? "Download" : null}
  </Button>
);

const BackupFolderCell = ({ record, isMobile }) => (
  <Flex align="flex-start" gap={isMobile ? 10 : 12} style={{ minWidth: 0, width: "100%" }}>
    <div
      style={{
        width: isMobile ? 36 : 40,
        height: isMobile ? 36 : 40,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(59,130,246,0.12)",
        color: "#2563eb",
        flexShrink: 0,
      }}
    >
      <FolderOpenOutlined />
    </div>
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
            borderRadius: 999,
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
            borderRadius: 999,
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
  const isCompact = !screens.lg;
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
      title: "Folder Backup",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (_, record) => <BackupFolderCell record={record} isMobile={false} />,
    },
    {
      title: "Tanggal Dibuat",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (date) => (
        <Text style={{ whiteSpace: "nowrap" }}>{formatDate(date)}</Text>
      ),
    },
    {
      title: "Aksi",
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
      whileHover={isMobile ? undefined : { y: -3 }}
      transition={{ duration: 0.2 }}
      style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
    >
      <Card
        variant="borderless"
        style={{
          height: "100%",
          borderRadius: isMobile ? 18 : 22,
          border: "1px solid rgba(148, 163, 184, 0.14)",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 12 : 18, overflow: "hidden" } }}
      >
        <Space
          orientation="vertical"
          size={isMobile ? 12 : 16}
          style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
        >
          <Flex
            wrap="wrap"
            gap={12}
            justify="space-between"
            align={isCompact ? "stretch" : "flex-start"}
            vertical={isCompact}
            style={{ width: "100%", minWidth: 0 }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <Title
                level={4}
                style={{ margin: 0, color: "#0f172a", fontSize: isMobile ? 16 : undefined }}
              >
                Riwayat Backup
              </Title>
              <Text
                style={{
                  color: "#64748b",
                  fontSize: isMobile ? 12 : undefined,
                  display: "block",
                }}
              >
                {isMobile
                  ? "Snapshot database & assets di server."
                  : "Simpan salinan penuh database dan folder `server/assets` ke folder backup di server."}
              </Text>
            </div>
            <Flex gap={8} wrap="wrap" style={{ width: isCompact ? "100%" : "auto" }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={refetch}
                style={{ borderRadius: 999 }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={isCreating}
                onClick={handleCreateBackup}
                block={isCompact}
                style={{
                  borderRadius: 999,
                  fontWeight: 600,
                  flex: isCompact ? 1 : undefined,
                }}
              >
                {isMobile ? "Buat Backup" : "Buat Backup Baru"}
              </Button>
            </Flex>
          </Flex>

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
                pagination={{ pageSize: 5 }}
                size="small"
                scroll={{ x: 640 }}
                locale={{ emptyText: "Belum ada riwayat backup." }}
              />
            </div>
          )}
        </Space>
      </Card>
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
            borderRadius: 16,
            background: "#f8fafc",
            border: "1px dashed #cbd5e1",
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
                borderRadius: 16,
                border: "1px solid #e2e8f0",
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
