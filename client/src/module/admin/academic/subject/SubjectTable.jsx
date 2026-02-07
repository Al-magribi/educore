import React, { useState, useEffect } from "react";
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
  Space,
  Badge,
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
} from "lucide-react";
import {
  useGetSubjectsQuery,
  useAddSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetSubjectCategoriesQuery,
  useGetSubjectBranchesQuery,
} from "../../../../service/academic/ApiSubject";
// Import Infinite Scroll
import { InfiniteScrollList } from "../../../../components";

const { Text } = Typography;

const SubjectTable = () => {
  // --- States ---
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterBranch, setFilterBranch] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Pagination State & Data Accumulation
  const [page, setPage] = useState(1);
  const [limit] = useState(12); // Load 12 items per batch
  const [allSubjects, setAllSubjects] = useState([]); // State untuk menampung semua data

  const [form] = Form.useForm();
  const [selectedCategoryInForm, setSelectedCategoryInForm] = useState(null);

  // --- API Hooks ---
  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData } = useGetSubjectBranchesQuery(null);

  // Fetch data berdasarkan page saat ini
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

  // --- Effect: Akumulasi Data untuk Infinite Scroll ---
  useEffect(() => {
    if (subjectsData?.data) {
      if (page === 1) {
        // Jika halaman 1 (filter berubah atau refresh), reset data
        setAllSubjects(subjectsData.data);
      } else {
        // Jika halaman > 1, tambahkan data baru ke bawah
        setAllSubjects((prev) => {
          // Cek duplikasi sederhana berdasarkan ID agar aman (opsional tapi disarankan)
          const newItems = subjectsData.data.filter(
            (newItem) =>
              !prev.some((existingItem) => existingItem.id === newItem.id),
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [subjectsData, page]);

  // --- Effect: Reset Page saat Filter Berubah ---
  useEffect(() => {
    setPage(1);
    // Kita bisa mengosongkan allSubjects sementara agar user melihat loading
    // setAllSubjects([]);
  }, [searchText, filterCategory, filterBranch]);

  // --- Infinite Scroll Handler ---
  const handleLoadMore = () => {
    // Hanya load more jika tidak sedang fetching dan masih ada data
    if (!isFetching && allSubjects.length < (subjectsData?.total || 0)) {
      setPage((prev) => prev + 1);
    }
  };

  // --- Handlers CRUD ---
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
        // Refetch otomatis dilakukan oleh RTK Query tag invalidation
        // Untuk infinite scroll manual, idealnya kita update state lokal juga atau reset ke page 1
        setPage(1);
      } else {
        await addSubject(payload).unwrap();
        message.success("Mapel berhasil ditambahkan");
        setPage(1);
      }
      handleClose();
    } catch (error) {
      message.error("Gagal menyimpan mapel");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSubject(id).unwrap();
      message.success("Mapel dihapus");
      setPage(1); // Reset list agar data ter-refresh rapi
    } catch (error) {
      message.error("Gagal menghapus");
    }
  };

  // --- Filter Logic untuk Form ---
  const formBranches =
    branchesData?.data?.filter(
      (b) => b.category_id === selectedCategoryInForm,
    ) || [];

  const filterBranchesList = filterCategory
    ? branchesData?.data?.filter((b) => b.category_id === filterCategory)
    : branchesData?.data;

  // --- Styles ---
  const styles = {
    container: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      background: "#fff",
      padding: 16,
      borderRadius: 12,
      border: "1px solid #f0f0f0",
      marginBottom: 24,
      boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
    },

    statusPill: {
      background: "#f6ffed",
      border: "1px solid #b7eb8f",
      color: "#389e0d",
      padding: "2px 10px",
      borderRadius: 4,
      fontSize: 12,
      display: "inline-block",
      marginTop: 8,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: "#e6f7ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#1890ff",
      marginRight: 12,
      flexShrink: 0,
    },
  };

  return (
    <div style={styles.container}>
      {/* --- HEADER --- */}
      <div style={styles.header}>
        <Flex justify='space-between' align='center' gap={16} wrap='wrap'>
          <Space wrap size={12} style={{ flex: 1 }}>
            <Input
              prefix={<Search size={16} style={{ color: "#bfbfbf" }} />}
              placeholder='Cari mata pelajaran...'
              style={{ width: 250, borderRadius: 8 }}
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Select
              placeholder='Filter Kategori'
              allowClear
              style={{ width: 180 }}
              value={filterCategory}
              onChange={(val) => {
                setFilterCategory(val);
                setFilterBranch(null);
              }}
              options={categoriesData?.data?.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
              suffixIcon={<Layers size={14} style={{ color: "#bfbfbf" }} />}
              virtual={false}
            />

            <Select
              placeholder='Filter Cabang'
              allowClear
              style={{ width: 180 }}
              value={filterBranch}
              onChange={setFilterBranch}
              options={filterBranchesList?.map((b) => ({
                label: b.name,
                value: b.id,
              }))}
              disabled={!filterCategory && !filterBranch}
              suffixIcon={<GitBranch size={14} style={{ color: "#bfbfbf" }} />}
              virtual={false}
            />
          </Space>

          <Button
            type='primary'
            icon={<Plus size={18} />}
            onClick={() => setIsModalOpen(true)}
            style={{ borderRadius: 8 }}
          >
            Mapel Baru
          </Button>
        </Flex>
      </div>

      {/* --- INFINITE SCROLL CONTENT --- */}
      <InfiniteScrollList
        data={allSubjects}
        loading={isFetching} // Gunakan isFetching untuk loading indikator saat load more
        hasMore={allSubjects.length < (subjectsData?.total || 0)}
        onLoadMore={handleLoadMore}
        height='70vh'
        grid={{ gutter: [24, 24], xs: 24, sm: 12, md: 12, lg: 8, xl: 6 }}
        renderItem={(item) => (
          <Badge.Ribbon
            text={item.category_name || "Umum"}
            color={item.category_name === "Diniyah" ? "green" : "blue"}
            style={{ top: 12 }}
          >
            <Card
              hoverable
              styles={{ body: { padding: "20px 24px" } }}
              actions={[
                <Tooltip title='Edit'>
                  <Edit2
                    size={18}
                    style={{ color: "#faad14", cursor: "pointer" }}
                    onClick={() => handleEdit(item)}
                  />
                </Tooltip>,
                <Popconfirm
                  title='Hapus Mapel?'
                  onConfirm={() => handleDelete(item.id)}
                  okText='Hapus'
                  cancelText='Batal'
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title='Hapus'>
                    <Trash2
                      size={18}
                      style={{ color: "#ff4d4f", cursor: "pointer" }}
                    />
                  </Tooltip>
                </Popconfirm>,
              ]}
            >
              <Flex vertical align='flex-start'>
                {/* Header */}
                <Flex
                  align='center'
                  style={{ width: "100%", marginBottom: 12 }}
                >
                  <div style={styles.iconBox}>
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
                  </div>
                </Flex>

                {/* Subtitle */}
                <Text
                  type='secondary'
                  style={{ fontSize: 13, marginBottom: 8 }}
                >
                  Cabang: {item.branch_name || "-"}
                </Text>

                {/* Pill */}
                <div style={styles.statusPill}>
                  Kode: {item.code || "?"} • KKM: {item.kkm}
                </div>
              </Flex>
            </Card>
          </Badge.Ribbon>
        )}
      />

      {/* --- MODAL FORM --- */}
      <Modal
        title={
          <Flex align='center' gap={8}>
            {editingItem ? <Edit2 size={20} /> : <Plus size={20} />}
            <span>
              {editingItem ? "Edit Mata Pelajaran" : "Buat Mata Pelajaran Baru"}
            </span>
          </Flex>
        }
        open={isModalOpen}
        onCancel={handleClose}
        onOk={() => form.submit()}
        confirmLoading={isAdding || isUpdating}
        centered
        width={600}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout='vertical'
          initialValues={{ kkm: 75 }}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name='name'
            label='Nama Mata Pelajaran'
            rules={[{ required: true, message: "Nama wajib diisi" }]}
          >
            <Input
              placeholder='Contoh: Kitab Safinah'
              size='large'
              prefix={
                <BookOpen
                  size={16}
                  style={{ color: "#bfbfbf", marginRight: 8 }}
                />
              }
            />
          </Form.Item>

          <div
            style={{
              background: "#fafafa",
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
              border: "1px solid #f0f0f0",
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name='category_id'
                  label='Kategori'
                  rules={[{ required: true, message: "Pilih kategori" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    placeholder='Pilih Kategori'
                    options={categoriesData?.data?.map((c) => ({
                      label: c.name,
                      value: c.id,
                    }))}
                    onChange={(val) => {
                      setSelectedCategoryInForm(val);
                      form.setFieldValue("branch_id", null);
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name='branch_id'
                  label='Cabang (Opsional)'
                  style={{ marginBottom: 0 }}
                >
                  <Select
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
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='code' label='Kode Mapel'>
                <Input
                  placeholder='Contoh: MP-01'
                  prefix={
                    <Hash
                      size={16}
                      style={{ color: "#bfbfbf", marginRight: 8 }}
                    />
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='kkm'
                label='Nilai KKM'
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SubjectTable;
