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
  theme,
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
  Loader2,
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
  const modalTitle = editingItem
    ? "Edit Periode Akademik"
    : "Tambah Periode Baru";
  const modalDescription = editingItem
    ? "Perbarui nama periode agar tetap konsisten dengan kalender akademik yang berjalan."
    : "Tambahkan periode akademik baru untuk menjaga pengelolaan semester tetap rapi dan terstruktur.";
  const submitButtonLabel = editingItem ? "Simpan Perubahan" : "Buat Periode";
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
              key='activate'
              title='Aktifkan periode ini?'
              description='Periode lain dalam satu homebase akan dinonaktifkan.'
              onConfirm={() => handleSetActive(item.id)}
              disabled={item.is_active}
              okText='Ya, Aktifkan'
              cancelText='Batal'
            >
              <Tooltip
                title={item.is_active ? "Sudah Aktif" : "Set sebagai Aktif"}
              >
                <Button
                  type='text'
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
            <Tooltip title='Edit Nama' key='edit'>
              <Button
                type='text'
                icon={<Pencil size={18} color='#faad14' />}
                onClick={() => handleOpenModal(item)}
              />
            </Tooltip>,
            <Popconfirm
              key='delete'
              title='Hapus periode?'
              description='Data tidak dapat dikembalikan.'
              onConfirm={() => handleDelete(item.id)}
              okText='Ya, Hapus'
              cancelText='Batal'
              disabled={item.is_active}
            >
              <Button
                type='text'
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
              <Text type='secondary' style={{ fontSize: 12 }}>
                Homebase: {item.homebase_name || "-"}
              </Text>
              <div style={{ marginTop: 8 }}>
                {item.is_active ? (
                  <Tag color='success'>Sedang Berlangsung</Tag>
                ) : (
                  <Tag color='default'>Arsip</Tag>
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
        initial='hidden'
        animate='visible'
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <MotionDiv variants={itemVariants}>
          <Card
            variant='borderless'
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
              justify='space-between'
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
                  Pengelolaan Periode Akademik
                </Title>
                <Text type='secondary'>
                  Cari periode, aktifkan, edit, atau tambahkan data baru.
                </Text>
              </div>
              <Button
                type='primary'
                icon={<Plus size={18} />}
                onClick={() => handleOpenModal(null)}
                size='large'
              >
                Tambah Periode
              </Button>
            </Flex>
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Flex gap={16} wrap='wrap'>
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
                  <Flex justify='space-between' align='start'>
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
            variant='borderless'
            style={{
              borderRadius: 22,
              boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
            }}
            styles={{ body: { padding: isMobile ? 16 : 20 } }}
          >
            <Flex
              justify='space-between'
              align={activeScreens.md ? "center" : "stretch"}
              vertical={!activeScreens.md}
              gap={16}
            >
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Pencarian & Aktivasi Periode
                </Title>
                <Text type='secondary'>
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
                  placeholder='Cari periode...'
                  prefix={<Search size={16} color='rgba(0,0,0,.25)' />}
                  allowClear
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: !activeScreens.md ? "100%" : 300 }}
                  size='large'
                />
                <Button
                  type='primary'
                  icon={<Plus size={18} />}
                  onClick={() => handleOpenModal(null)}
                  size='large'
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
            emptyText='Belum ada data periode'
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
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        closable={false}
        centered
        width={isMobile ? "calc(100vw - 24px)" : 640}
        styles={{
          content: {
            padding: 0,
            overflow: "hidden",
            borderRadius: 28,
            boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
          },
          body: {
            padding: 0,
          },
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
        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(245,243,255,1), rgba(238,242,255,0.96))",
              padding: isMobile ? 20 : 28,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex align='flex-start' gap={16}>
              <div
                style={{
                  width: isMobile ? 48 : 56,
                  height: isMobile ? 48 : 56,
                  borderRadius: 18,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  color: "#fff",
                  boxShadow: "0 16px 30px rgba(99, 102, 241, 0.28)",
                  flexShrink: 0,
                }}
              >
                {editingItem ? <Pencil size={22} /> : <Calendar size={22} />}
              </div>

              <div style={{ flex: 1 }}>
                <Flex
                  justify='space-between'
                  align={isMobile ? "flex-start" : "center"}
                  vertical={isMobile}
                  gap={10}
                >
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {modalTitle}
                    </Title>
                    <Text
                      type='secondary'
                      style={{ display: "block", marginTop: 6 }}
                    >
                      {modalDescription}
                    </Text>
                  </div>
                  <Tag
                    variant='borderless'
                    style={{
                      marginInlineEnd: 0,
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontWeight: 600,
                      color: "#4338ca",
                      background: "rgba(99, 102, 241, 0.10)",
                    }}
                  >
                    {editingItem ? "Edit" : "Baru"}
                  </Tag>
                </Flex>
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
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: "#ffffff",
                  padding: isMobile ? 16 : 18,
                }}
              >
                <Form.Item
                  name='name'
                  label='Nama Periode'
                  rules={[
                    { required: true, message: "Nama periode wajib diisi" },
                  ]}
                  help='Contoh: 2025/2026 Ganjil'
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    size='large'
                    prefix={<Calendar size={16} color='#7c3aed' />}
                    placeholder='Masukkan nama periode akademik'
                    style={{
                      borderRadius: 14,
                      paddingBlock: 8,
                    }}
                  />
                </Form.Item>
              </div>

              <div
                style={{
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #faf5ff, #eef2ff)",
                  border: "1px solid rgba(99, 102, 241, 0.14)",
                  padding: isMobile ? 16 : 18,
                }}
              >
                <Flex align='flex-start' gap={12}>
                  <CheckCircle
                    size={18}
                    color='#4f46e5'
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>
                      Tips penamaan
                    </Text>
                    <Text type='secondary'>
                      Gunakan format konsisten agar mudah dicari, diaktifkan,
                      dan dibedakan dari arsip.
                    </Text>
                  </div>
                </Flex>
              </div>

              <Flex
                justify='flex-end'
                gap={10}
                vertical={isMobile}
                style={{ marginTop: 4 }}
              >
                <Button
                  size='large'
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    borderRadius: 14,
                    minWidth: isMobile ? "100%" : 120,
                  }}
                >
                  Batal
                </Button>
                <Button
                  type='primary'
                  htmlType='submit'
                  size='large'
                  loading={isAdding || isUpdating}
                  icon={
                    isAdding || isUpdating ? (
                      <Loader2 className='animate-spin' size={16} />
                    ) : editingItem ? (
                      <Pencil size={16} />
                    ) : (
                      <Plus size={16} />
                    )
                  }
                  style={{
                    borderRadius: 14,
                    minWidth: isMobile ? "100%" : 190,
                    boxShadow: "0 12px 24px rgba(79, 70, 229, 0.22)",
                  }}
                >
                  {submitButtonLabel}
                </Button>
              </Flex>
            </MotionDiv>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default Periode;
