import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button, Form, Grid, Input, Popconfirm, Tag, message } from "antd";
import { Archive, Calendar, CheckCircle, FolderClock, Pencil } from "lucide-react";

import { InfiniteScrollList } from "../../../../components";
import {
  useGetPeriodesQuery,
  useAddPeriodeMutation,
  useUpdatePeriodeMutation,
  useDeletePeriodeMutation,
  useSetActivePeriodeMutation,
} from "../../../../service/main/ApiPeriode";
import { useSelector } from "react-redux";
import { StatCard } from "../../../../components/ui/muse";
import { DataListCard, DataRow, EditDeleteActions, FormModal } from "../../../../components/ui/muse/DataSection";
import { museColors } from "../../../../config/theme";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

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
  const activePeriode = listData.find((item) => item.is_active);
  const activePeriodeCount = listData.filter((item) => item.is_active).length;
  const archivedPeriodeCount = Math.max(totalPeriodes - activePeriodeCount, 0);

  const renderItem = (item) => (
    <DataRow
      icon={<Calendar size={18} />}
      tone={item.is_active ? "primary" : "primarySoft"}
      title={item.name}
      subtitle={`Satuan: ${item.homebase_name || "-"}`}
      tags={
        item.is_active ? (
          <Tag color='success' style={{ margin: 0 }}>
            Sedang berlangsung
          </Tag>
        ) : (
          <Tag style={{ margin: 0 }}>Arsip</Tag>
        )
      }
      actions={
        <>
          {!item.is_active ? (
            <Popconfirm
              title={`Aktifkan ${item.name}?`}
              description='Periode lain di satuan ini akan dinonaktifkan.'
              onConfirm={() => handleSetActive(item.id)}
              okText='Ya, Aktifkan'
              cancelText='Batal'
            >
              <Button size='small' icon={<CheckCircle size={14} />}>
                {isMobile ? null : "Aktifkan"}
              </Button>
            </Popconfirm>
          ) : null}
          <EditDeleteActions
            onEdit={() => handleOpenModal(item)}
            onDelete={() => handleDelete(item.id)}
            deleteTitle={`Hapus periode ${item.name}?`}
            deleting={isDeleting}
            deleteDisabled={item.is_active}
            deleteDisabledReason='Periode aktif tidak bisa dihapus'
          />
        </>
      }
    />
  );

  return (
    <>
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}
      >
        <div
          style={{
            display: "grid",
            gap: isMobile ? 16 : 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <StatCard
            title='Periode Aktif'
            value={activePeriode?.name || "Belum ada"}
            icon={<CheckCircle size={24} />}
            tone={activePeriode ? "primary" : "warning"}
          />
          <StatCard title='Total Periode' value={totalPeriodes} icon={<FolderClock size={24} />} tone='navy' />
          <StatCard title='Arsip' value={archivedPeriodeCount} icon={<Archive size={24} />} tone='accent' />
        </div>

        <DataListCard
          title='Daftar Periode'
          count={totalPeriodes}
          unit='periode'
          searchProps={{
            placeholder: "Cari periode...",
            onChange: (e) => setSearch(e.target.value),
          }}
          onAdd={() => handleOpenModal(null)}
          addLabel='Tambah Periode'
        >
          <InfiniteScrollList
            data={listData}
            loading={isFetching}
            hasMore={apiData?.hasMore}
            onLoadMore={handleLoadMore}
            renderItem={renderItem}
            height='auto'
            emptyText='Belum ada periode. Tambahkan periode ajaran pertama.'
            grid={{ gutter: [0, 0], xs: 24 }}
          />
        </DataListCard>
      </MotionDiv>

      <FormModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        confirmLoading={isAdding || isUpdating}
        icon={editingItem ? <Pencil size={16} /> : <Calendar size={16} />}
        title={editingItem ? "Edit Periode Akademik" : "Tambah Periode Baru"}
        description='Gunakan format konsisten agar mudah dicari dan dibedakan dari arsip.'
        okText={editingItem ? "Simpan Perubahan" : "Buat Periode"}
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <Form.Item
            name='name'
            label='Nama Periode'
            rules={[{ required: true, message: "Nama periode wajib diisi" }]}
            extra='Contoh: 2025/2026'
          >
            <Input
              prefix={<Calendar size={16} color={museColors.muted} />}
              placeholder='Masukkan nama periode akademik'
            />
          </Form.Item>
        </Form>
      </FormModal>
    </>
  );
};

export default Periode;
