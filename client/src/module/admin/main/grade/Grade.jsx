import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Form, Input, message } from "antd";
import { GraduationCap, Pencil } from "lucide-react";
import { InfiniteScrollList } from "../../../../components";
import {
  useGetGradesQuery,
  useAddGradeMutation,
  useEditGradeMutation,
  useDeleteGradeMutation,
} from "../../../../service/main/ApiGrade";
import { DataListCard, DataRow, EditDeleteActions, FormModal } from "../../../../components/ui/muse/DataSection";
import { museColors } from "../../../../config/theme";

const MotionDiv = motion.div;

const Grade = () => {
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

  const renderGradeItem = (item) => (
    <DataRow
      icon={<GraduationCap size={18} />}
      title={item.name}
      subtitle='Tingkat kelas'
      actions={
        <EditDeleteActions
          onEdit={() => openModal(item)}
          onDelete={() => handleDelete(item.id)}
          deleteTitle={`Hapus tingkat ${item.name}?`}
          deleteDescription='Kelas yang memakai tingkat ini bisa terdampak.'
          deleting={isDeleting}
        />
      }
    />
  );

  return (
    <>
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <DataListCard
          title='Daftar Tingkat'
          count={totalGrades}
          unit='tingkat'
          searchProps={{
            placeholder: "Cari tingkat...",
            onSearch: handleSearch,
            onChange: (e) => {
              if (!e.target.value) handleSearch("");
            },
          }}
          onAdd={() => openModal(null)}
          addLabel='Tambah Tingkat'
        >
          <InfiniteScrollList
            data={allItems}
            loading={isFetching}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            renderItem={renderGradeItem}
            height='auto'
            emptyText='Belum ada tingkat. Tambahkan tingkat pertama, misalnya "Kelas 7".'
            grid={{ gutter: [0, 0], xs: 24 }}
          />
        </DataListCard>
      </MotionDiv>

      <FormModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        confirmLoading={isAdding || isEditing}
        icon={editingItem ? <Pencil size={16} /> : <GraduationCap size={16} />}
        title={editingItem ? "Edit Tingkat" : "Tambah Tingkat Baru"}
        description='Nama tingkat dipakai saat membuat kelas.'
        okText={editingItem ? "Simpan Perubahan" : "Buat Tingkat"}
      >
        <Form form={form} layout='vertical' onFinish={handleSave}>
          <Form.Item
            label='Nama Tingkat'
            name='name'
            rules={[{ required: true, message: "Nama tingkat wajib diisi" }]}
            extra='Contoh: Kelas 7, X, atau Tingkat 1'
          >
            <Input
              prefix={<GraduationCap size={16} color={museColors.muted} />}
              placeholder='Masukkan nama tingkat'
            />
          </Form.Item>
        </Form>
      </FormModal>
    </>
  );
};

export default Grade;
