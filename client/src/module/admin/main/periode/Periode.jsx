import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  Button,
  Input,
  Tag,
  Typography,
  Modal,
  Form,
  message,
  Tooltip,
  Popconfirm,
  Badge,
  Flex,
  Grid,
  Statistic,
} from "antd";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  Calendar,
  FolderClock,
  Archive,
} from "lucide-react";

import { InfiniteScrollList } from "../../../../components";
import {
  useGetPeriodesQuery,
  useAddPeriodeMutation,
  useUpdatePeriodeMutation,
  useDeletePeriodeMutation,
  useSetActivePeriodeMutation,
} from "../../../../service/main/ApiPeriode";
import { useSelector } from "react-redux";

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

const Periode = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;
  const { user } = useSelector((state) => state.auth);

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
  } = useGetPeriodesQuery({
    page,
    limit: 10,
    search,
    homebase_id: user?.homebase_id,
  });

  const [addPeriode, { isLoading: isAdding }] = useAddPeriodeMutation();
  const [updatePeriode, { isLoading: isUpdating }] = useUpdatePeriodeMutation();
  const [deletePeriode, { isLoading: isDeleting }] = useDeletePeriodeMutation();
  const [setActivePeriode] = useSetActivePeriodeMutation();

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
        await updatePeriode({
          id: editingItem.id,
          name: values.name,
          homebase_id: user?.homebase_id,
        }).unwrap();
        message.success("Periode berhasil diperbarui");
      } else {
        await addPeriode({
          name: values.name,
          homebase_id: user?.homebase_id,
        }).unwrap();
        message.success("Periode berhasil ditambahkan");
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
      await deletePeriode(id).unwrap();
      message.success("Periode dihapus");
      setPage(1);
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus");
    }
  };

  const handleSetActive = async (id) => {
    try {
      await setActivePeriode(id).unwrap();
      message.success("Periode aktif berhasil diubah");
      setPage(1);
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengaktifkan");
    }
  };

  const totalPeriodes = apiData?.totalData || listData.length || 0;
  const activePeriodeCount = listData.filter((item) => item.is_active).length;
  const archivedPeriodeCount = Math.max(totalPeriodes - activePeriodeCount, 0);
  const summaryCards = [
    {
      key: "total",
      title: "Total Periode",
      value: totalPeriodes,
      icon: <FolderClock size={18} />,
    },
    {
      key: "active",
      title: "Periode Aktif",
      value: activePeriodeCount,
      icon: <CheckCircle size={18} />,
    },
    {
      key: "archive",
      title: "Arsip",
      value: archivedPeriodeCount,
      icon: <Archive size={18} />,
    },
  ];

  const renderItem = (item) => (
    <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
      <Badge.Ribbon
        text={item.is_active ? "Aktif" : "Non-Aktif"}
        color={item.is_active ? "green" : "default"}
      >
        <Card
          hoverable
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRadius: 22,
            boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { flex: 1, padding: "16px" } }}
          actions={[
            <Popconfirm
              key="activate"
              title="Aktifkan periode ini?"
              description="Periode lain dalam satu homebase akan dinonaktifkan."
              onConfirm={() => handleSetActive(item.id)}
              disabled={item.is_active}
              okText="Ya, Aktifkan"
              cancelText="Batal"
            >
              <Tooltip
                title={item.is_active ? "Sudah Aktif" : "Set sebagai Aktif"}
              >
                <Button
                  type="text"
                  icon={
                    <CheckCircle
                      size={18}
                      color={item.is_active ? "#52c41a" : undefined}
                    />
                  }
                  disabled={item.is_active}
                />
              </Tooltip>
            </Popconfirm>,
            <Tooltip title="Edit Nama" key="edit">
              <Button
                type="text"
                icon={<Pencil size={18} color="#faad14" />}
                onClick={() => handleOpenModal(item)}
              />
            </Tooltip>,
            <Popconfirm
              key="delete"
              title="Hapus periode?"
              description="Data tidak dapat dikembalikan."
              onConfirm={() => handleDelete(item.id)}
              okText="Ya, Hapus"
              cancelText="Batal"
              disabled={item.is_active}
            >
              <Button
                type="text"
                danger
                icon={<Trash2 size={18} />}
                disabled={item.is_active}
                loading={isDeleting}
              />
            </Popconfirm>,
          ]}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
                color: "#7c3aed",
                flexShrink: 0,
              }}
            >
              <Calendar size={22} />
            </div>

            <div>
              <Title level={5} style={{ margin: 0 }}>
                {item.name}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Homebase: {item.homebase_name || "-"}
              </Text>
              <div style={{ marginTop: 8 }}>
                {item.is_active ? (
                  <Tag color="success">Sedang Berlangsung</Tag>
                ) : (
                  <Tag color="default">Arsip</Tag>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Badge.Ribbon>
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
              borderRadius: 24,
              overflow: "hidden",
              background:
                "linear-gradient(135deg, rgba(245,243,255,0.98), rgba(238,242,255,0.98))",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
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
                    color: "#7c3aed",
                    fontWeight: 700,
                    letterSpacing: 0.4,
                  }}
                >
                  MANAJEMEN PERIODE
                </Text>
                <Title level={4} style={{ margin: "6px 0 4px" }}>
                  Pengelolaan periode akademik dibuat lebih jelas dan fokus.
                </Title>
                <Text type="secondary">
                  Cari periode, aktifkan, edit, atau tambahkan data baru dari
                  panel yang responsif.
                </Text>
              </div>
              <Button
                type="primary"
                icon={<Plus size={18} />}
                onClick={() => handleOpenModal(null)}
                size="large"
              >
                Tambah Periode
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
                    borderRadius: 22,
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
                        background: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
                        color: "#7c3aed",
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
              borderRadius: 22,
              boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
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
                  Pencarian & Aktivasi Periode
                </Title>
                <Text type="secondary">
                  Temukan periode lebih cepat lalu lakukan aktivasi atau
                  pengelolaan langsung dari daftar.
                </Text>
              </div>
              <Flex
                gap={10}
                vertical={!activeScreens.md}
                style={{ width: !activeScreens.md ? "100%" : "auto" }}
              >
                <Input
                  placeholder="Cari periode..."
                  prefix={<Search size={16} color="rgba(0,0,0,.25)" />}
                  allowClear
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: !activeScreens.md ? "100%" : 300 }}
                  size="large"
                />
                <Button
                  type="primary"
                  icon={<Plus size={18} />}
                  onClick={() => handleOpenModal(null)}
                  size="large"
                  style={{ display: activeScreens.md ? "none" : "inline-flex" }}
                >
                  Tambah Periode
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
            emptyText="Belum ada data periode"
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
      </MotionDiv>

      <Modal
        title={editingItem ? "Edit Periode" : "Tambah Periode Baru"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        confirmLoading={isAdding || isUpdating}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Nama Periode"
            rules={[{ required: true, message: "Nama periode wajib diisi" }]}
            help="Contoh: 2025/2026 Ganjil"
          >
            <Input placeholder="Masukkan nama periode..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Periode;
