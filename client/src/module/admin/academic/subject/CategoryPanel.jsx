import React, { useState } from "react";
import { motion } from "framer-motion";
import { Form, Grid, Input, message } from "antd";
import { Edit2, Layers } from "lucide-react";
import {
  useGetSubjectCategoriesQuery,
  useAddSubjectCategoryMutation,
  useUpdateSubjectCategoryMutation,
  useDeleteSubjectCategoryMutation,
} from "../../../../service/academic/ApiSubject";
import { InfiniteScrollList } from "../../../../components";
import { DataListCard, DataRow, EditDeleteActions, FormModal } from "../../../../components/ui/muse/DataSection";
import { museColors } from "../../../../config/theme";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const CategoryPanel = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useGetSubjectCategoriesQuery();
  const [addCategory, { isLoading: isAdding }] =
    useAddSubjectCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] =
    useUpdateSubjectCategoryMutation();
  const [deleteCategory] = useDeleteSubjectCategoryMutation();

  const isSaving = isAdding || isUpdating;

  const handleOpenAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    form.setFieldsValue({ name: item.name });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      if (editingItem) {
        await updateCategory({ id: editingItem.id, ...values }).unwrap();
        message.success("Kategori berhasil diperbarui");
      } else {
        await addCategory(values).unwrap();
        message.success("Kategori berhasil dibuat");
      }
      handleClose();
    } catch {
      message.error(
        editingItem ? "Gagal memperbarui kategori" : "Gagal membuat kategori",
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id).unwrap();
      message.success("Kategori dihapus");
    } catch {
      message.error("Gagal menghapus kategori");
    }
  };

  const categories = data?.data || [];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <DataListCard
        title="Kategori Mata Pelajaran"
        description={isMobile ? undefined : "Pengelompokan utama mapel"}
        count={categories.length}
        unit="kategori"
        onAdd={handleOpenAdd}
        addLabel="Tambah Kategori"
      >
        <InfiniteScrollList
          data={categories}
          loading={isLoading}
          hasMore={false}
          height="auto"
          emptyText="Belum ada kategori. Contoh: Umum, Diniyah, Muatan Lokal."
          grid={{ gutter: [0, 0], xs: 24 }}
          renderItem={(item) => (
            <DataRow
              icon={<Layers size={18} />}
              tone="warning"
              title={item.name}
              subtitle="Kategori utama"
              actions={
                <EditDeleteActions
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                  deleteTitle={`Hapus kategori ${item.name}?`}
                  deleteDescription="Cabang dan mapel terkait bisa terdampak."
                />
              }
            />
          )}
        />
      </DataListCard>

      <FormModal
        open={isModalOpen}
        onCancel={handleClose}
        onOk={form.submit}
        confirmLoading={isSaving}
        icon={editingItem ? <Edit2 size={16} /> : <Layers size={16} />}
        title={editingItem ? "Edit Kategori" : "Tambah Kategori"}
        description="Nama ringkas dan konsisten memudahkan pengelompokan cabang mapel."
        okText={editingItem ? "Simpan Perubahan" : "Buat Kategori"}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="Nama Kategori"
            rules={[{ required: true, message: "Nama kategori wajib diisi" }]}
          >
            <Input
              prefix={<Layers size={16} color={museColors.muted} />}
              placeholder="Contoh: Diniyah, Umum"
            />
          </Form.Item>
        </Form>
      </FormModal>
    </MotionDiv>
  );
};

export default CategoryPanel;
