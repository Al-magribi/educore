import React, { useEffect, useState } from "react";
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
  Row,
  Col,
  InputNumber,
  Tooltip,
  Typography,
  Flex,
  Badge,
  Grid,
  Tag,
} from "antd";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  BookOpen,
  Hash,
  Layers,
  GitBranch,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  useGetSubjectsQuery,
  useAddSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetSubjectCategoriesQuery,
  useGetSubjectBranchesQuery,
} from "../../../../service/academic/ApiSubject";
import { InfiniteScrollList } from "../../../../components";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const SubjectTable = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;

  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterBranch, setFilterBranch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [allSubjects, setAllSubjects] = useState([]);
  const [form] = Form.useForm();
  const [selectedCategoryInForm, setSelectedCategoryInForm] = useState(null);

  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData } = useGetSubjectBranchesQuery(null);
  const { data: subjectsData, isFetching } = useGetSubjectsQuery({
    page,
    limit,
    search: searchText,
    category_id: filterCategory || "",
    branch_id: filterBranch || "",
  });

  const [addSubject, { isLoading: isAdding }] = useAddSubjectMutation();
  const [updateSubject, { isLoading: isUpdating }] = useUpdateSubjectMutation();
  const [deleteSubject] = useDeleteSubjectMutation();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (subjectsData?.data) {
      if (page === 1) {
        setAllSubjects(subjectsData.data);
      } else {
        setAllSubjects((prev) => {
          const newItems = subjectsData.data.filter(
            (newItem) => !prev.some((existingItem) => existingItem.id === newItem.id),
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [subjectsData, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLoadMore = () => {
    if (!isFetching && allSubjects.length < (subjectsData?.total || 0)) {
      setPage((prev) => prev + 1);
    }
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      kkm: record.kkm,
      category_id: record.category_id,
      branch_id: record.branch_id,
    });
    setSelectedCategoryInForm(record.category_id);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setSelectedCategoryInForm(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      const payload = { ...values, branch_id: values.branch_id || null };
      if (editingItem) {
        await updateSubject({ id: editingItem.id, ...payload }).unwrap();
        message.success("Mapel berhasil diperbarui");
        setPage(1);
      } else {
        await addSubject(payload).unwrap();
        message.success("Mapel berhasil ditambahkan");
        setPage(1);
      }
      handleClose();
    } catch {
      message.error("Gagal menyimpan mapel");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSubject(id).unwrap();
      message.success("Mapel dihapus");
      setPage(1);
    } catch {
      message.error("Gagal menghapus mapel");
    }
  };

  const formBranches =
    branchesData?.data?.filter((b) => b.category_id === selectedCategoryInForm) || [];

  const filterBranchesList = filterCategory
    ? branchesData?.data?.filter((b) => b.category_id === filterCategory)
    : branchesData?.data;

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
            "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(250,245,255,0.98))",
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
              Direktori Mata Pelajaran
            </Title>
            <Text type="secondary">
              Cari, filter, dan kelola data mapel dari panel yang lebih ringkas.
            </Text>
          </div>

          <Flex
            gap={10}
            wrap="wrap"
            vertical={!activeScreens.md}
            style={{ width: !activeScreens.md ? "100%" : "auto" }}
          >
            <Input
              prefix={<Search size={16} color="#94a3b8" />}
              placeholder="Cari mata pelajaran..."
              style={{ width: !activeScreens.md ? "100%" : 220 }}
              allowClear
              size="large"
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
            />

            <Select
              placeholder="Filter Kategori"
              allowClear
              size="large"
              style={{ width: !activeScreens.md ? "100%" : 180 }}
              value={filterCategory}
              onChange={(val) => {
                setFilterCategory(val);
                setFilterBranch(null);
                setPage(1);
              }}
              options={categoriesData?.data?.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
              suffixIcon={<Layers size={14} color="#94a3b8" />}
              virtual={false}
            />

            <Select
              placeholder="Filter Cabang"
              allowClear
              size="large"
              style={{ width: !activeScreens.md ? "100%" : 180 }}
              value={filterBranch}
              onChange={(val) => {
                setFilterBranch(val);
                setPage(1);
              }}
              options={filterBranchesList?.map((b) => ({
                label: b.name,
                value: b.id,
              }))}
              disabled={!filterCategory && !filterBranch}
              suffixIcon={<GitBranch size={14} color="#94a3b8" />}
              virtual={false}
            />

            <Button
              type="primary"
              icon={<Plus size={18} />}
              onClick={() => setIsModalOpen(true)}
              size="large"
            >
              Mapel Baru
            </Button>
          </Flex>
        </Flex>
      </Card>

      <InfiniteScrollList
        data={allSubjects}
        loading={isFetching}
        hasMore={allSubjects.length < (subjectsData?.total || 0)}
        onLoadMore={handleLoadMore}
        height="70vh"
        emptyText="Belum ada data mata pelajaran"
        grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 12, lg: 8, xl: 6 }}
        renderItem={(item) => (
          <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
            <Badge.Ribbon
              text={item.category_name || "Umum"}
              color={item.category_name === "Diniyah" ? "green" : "blue"}
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
                  <Tooltip title="Edit" key="edit">
                    <Button
                      type="text"
                      icon={<Edit2 size={16} color="#f59e0b" />}
                      onClick={() => handleEdit(item)}
                    />
                  </Tooltip>,
                  <Popconfirm
                    key="delete"
                    title="Hapus Mapel?"
                    onConfirm={() => handleDelete(item.id)}
                    okText="Hapus"
                    cancelText="Batal"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Hapus">
                      <Button type="text" danger icon={<Trash2 size={16} />} />
                    </Tooltip>
                  </Popconfirm>,
                ]}
              >
                <Flex vertical align="flex-start" gap={12}>
                  <Flex align="center" gap={12} style={{ width: "100%" }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 16,
                        background: "linear-gradient(135deg, #dbeafe, #ede9fe)",
                        color: "#2563eb",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <BookOpen size={18} />
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <Text
                        strong
                        style={{
                          fontSize: 16,
                          display: "block",
                          lineHeight: 1.2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Cabang: {item.branch_name || "-"}
                      </Text>
                    </div>
                  </Flex>

                  <Flex gap={8} wrap="wrap">
                    <Tag
                      bordered={false}
                      style={{
                        borderRadius: 999,
                        padding: "6px 12px",
                        background: "rgba(59, 130, 246, 0.10)",
                        color: "#1d4ed8",
                        fontWeight: 600,
                      }}
                    >
                      Kode: {item.code || "?"}
                    </Tag>
                    <Tag
                      bordered={false}
                      style={{
                        borderRadius: 999,
                        padding: "6px 12px",
                        background: "rgba(16, 185, 129, 0.10)",
                        color: "#047857",
                        fontWeight: 600,
                      }}
                    >
                      KKM: {item.kkm}
                    </Tag>
                  </Flex>
                </Flex>
              </Card>
            </Badge.Ribbon>
          </MotionDiv>
        )}
      />

      <Modal
        open={isModalOpen}
        onCancel={handleClose}
        footer={null}
        destroyOnHidden
        closable={false}
        centered
        width={isMobile ? "calc(100vw - 24px)" : 680}
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
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ kkm: 75 }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(239,246,255,1), rgba(250,245,255,0.96))",
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
                  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                  color: "#fff",
                  boxShadow: "0 16px 30px rgba(99, 102, 241, 0.28)",
                }}
              >
                {editingItem ? <Edit2 size={22} /> : <BookOpen size={22} />}
              </div>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0 }}>
                  {editingItem ? "Edit Mata Pelajaran" : "Buat Mata Pelajaran Baru"}
                </Title>
                <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                  Simpan data mapel dengan kategori, cabang, kode, dan nilai KKM yang konsisten.
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
                  label="Nama Mata Pelajaran"
                  rules={[{ required: true, message: "Nama wajib diisi" }]}
                >
                  <Input
                    placeholder="Contoh: Kitab Safinah"
                    size="large"
                    prefix={<BookOpen size={16} color="#2563eb" />}
                    style={{ borderRadius: 14, paddingBlock: 8 }}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="category_id"
                      label="Kategori"
                      rules={[{ required: true, message: "Pilih kategori" }]}
                    >
                      <Select
                        size="large"
                        placeholder="Pilih Kategori"
                        options={categoriesData?.data?.map((c) => ({
                          label: c.name,
                          value: c.id,
                        }))}
                        onChange={(val) => {
                          setSelectedCategoryInForm(val);
                          form.setFieldValue("branch_id", null);
                        }}
                        virtual={false}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="branch_id" label="Cabang (Opsional)">
                      <Select
                        size="large"
                        placeholder={
                          selectedCategoryInForm
                            ? "Pilih Cabang"
                            : "Pilih Kategori Dulu"
                        }
                        options={formBranches.map((b) => ({
                          label: b.name,
                          value: b.id,
                        }))}
                        disabled={!selectedCategoryInForm}
                        allowClear
                        virtual={false}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="code" label="Kode Mapel">
                      <Input
                        placeholder="Contoh: MP-01"
                        prefix={<Hash size={16} color="#64748b" />}
                        style={{ borderRadius: 14, paddingBlock: 8 }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="kkm"
                      label="Nilai KKM"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        min={0}
                        max={100}
                        style={{ width: "100%" }}
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div
                style={{
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #eef2ff, #eff6ff)",
                  border: "1px solid rgba(99, 102, 241, 0.16)",
                  padding: isMobile ? 16 : 18,
                }}
              >
                <Flex align="flex-start" gap={12}>
                  <CheckCircle size={18} color="#4f46e5" style={{ marginTop: 2 }} />
                  <div>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>
                      Tips kelengkapan data
                    </Text>
                    <Text type="secondary">
                      Tentukan kategori lebih dulu agar pilihan cabang tepat dan data mapel tetap konsisten saat dipakai di modul lain.
                    </Text>
                  </div>
                </Flex>
              </div>

              <Flex justify="flex-end" gap={10} vertical={isMobile}>
                <Button
                  size="large"
                  onClick={handleClose}
                  style={{ borderRadius: 14, minWidth: isMobile ? "100%" : 120 }}
                >
                  Batal
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={isAdding || isUpdating}
                  icon={
                    isAdding || isUpdating ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : editingItem ? (
                      <Edit2 size={16} />
                    ) : (
                      <Plus size={16} />
                    )
                  }
                  style={{
                    borderRadius: 14,
                    minWidth: isMobile ? "100%" : 190,
                    boxShadow: "0 12px 24px rgba(99, 102, 241, 0.22)",
                  }}
                >
                  {editingItem ? "Simpan Perubahan" : "Buat Mapel"}
                </Button>
              </Flex>
            </MotionDiv>
          </div>
        </Form>
      </Modal>
    </MotionDiv>
  );
};

export default SubjectTable;
