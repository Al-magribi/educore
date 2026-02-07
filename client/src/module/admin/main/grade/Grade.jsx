import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  theme,
} from "antd";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { InfiniteScrollList } from "../../../../components"; // Sesuaikan path import
import {
  useGetGradesQuery,
  useAddGradeMutation,
  useEditGradeMutation,
  useDeleteGradeMutation,
} from "../../../../service/main/ApiGrade";

const { Search: AntSearch } = Input;
const { Text, Title } = Typography;

const Grade = () => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  // State untuk Data & Pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [allItems, setAllItems] = useState([]); // State lokal untuk menampung akumulasi data
  const [hasMore, setHasMore] = useState(true);

  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // RTK Query
  const { data, isFetching } = useGetGradesQuery({ page, limit: 12, search }); // Limit disesuaikan untuk Grid
  const [addGrade, { isLoading: isAdding }] = useAddGradeMutation();
  const [editGrade, { isLoading: isEditing }] = useEditGradeMutation();
  const [deleteGrade, { isLoading: isDeleting }] = useDeleteGradeMutation();

  // ----------------------------------------------------------------
  // EFFECT: Akumulasi Data untuk Infinite Scroll
  // ----------------------------------------------------------------
  useEffect(() => {
    if (data) {
      if (page === 1) {
        // Jika halaman 1 (awal atau hasil search baru), replace data
        setAllItems(data.data);
      } else {
        // Jika halaman selanjutnya, append data
        setAllItems((prev) => [...prev, ...data.data]);
      }
      // Cek apakah masih ada halaman berikutnya
      setHasMore(page < data.meta.totalPages);
    }
  }, [data, page]);

  // ----------------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------------
  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1); // Reset ke halaman 1 saat mencari
    setAllItems([]); // Kosongkan tampilan sementara
  };

  const handleDelete = async (id) => {
    try {
      await deleteGrade(id).unwrap();
      message.success("Data berhasil dihapus");
      // Note: Data akan auto-refetch, tapi karena kita pakai local state 'allItems',
      // kita perlu mereset list atau menghapus item secara manual dari state lokal
      // Cara paling aman untuk konsistensi: Reset ke page 1
      setPage(1);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus data");
    }
  };

  const handleSave = async (values) => {
    try {
      if (editingItem) {
        await editGrade({ id: editingItem.id, ...values }).unwrap();
        message.success("Berhasil diperbarui");
      } else {
        await addGrade(values).unwrap();
        message.success("Berhasil ditambahkan");
      }
      setIsModalOpen(false);
      form.resetFields();
      setPage(1); // Refresh list dari awal
    } catch (error) {
      message.error(error?.data?.message || "Terjadi kesalahan");
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) form.setFieldsValue(item);
    else form.resetFields();
    setIsModalOpen(true);
  };

  // ----------------------------------------------------------------
  // RENDER ITEM (Card Design)
  // ----------------------------------------------------------------
  const renderGradeItem = (item) => (
    <Card
      hoverable
      style={{
        height: "100%",
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
      styles={{ body: { padding: "16px" } }}
      actions={[
        <Tooltip title="Edit Data">
          <Button
            type="text"
            icon={<Pencil size={16} className="text-yellow-600" />}
            onClick={() => openModal(item)}
            block
          />
        </Tooltip>,
        <Tooltip title="Hapus Data">
          <Popconfirm
            title="Hapus Tingkat?"
            description="Aksi ini tidak dapat dibatalkan."
            onConfirm={() => handleDelete(item.id)}
            okText="Ya"
            cancelText="Batal"
            okButtonProps={{ danger: true, loading: isDeleting }}
          >
            <Button type="text" danger icon={<Trash2 size={16} />} block />
          </Popconfirm>
        </Tooltip>,
      ]}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: token.colorPrimaryBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: token.colorPrimary,
          }}
        >
          <GraduationCap size={20} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Tingkat Kelas
          </Text>
          <div style={{ fontSize: 18, fontWeight: "bold", lineHeight: 1 }}>
            {item.name}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: "20px" }}>
      {/* Header & Search */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Daftar Tingkat
        </Title>

        <Space>
          <AntSearch
            placeholder="Cari tingkat..."
            onSearch={handleSearch}
            allowClear
            style={{ width: 250 }}
          />
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openModal(null)}
          >
            Tambah
          </Button>
        </Space>
      </div>

      {/* Infinite Scroll List */}
      <div
        style={{
          background: token.colorBgContainer,
          padding: 16,
          borderRadius: token.borderRadiusLG,
        }}
      >
        <InfiniteScrollList
          data={allItems}
          loading={isFetching}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          renderItem={renderGradeItem}
          emptyText="Belum ada data tingkat kelas"
          grid={{
            gutter: [16, 16],
            xs: 24,
            sm: 12,
            md: 8,
            lg: 6,
            xl: 4,
            xxl: 4,
          }}
        />
      </div>

      {/* Modal Form */}
      <Modal
        title={editingItem ? "Edit Grade" : "Tambah Grade Baru"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="Nama Tingkat"
            name="name"
            rules={[{ required: true, message: "Harap isi nama tingkat!" }]}
            help="Contoh: X, XI, XII, atau 1, 2, 3"
          >
            <Input placeholder="Masukkan nama..." />
          </Form.Item>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 24,
            }}
          >
            <Button onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isAdding || isEditing}
              icon={
                isAdding || isEditing ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : null
              }
            >
              Simpan
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Grade;
