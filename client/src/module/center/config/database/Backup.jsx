import React from "react";
import {
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  FileZipOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  useCreateBackupMutation,
  useDeleteBackupMutation,
  useGetBackupsQuery,
} from "../../../../service/center/ApiDatabase";
import { formatDate } from "../../../../utils/helper";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const Backup = () => {
  const { data: backups, isLoading, refetch } = useGetBackupsQuery();
  const [createBackup, { isLoading: isCreating }] = useCreateBackupMutation();
  const [deleteBackup, { isLoading: isDeleting }] = useDeleteBackupMutation();

  const handleCreateBackup = async () => {
    try {
      await createBackup().unwrap();
      message.success("Backup berhasil dibuat!");
    } catch (error) {
      message.error(error?.data?.message || "Gagal membuat backup");
    }
  };

  const handleDelete = async (filename) => {
    try {
      await deleteBackup(filename).unwrap();
      message.success("File backup dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus file");
    }
  };

  const columns = [
    {
      title: "File Backup",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <Space align="start">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(59,130,246,0.12)",
              color: "#2563eb",
            }}
          >
            <FileZipOutlined />
          </div>
          <Space orientation="vertical" size={2}>
            <Text strong>{record.name}</Text>
            <Tag
              color="blue"
              style={{ width: "fit-content", margin: 0, borderRadius: 999 }}
            >
              {record.size}
            </Tag>
          </Space>
        </Space>
      ),
    },
    {
      title: "Tanggal Dibuat",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date),
    },
    {
      title: "Aksi",
      key: "action",
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            ghost
            icon={<CloudDownloadOutlined />}
            size="small"
            href={record.url}
            target="_blank"
            style={{ borderRadius: 999 }}
          />
          <Popconfirm
            title="Hapus Backup?"
            description="File yang dihapus tidak dapat dikembalikan."
            onConfirm={() => handleDelete(record.name)}
            okText="Hapus"
            cancelText="Batal"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              loading={isDeleting}
              style={{ borderRadius: 999 }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
          <Space
            wrap
            size={[12, 12]}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <div>
              <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                Riwayat Backup
              </Title>
              <Text style={{ color: "#64748b" }}>
                Simpan dan unduh salinan database terbaru saat dibutuhkan.
              </Text>
            </div>
            <Space>
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
                style={{ borderRadius: 999, fontWeight: 600 }}
              >
                Buat Backup Baru
              </Button>
            </Space>
          </Space>

          <Table
            dataSource={backups}
            columns={columns}
            rowKey="name"
            loading={isLoading}
            pagination={{ pageSize: 5 }}
            size="small"
            scroll={{ x: 560 }}
          />
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default Backup;
