import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  Button,
  Input,
  Modal,
  Form,
  message,
  Popconfirm,
  Select,
  Typography,
  Flex,
  Badge,
  Tooltip,
  Grid,
} from "antd";
import {
  Plus,
  Trash2,
  Search,
  GitBranch,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  useGetSubjectBranchesQuery,
  useAddSubjectBranchMutation,
  useDeleteSubjectBranchMutation,
  useGetSubjectCategoriesQuery,
} from "../../../../service/academic/ApiSubject";
import { InfiniteScrollList } from "../../../../components";

const { Text, Paragraph, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const BranchPanel = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData, isLoading } = useGetSubjectBranchesQuery(null);

  const [addBranch, { isLoading: isAdding }] = useAddSubjectBranchMutation();
  const [deleteBranch] = useDeleteSubjectBranchMutation();

  const handleAdd = async (values) => {
    try {
      await addBranch(values).unwrap();
      message.success("Cabang berhasil dibuat");
      setIsModalOpen(false);
      form.resetFields();
    } catch {
      message.error("Gagal membuat cabang");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBranch(id).unwrap();
      message.success("Cabang dihapus");
    } catch {
      message.error("Gagal menghapus cabang");
    }
  };

  const filteredData =
    branchesData?.data?.filter(
      (item) =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchText.toLowerCase()),
    ) || [];

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
            "linear-gradient(135deg, rgba(236,254,255,0.98), rgba(239,246,255,0.98))",
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
              Cabang Mata Pelajaran
            </Title>
            <Text type="secondary">
              Atur cabang mapel berdasarkan kategori agar struktur kurikulum lebih detail.
            </Text>
          </div>
          <Flex
            gap={10}
            vertical={!activeScreens.md}
            style={{ width: !activeScreens.md ? "100%" : "auto" }}
          >
            <Input
              prefix={<Search size={16} color="#94a3b8" />}
              placeholder="Cari cabang atau kategori..."
              style={{ width: !activeScreens.md ? "100%" : 280 }}
              allowClear
              size="large"
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Button
              type="primary"
              icon={<Plus size={18} />}
              onClick={() => setIsModalOpen(true)}
              size="large"
            >
              Tambah Cabang
            </Button>
          </Flex>
        </Flex>
      </Card>

      <InfiniteScrollList
        data={filteredData}
        loading={isLoading}
        hasMore={false}
        height="70vh"
        emptyText="Belum ada data cabang"
        grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 12, lg: 8, xl: 6 }}
        renderItem={(item) => (
          <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
            <Badge.Ribbon
              text={item.category_name || "Tanpa Kategori"}
              color="cyan"
              style={{ top: 12 }}
            >
              <Card
                hoverable
                style={{
                  borderRadius: 22,
                  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
                }}
                styles={{ body: { padding: "20px 18px" } }}
                actions={[
                  <Popconfirm
                    key="delete"
                    title="Hapus cabang ini?"
                    description="Tindakan ini tidak dapat dibatalkan."
                    onConfirm={() => handleDelete(item.id)}
                    okText="Hapus"
                    cancelText="Batal"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Hapus">
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 size={16} />}
                        style={{ width: "100%" }}
                      >
                        Hapus
                      </Button>
                    </Tooltip>
                  </Popconfirm>,
                ]}
              >
                <Flex align="flex-start" gap={12}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 16,
                      background: "linear-gradient(135deg, #ccfbf1, #dbeafe)",
                      color: "#0f766e",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <GitBranch size={20} />
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <Text
                      strong
                      style={{
                        fontSize: 16,
                        display: "block",
                        marginBottom: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </Text>
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 13, margin: 0, minHeight: 40 }}
                    >
                      {item.description || "Tidak ada deskripsi"}
                    </Paragraph>
                  </div>
                </Flex>
              </Card>
            </Badge.Ribbon>
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
        width={isMobile ? "calc(100vw - 24px)" : 620}
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
                "linear-gradient(135deg, rgba(236,254,255,1), rgba(239,246,255,0.96))",
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
                  background: "linear-gradient(135deg, #0f766e, #0ea5e9)",
                  color: "#fff",
                  boxShadow: "0 16px 30px rgba(14, 165, 233, 0.28)",
                }}
              >
                <GitBranch size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0 }}>
                  Tambah Cabang Baru
                </Title>
                <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                  Hubungkan cabang dengan kategori yang sesuai agar pengelompokan mapel lebih jelas.
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
                  name="category_id"
                  label="Pilih Kategori"
                  rules={[{ required: true, message: "Kategori wajib dipilih" }]}
                >
                  <Select
                    placeholder="Pilih Kategori"
                    options={categoriesData?.data?.map((c) => ({
                      label: c.name,
                      value: c.id,
                    }))}
                    size="large"
                    virtual={false}
                  />
                </Form.Item>

                <Form.Item
                  name="name"
                  label="Nama Cabang"
                  rules={[{ required: true, message: "Wajib diisi" }]}
                >
                  <Input
                    placeholder="Contoh: Fiqih, Bahasa Arab"
                    size="large"
                    prefix={<GitBranch size={16} color="#0f766e" />}
                    style={{ borderRadius: 14, paddingBlock: 8 }}
                  />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="Deskripsi (Opsional)"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Tambahkan catatan singkat..."
                    style={{ borderRadius: 14 }}
                  />
                </Form.Item>
              </div>

              <div
                style={{
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #ecfeff, #eff6ff)",
                  border: "1px solid rgba(14, 165, 233, 0.16)",
                  padding: isMobile ? 16 : 18,
                }}
              >
                <Flex align="flex-start" gap={12}>
                  <CheckCircle size={18} color="#0f766e" style={{ marginTop: 2 }} />
                  <div>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>
                      Tips struktur data
                    </Text>
                    <Text type="secondary">
                      Gunakan cabang sebagai turunan kategori untuk membedakan kelompok mapel yang lebih spesifik.
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
                    boxShadow: "0 12px 24px rgba(14, 165, 233, 0.22)",
                  }}
                >
                  Buat Cabang
                </Button>
              </Flex>
            </MotionDiv>
          </div>
        </Form>
      </Modal>
    </MotionDiv>
  );
};

export default BranchPanel;
