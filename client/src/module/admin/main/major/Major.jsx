import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  Typography,
  Modal,
  Form,
  message,
  Tooltip,
  Popconfirm,
} from "antd";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  GitBranch, // Icon yang cocok untuk Jurusan/Cabang ilmu
  School,
} from "lucide-react";

import { InfiniteScrollList } from "../../../../components";
import {
  useGetMajorsQuery,
  useAddMajorMutation,
  useUpdateMajorMutation,
  useDeleteMajorMutation,
} from "../../../../service/main/ApiMajor";

const { Title, Text } = Typography;

const Major = () => {
  // === STATE ===
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [listData, setListData] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  // === RTK QUERY ===
  const {
    data: apiData,
    isFetching,
    refetch,
  } = useGetMajorsQuery({
    page,
    limit: 10,
    search,
  });

  const [addMajor, { isLoading: isAdding }] = useAddMajorMutation();
  const [updateMajor, { isLoading: isUpdating }] = useUpdateMajorMutation();
  const [deleteMajor, { isLoading: isDeleting }] = useDeleteMajorMutation();

  // === DATA HANDLING ===
  useEffect(() => {
    if (apiData?.data) {
      if (page === 1) {
        setListData(apiData.data);
      } else {
        setListData((prev) => {
          const newItems = apiData.data.filter(
            (newItem) => !prev.some((prevItem) => prevItem.id === newItem.id),
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [apiData, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // === HANDLERS ===
  const handleLoadMore = () => {
    if (apiData?.hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      form.setFieldsValue({ name: item.name });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingItem) {
        await updateMajor({ id: editingItem.id, name: values.name }).unwrap();
        message.success("Jurusan berhasil diperbarui");
      } else {
        await addMajor({ name: values.name }).unwrap();
        message.success("Jurusan berhasil ditambahkan");
      }
      setIsModalOpen(false);
      setPage(1);
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Terjadi kesalahan");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMajor(id).unwrap();
      message.success("Jurusan dihapus");
      setPage(1);
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus");
    }
  };

  // === RENDER ITEM ===
  const renderItem = (item) => (
    <Card
      hoverable
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
      styles={{ body: { flex: 1, padding: "16px" } }}
      actions={[
        <Tooltip title="Edit Nama" key="edit">
          <Button
            type="text"
            icon={<Pencil size={14} color="#faad14" />}
            onClick={() => handleOpenModal(item)}
          />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title="Hapus Jurusan?"
          description="Pastikan tidak ada kelas yang terhubung."
          onConfirm={() => handleDelete(item.id)}
          okText="Ya, Hapus"
          cancelText="Batal"
          disabled={isDeleting}
        >
          <Button
            type="text"
            danger
            icon={<Trash2 size={14} />}
            loading={isDeleting}
          />
        </Popconfirm>,
      ]}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Icon Utama */}
        <div
          style={{
            background: "#e6f7ff",
            padding: 10,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GitBranch size={24} color="#1890ff" />
        </div>

        <div>
          <Title level={5} style={{ margin: 0 }}>
            {item.name}
          </Title>
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <School size={12} /> {item.homebase_name || "Satuan Pendidikan"}
          </Text>
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Daftar Jurusan
        </Title>
        <div style={{ display: "flex", gap: 10 }}>
          <Input
            placeholder="Cari jurusan..."
            prefix={<Search size={16} color="#bfbfbf" />}
            allowClear
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
          />
          <Button
            type="primary"
            icon={<Plus size={18} />}
            onClick={() => handleOpenModal(null)}
          >
            Tambah Baru
          </Button>
        </div>
      </div>

      {/* INFINITE SCROLL */}
      <InfiniteScrollList
        data={listData}
        loading={isFetching}
        hasMore={apiData?.hasMore}
        onLoadMore={handleLoadMore}
        renderItem={renderItem}
        emptyText="Belum ada data jurusan"
        grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4 }}
      />

      {/* MODAL FORM */}
      <Modal
        title={editingItem ? "Edit Jurusan" : "Tambah Jurusan Baru"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        confirmLoading={isAdding || isUpdating}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Nama Jurusan"
            rules={[{ required: true, message: "Nama jurusan wajib diisi" }]}
            help="Contoh: IPA, IPS, Teknik Komputer Jaringan"
          >
            <Input placeholder="Masukkan nama jurusan..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Major;
