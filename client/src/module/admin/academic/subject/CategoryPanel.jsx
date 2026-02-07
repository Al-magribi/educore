import React, { useState } from "react";
import {
  Button,
  Input,
  Modal,
  Form,
  message,
  Popconfirm,
  Card,
  Flex,
  Typography,
  Tooltip,
} from "antd";
import { Plus, Trash2, Layers } from "lucide-react";
import {
  useGetSubjectCategoriesQuery,
  useAddSubjectCategoryMutation,
  useDeleteSubjectCategoryMutation,
} from "../../../../service/academic/ApiSubject";
// Pastikan path import sesuai struktur project Anda
import { InfiniteScrollList } from "../../../../components";

const { Text } = Typography;

const CategoryPanel = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // RTK Query
  const { data, isLoading } = useGetSubjectCategoriesQuery();
  const [addCategory, { isLoading: isAdding }] =
    useAddSubjectCategoryMutation();
  const [deleteCategory] = useDeleteSubjectCategoryMutation();

  const handleAdd = async (values) => {
    try {
      await addCategory(values).unwrap();
      message.success("Kategori berhasil dibuat");
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error("Gagal membuat kategori");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id).unwrap();
      message.success("Kategori dihapus");
    } catch (error) {
      message.error("Gagal menghapus");
    }
  };

  // --- Styles ---
  const styles = {
    header: {
      marginBottom: 24,
      display: "flex",
      justifyContent: "flex-end",
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: "50%",
      background: "#fff7e6", // Orange tint
      color: "#fa8c16",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      margin: "0 auto",
    },
  };

  return (
    <div>
      {/* --- HEADER BUTTON --- */}
      <div style={styles.header}>
        <Button
          type="primary"
          icon={<Plus size={18} />}
          onClick={() => setIsModalOpen(true)}
          style={{ borderRadius: 8 }}
        >
          Tambah Kategori
        </Button>
      </div>

      {/* --- CONTENT GRID (Infinite Scroll List) --- */}
      <InfiniteScrollList
        data={data?.data || []}
        loading={isLoading}
        hasMore={false} // Data kategori dimuat sekaligus
        height="70vh" // Tinggi area scroll
        emptyText="Belum ada kategori"
        grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 8, lg: 6, xl: 4 }} // Responsif Grid
        renderItem={(item) => (
          <Card
            hoverable
            styles={{ body: { padding: "24px 16px" } }}
            actions={[
              <Popconfirm
                title="Hapus kategori?"
                description="Semua data di dalamnya akan hilang!"
                onConfirm={() => handleDelete(item.id)}
                okText="Ya, Hapus"
                cancelText="Batal"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Hapus Permanen">
                  <Button type="text" danger icon={<Trash2 size={16} />}>
                    Hapus
                  </Button>
                </Tooltip>
              </Popconfirm>,
            ]}
          >
            <div style={styles.iconCircle}>
              <Layers size={24} />
            </div>
            <Text strong style={{ fontSize: 16 }}>
              {item.name}
            </Text>
            <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
              Kategori Utama
            </div>
          </Card>
        )}
      />

      {/* --- MODAL --- */}
      <Modal
        title={
          <Flex align="center" gap={8}>
            <Plus size={20} /> <span>Tambah Kategori</span>
          </Flex>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={isAdding}
        centered
        width={400}
      >
        <Form
          form={form}
          onFinish={handleAdd}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="name"
            label="Nama Kategori"
            rules={[{ required: true, message: "Wajib diisi" }]}
          >
            <Input
              placeholder="Contoh: Diniyah, Umum"
              size="large"
              prefix={
                <Layers
                  size={16}
                  style={{ color: "#bfbfbf", marginRight: 8 }}
                />
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryPanel;
