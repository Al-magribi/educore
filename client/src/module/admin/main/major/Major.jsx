import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  Flex,
  Grid,
  Statistic,
  theme,
} from "antd";
import { Plus, Search, Pencil, Trash2, GitBranch, School } from "lucide-react";

import { InfiniteScrollList } from "../../../../components";
import {
  useGetMajorsQuery,
  useAddMajorMutation,
  useUpdateMajorMutation,
  useDeleteMajorMutation,
} from "../../../../service/main/ApiMajor";

const { Title, Text } = Typography;
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

const Major = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;
  const { token } = theme.useToken();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [listData, setListData] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

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

  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const totalMajors = listData.length;
  const withHomebaseCount = listData.filter((item) => item.homebase_name).length;
  const searchResultCount = search ? listData.length : totalMajors;
  const summaryCards = [
    {
      key: "total",
      title: "Total Jurusan",
      value: totalMajors,
      icon: <GitBranch size={18} />,
    },
    {
      key: "homebase",
      title: "Terkait Homebase",
      value: withHomebaseCount,
      icon: <School size={18} />,
    },
    {
      key: "result",
      title: "Hasil Pencarian",
      value: searchResultCount,
      icon: <Search size={18} />,
    },
  ];

  const renderItem = (item) => (
    <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
      <Card
        hoverable
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: token.borderRadiusXL,
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
        }}
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
          <div
            style={{
              background: "linear-gradient(135deg, #e6f7ff, #eff6ff)",
              padding: 12,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1890ff",
            }}
          >
            <GitBranch size={24} />
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
    </MotionDiv>
  );

  return (
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
              "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(248,250,252,0.98))",
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
                  color: "#1890ff",
                  fontWeight: 700,
                  letterSpacing: 0.4,
                }}
              >
                MANAJEMEN JURUSAN
              </Text>
              <Title level={4} style={{ margin: "6px 0 4px" }}>
                Daftar jurusan tampil lebih modern dan tetap fokus pada aksi.
              </Title>
              <Text type="secondary">
                Kelola jurusan dengan tampilan kartu yang lebih konsisten untuk
                desktop dan mobile.
              </Text>
            </div>

            <Button
              type="primary"
              icon={<Plus size={18} />}
              onClick={() => handleOpenModal(null)}
              size="large"
            >
              Tambah Jurusan
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
                hoverable
                style={{
                  borderRadius: token.borderRadiusXL,
                  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
                }}
                styles={{ body: { padding: "18px 20px" } }}
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
                      background: "linear-gradient(135deg, #e6f7ff, #eff6ff)",
                      color: "#1890ff",
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
          styles={{ body: { padding: isMobile ? 16 : 20 } }}
        >
          <Flex
            justify="space-between"
            align={activeScreens.md ? "center" : "stretch"}
            vertical={!activeScreens.md}
            gap={16}
          >
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Pencarian & Pengelolaan
              </Title>
              <Text type="secondary">
                Cari jurusan berdasarkan nama lalu lanjutkan edit atau hapus
                langsung dari daftar.
              </Text>
            </div>
            <Flex
              gap={8}
              vertical={isMobile}
              align={isMobile ? "stretch" : "center"}
              justify="flex-end"
              style={{ width: isMobile ? "100%" : "auto" }}
            >
              <Input
                placeholder="Cari jurusan..."
                prefix={<Search size={16} color="#bfbfbf" />}
                allowClear
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: isMobile ? "100%" : 280 }}
                size="large"
              />
              <Button
                type="primary"
                icon={<Plus size={18} />}
                onClick={() => handleOpenModal(null)}
                style={{ display: activeScreens.md ? "none" : "inline-flex" }}
                size="large"
              >
                Tambah
              </Button>
            </Flex>
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <InfiniteScrollList
          data={listData}
          loading={isFetching}
          hasMore={apiData?.hasMore}
          onLoadMore={handleLoadMore}
          renderItem={renderItem}
          emptyText="Belum ada data jurusan"
          grid={{
            gutter: [16, 16],
            xs: 24,
            sm: 12,
            md: 8,
            lg: 6,
            xl: 6,
            xxl: 4,
          }}
        />
      </MotionDiv>

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
    </MotionDiv>
  );
};

export default Major;
