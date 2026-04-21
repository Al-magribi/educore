import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Modal,
  Form,
  message,
  Popconfirm,
  Card,
  Flex,
  Typography,
  Tooltip,
  Grid,
  Input,
} from "antd";
import { Plus, Trash2, Layers, Loader2, CheckCircle } from "lucide-react";
import {
  useGetSubjectCategoriesQuery,
  useAddSubjectCategoryMutation,
  useDeleteSubjectCategoryMutation,
} from "../../../../service/academic/ApiSubject";
import { InfiniteScrollList } from "../../../../components";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const CategoryPanel = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

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
    } catch {
      message.error("Gagal membuat kategori");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id).unwrap();
      message.success("Kategori dihapus");
    } catch {
      message.error("Gagal menghapus kategori");
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 22,
          background:
            "linear-gradient(135deg, rgba(255,251,235,0.98), rgba(255,247,237,0.98))",
          boxShadow: "0 16px 32px rgba(15, 23, 42, 0.05)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 18 } }}
      >
        <Flex
          justify="space-between"
          align={activeScreens.md ? "center" : "stretch"}
          vertical={!activeScreens.md}
          gap={16}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Kategori Mata Pelajaran
            </Title>
            <Text type="secondary">
              Kelompokkan mapel ke dalam kategori utama agar struktur kurikulum
              lebih mudah dikelola.
            </Text>
          </div>
          <Button
            type="primary"
            icon={<Plus size={18} />}
            onClick={() => setIsModalOpen(true)}
            size="large"
          >
            Tambah Kategori
          </Button>
        </Flex>
      </Card>

      <InfiniteScrollList
        data={data?.data || []}
        loading={isLoading}
        hasMore={false}
        height="70vh"
        emptyText="Belum ada kategori"
        grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 8, lg: 6, xl: 6 }}
        renderItem={(item) => (
          <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
            <Card
              hoverable
              style={{
                borderRadius: 22,
                boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
              }}
              styles={{ body: { padding: "22px 18px" } }}
              actions={[
                <Popconfirm
                  key="delete"
                  title="Hapus kategori?"
                  description="Data terkait dapat terdampak dan aksi ini tidak dapat dibatalkan."
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
              <Flex vertical align="center" gap={12}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #fef3c7, #ffedd5)",
                    color: "#d97706",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Layers size={24} />
                </div>
                <Text strong style={{ fontSize: 16, textAlign: "center" }}>
                  {item.name}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Kategori Utama
                </Text>
              </Flex>
            </Card>
          </MotionDiv>
        )}
      />

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        closable={false}
        centered
        width={isMobile ? "calc(100vw - 24px)" : 560}
        styles={{
          content: {
            padding: 0,
            overflow: "hidden",
            borderRadius: 28,
            boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
          },
          body: { padding: 0 },
        }}
        modalRender={(modalNode) => (
          <MotionDiv
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {modalNode}
          </MotionDiv>
        )}
      >
        <Form form={form} onFinish={handleAdd} layout="vertical">
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(255,251,235,1), rgba(255,247,237,0.96))",
              padding: isMobile ? 20 : 28,
              borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
            }}
          >
            <Flex align="flex-start" gap={16}>
              <div
                style={{
                  width: isMobile ? 48 : 56,
                  height: isMobile ? 48 : 56,
                  borderRadius: 18,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #d97706, #f59e0b)",
                  color: "#fff",
                  boxShadow: "0 16px 30px rgba(217, 119, 6, 0.28)",
                }}
              >
                <Layers size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0 }}>
                  Tambah Kategori
                </Title>
                <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                  Tambahkan kategori baru untuk menjaga struktur mapel tetap rapi.
                </Text>
              </div>
            </Flex>
          </div>

          <div style={{ padding: isMobile ? 20 : 28 }}>
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.05 }}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div
                style={{
                  borderRadius: 20,
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "#fff",
                  padding: isMobile ? 16 : 18,
                }}
              >
                <Form.Item
                  name="name"
                  label="Nama Kategori"
                  rules={[{ required: true, message: "Wajib diisi" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    size="large"
                    prefix={<Layers size={16} color="#d97706" />}
                    placeholder="Contoh: Diniyah, Umum"
                    style={{ borderRadius: 14, paddingBlock: 8 }}
                  />
                </Form.Item>
              </div>

              <div
                style={{
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #fffbeb, #fff7ed)",
                  border: "1px solid rgba(245, 158, 11, 0.16)",
                  padding: isMobile ? 16 : 18,
                }}
              >
                <Flex align="flex-start" gap={12}>
                  <CheckCircle size={18} color="#d97706" style={{ marginTop: 2 }} />
                  <div>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>
                      Tips pengisian
                    </Text>
                    <Text type="secondary">
                      Gunakan nama kategori yang ringkas dan konsisten agar mudah
                      dipakai sebagai dasar pengelompokan cabang mapel.
                    </Text>
                  </div>
                </Flex>
              </div>

              <Flex justify="flex-end" gap={10} vertical={isMobile}>
                <Button
                  size="large"
                  onClick={() => setIsModalOpen(false)}
                  style={{ borderRadius: 14, minWidth: isMobile ? "100%" : 120 }}
                >
                  Batal
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={isAdding}
                  icon={
                    isAdding ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Plus size={16} />
                    )
                  }
                  style={{
                    borderRadius: 14,
                    minWidth: isMobile ? "100%" : 180,
                    boxShadow: "0 12px 24px rgba(217, 119, 6, 0.22)",
                  }}
                >
                  Buat Kategori
                </Button>
              </Flex>
            </MotionDiv>
          </div>
        </Form>
      </Modal>
    </MotionDiv>
  );
};

export default CategoryPanel;
