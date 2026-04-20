import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  Button,
  Input,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  theme,
  Flex,
  Grid,
  Statistic,
} from "antd";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GraduationCap,
  Layers3,
  Search,
} from "lucide-react";
import { InfiniteScrollList } from "../../../../components";
import {
  useGetGradesQuery,
  useAddGradeMutation,
  useEditGradeMutation,
  useDeleteGradeMutation,
} from "../../../../service/main/ApiGrade";

const { Search: AntSearch } = Input;
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

const Grade = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data, isFetching } = useGetGradesQuery({ page, limit: 12, search });
  const [addGrade, { isLoading: isAdding }] = useAddGradeMutation();
  const [editGrade, { isLoading: isEditing }] = useEditGradeMutation();
  const [deleteGrade, { isLoading: isDeleting }] = useDeleteGradeMutation();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllItems(data.data);
      } else {
        setAllItems((prev) => [...prev, ...data.data]);
      }
      setHasMore(page < data.meta.totalPages);
    }
  }, [data, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
    setAllItems([]);
  };

  const handleDelete = async (id) => {
    try {
      await deleteGrade(id).unwrap();
      message.success("Data berhasil dihapus");
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
      setPage(1);
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

  const totalGrades = data?.meta?.totalData || allItems.length || 0;
  const loadedGrades = allItems.length;
  const remainingGrades = Math.max(totalGrades - loadedGrades, 0);
  const summaryCards = [
    {
      key: "total",
      title: "Total Tingkat",
      value: totalGrades,
      icon: <GraduationCap size={18} />,
    },
    {
      key: "loaded",
      title: "Data Dimuat",
      value: loadedGrades,
      icon: <Layers3 size={18} />,
    },
    {
      key: "remaining",
      title: "Sisa Data",
      value: remainingGrades,
      icon: <Search size={18} />,
    },
  ];

  const renderGradeItem = (item) => (
    <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
      <Card
        hoverable
        style={{
          height: "100%",
          borderRadius: token.borderRadiusXL,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: "16px" } }}
        actions={[
          <Tooltip title="Edit Data" key="edit">
            <Button
              type="text"
              icon={<Pencil size={16} className="text-yellow-600" />}
              onClick={() => openModal(item)}
              block
            />
          </Tooltip>,
          <Tooltip title="Hapus Data" key="delete">
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
              width: 44,
              height: 44,
              borderRadius: 16,
              background: "linear-gradient(135deg, #fef3c7, #ffedd5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#b45309",
            }}
          >
            <GraduationCap size={20} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tingkat Kelas
            </Text>
            <div style={{ fontSize: 18, fontWeight: "bold", lineHeight: 1.2 }}>
              {item.name}
            </div>
          </div>
        </div>
      </Card>
    </MotionDiv>
  );

  return (
    <>
      <MotionDiv
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <MotionDiv variants={itemVariants}>
          <Card
            bordered={false}
            style={{
              borderRadius: token.borderRadiusXL,
              overflow: "hidden",
              background:
                "linear-gradient(135deg, rgba(255,251,235,0.98), rgba(255,247,237,0.98))",
              boxShadow: token.boxShadowTertiary,
            }}
            styles={{ body: { padding: isMobile ? 18 : 24 } }}
          >
            <Flex
              justify="space-between"
              align={activeScreens.md ? "center" : "stretch"}
              vertical={!activeScreens.md}
              gap={16}
            >
              <div>
                <Text
                  style={{
                    color: "#b45309",
                    fontWeight: 700,
                    letterSpacing: 0.4,
                  }}
                >
                  MANAJEMEN TINGKAT
                </Text>
                <Title level={4} style={{ margin: "6px 0 4px" }}>
                  Struktur tingkat tampil lebih rapi untuk proses administrasi.
                </Title>
                <Text type="secondary">
                  Cari tingkat kelas yang ada atau tambahkan level baru tanpa
                  mengubah alur kerja saat ini.
                </Text>
              </div>

              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => openModal(null)}
                size="large"
              >
                Tambah Tingkat
              </Button>
            </Flex>
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Flex gap={16} wrap="wrap">
            {summaryCards.map((item) => (
              <MotionDiv
                key={item.key}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18 }}
                style={{
                  flex: activeScreens.md ? "1 1 0" : "1 1 100%",
                  minWidth: activeScreens.md ? 0 : "100%",
                }}
              >
                <Card
                  style={{
                    borderRadius: token.borderRadiusXL,
                    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
                  }}
                  styles={{ body: { padding: "18px 20px" } }}
                  hoverable
                >
                  <Flex justify="space-between" align="start">
                    <Statistic title={item.title} value={item.value} />
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 14,
                        background: "linear-gradient(135deg, #fef3c7, #ffedd5)",
                        color: "#b45309",
                      }}
                    >
                      {item.icon}
                    </div>
                  </Flex>
                </Card>
              </MotionDiv>
            ))}
          </Flex>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            hoverable
            bordered={false}
            style={{
              borderRadius: token.borderRadiusXL,
              boxShadow: token.boxShadowSecondary,
            }}
            styles={{ body: { padding: activeScreens.md ? 20 : 16 } }}
          >
            <Flex
              justify="space-between"
              align={activeScreens.md ? "center" : "stretch"}
              vertical={!activeScreens.md}
              gap={16}
            >
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Pencarian Data Tingkat
                </Title>
                <Text type="secondary">
                  Filter daftar tingkat dengan cepat dari toolbar yang lebih
                  bersih.
                </Text>
              </div>

              <Flex
                gap={10}
                vertical={!activeScreens.md}
                style={{ width: !activeScreens.md ? "100%" : "auto" }}
              >
                <AntSearch
                  placeholder="Cari tingkat..."
                  onSearch={handleSearch}
                  allowClear
                  style={{ width: !activeScreens.md ? "100%" : 300 }}
                  size="large"
                />
                <Button
                  type="primary"
                  icon={<Plus size={16} />}
                  onClick={() => openModal(null)}
                  size="large"
                  style={{ display: activeScreens.md ? "none" : "inline-flex" }}
                >
                  Tambah Tingkat
                </Button>
              </Flex>
            </Flex>
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
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
        </MotionDiv>
      </MotionDiv>

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
    </>
  );
};

export default Grade;
