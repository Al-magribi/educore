import {
  Table,
  Button,
  Card,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
} from "antd";
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  FileZipOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  useGetBackupsQuery,
  useCreateBackupMutation,
  useDeleteBackupMutation,
} from "../../../../service/center/ApiDatabase";
import { formatDate } from "../../../../utils/helper";

const { Title, Text } = Typography;

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
      message.error("Gagal menghapus file");
    }
  };

  const columns = [
    {
      title: "File Backup",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <Space>
          <FileZipOutlined style={{ color: "#1890ff" }} />
          <Space vertical>
            <Text strong>{record.name}</Text>
            <Tag color="blue">{record.size}</Tag>
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
            href={record.url} // Link download dari backend
            target="_blank"
          ></Button>
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
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Riwayat Backup"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refetch} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={isCreating}
            onClick={handleCreateBackup}
          >
            Buat Backup Baru
          </Button>
        </Space>
      }
      style={{ height: "100%" }}
    >
      <Table
        dataSource={backups}
        columns={columns}
        rowKey="name"
        loading={isLoading}
        pagination={{ pageSize: 5 }}
        size="small"
      />
    </Card>
  );
};

export default Backup;
