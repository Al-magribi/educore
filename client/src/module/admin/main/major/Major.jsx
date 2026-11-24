import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Form, Input, message } from "antd";
import { GitBranch, Pencil } from "lucide-react";

import { InfiniteScrollList } from "../../../../components";
import {
  useGetMajorsQuery,
  useAddMajorMutation,
  useUpdateMajorMutation,
  useDeleteMajorMutation,
} from "../../../../service/main/ApiMajor";
import { DataListCard, DataRow, EditDeleteActions, FormModal } from "../../../../components/ui/muse/DataSection";
import { museColors } from "../../../../config/theme";

const MotionDiv = motion.div;

const Major = () => {

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

  const renderItem = (item) => (
    <DataRow
      icon={<GitBranch size={18} />}
      title={item.name}
      subtitle={item.homebase_name || "Satuan pendidikan"}
      actions={
        <EditDeleteActions
          onEdit={() => handleOpenModal(item)}
          onDelete={() => handleDelete(item.id)}
          deleteTitle={`Hapus jurusan ${item.name}?`}
          deleteDescription='Pastikan tidak ada kelas yang terhubung.'
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
          title='Daftar Jurusan'
          count={totalMajors}
          unit='jurusan'
          searchProps={{
            placeholder: "Cari jurusan...",
            onChange: (e) => setSearch(e.target.value),
          }}
          onAdd={() => handleOpenModal(null)}
          addLabel='Tambah Jurusan'
        >
          <InfiniteScrollList
            data={listData}
            loading={isFetching}
            hasMore={apiData?.hasMore}
            onLoadMore={handleLoadMore}
            renderItem={renderItem}
            height='auto'
            emptyText='Belum ada jurusan. Tambahkan program studi pertama.'
            grid={{ gutter: [0, 0], xs: 24 }}
          />
        </DataListCard>
      </MotionDiv>

      <FormModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        confirmLoading={isAdding || isUpdating}
        icon={editingItem ? <Pencil size={16} /> : <GitBranch size={16} />}
        title={editingItem ? "Edit Jurusan" : "Tambah Jurusan Baru"}
        description='Nama jurusan dipakai saat membuat kelas.'
        okText={editingItem ? "Simpan Perubahan" : "Buat Jurusan"}
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <Form.Item
            name='name'
            label='Nama Jurusan'
            rules={[{ required: true, message: "Nama jurusan wajib diisi" }]}
            extra='Contoh: IPA, IPS, atau Teknik Komputer Jaringan'
          >
            <Input
              prefix={<GitBranch size={16} color={museColors.muted} />}
              placeholder='Masukkan nama jurusan'
            />
          </Form.Item>
        </Form>
      </FormModal>
    </>
  );
};

export default Major;
