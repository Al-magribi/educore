import React, { useState, useEffect } from "react";
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
} from "antd";
// 1. Import Icon dari lucide-react
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  Calendar,
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

const Periode = ({ screens }) => {
  const { user } = useSelector((state) => state.auth);
  // === STATE ===
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [listData, setListData] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  // === RTK QUERY HOOKS ===
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
  const [setActivePeriode, { isLoading: isSettingActive }] =
    useSetActivePeriodeMutation();

  // === EFFECT: INFINITE SCROLL DATA MERGE ===
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

  // === HANDLERS ===
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

  // === RENDER ITEM (CARD) ===
  const renderItem = (item) => (
    <Badge.Ribbon
      text={item.is_active ? "Aktif" : "Non-Aktif"}
      color={item.is_active ? "green" : "default"}
    >
      <Card
        hoverable
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
        styles={{ body: { flex: 1, padding: "16px" } }}
        actions={[
          // Tombol Aktifkan (Icon: CheckCircle)
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
                // Gunakan size 18 agar proporsional
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

          // Tombol Edit (Icon: Pencil)
          <Tooltip title='Edit Nama' key='edit'>
            <Button
              type='text'
              icon={<Pencil size={18} color='#faad14' />}
              onClick={() => handleOpenModal(item)}
            />
          </Tooltip>,

          // Tombol Hapus (Icon: Trash2)
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
          {/* Icon Utama Card (Icon: Calendar) */}
          <Calendar size={24} color='#1890ff' style={{ marginTop: 4 }} />

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
  );

  return (
    <div style={{ padding: 24 }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: screens.xs ? "flex-start" : "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Daftar Periode
        </Title>
        <Flex
          gap={8}
          vertical={!!screens.xs}
          align={screens.xs ? "stretch" : "center"}
          justify='flex-end'
          style={{ width: screens.xs ? "100%" : "auto" }}
        >
          <Input
            placeholder='Cari periode...'
            // Icon Search
            prefix={<Search size={16} color='#bfbfbf' />}
            allowClear
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: screens.xs ? "100%" : 260 }}
          />
          <Button
            type='primary'
            // Icon Plus
            icon={<Plus size={18} />}
            onClick={() => handleOpenModal(null)}
            style={{ width: screens.xs ? "100%" : "auto" }}
          >
            Tambah
          </Button>
        </Flex>
      </div>

      {/* INFINITE SCROLL LIST */}
      <InfiniteScrollList
        data={listData}
        loading={isFetching}
        hasMore={apiData?.hasMore}
        onLoadMore={handleLoadMore}
        renderItem={renderItem}
        emptyText='Belum ada data periode'
        grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4 }}
      />

      {/* MODAL FORM */}
      <Modal
        title={editingItem ? "Edit Periode" : "Tambah Periode Baru"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        confirmLoading={isAdding || isUpdating}
        destroyOnHidden
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <Form.Item
            name='name'
            label='Nama Periode'
            rules={[{ required: true, message: "Nama periode wajib diisi" }]}
            help='Contoh: 2025/2026 Ganjil'
          >
            <Input placeholder='Masukkan nama periode...' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Periode;
