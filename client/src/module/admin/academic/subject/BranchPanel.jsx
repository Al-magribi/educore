import React, { useState } from "react";
import { motion } from "framer-motion";
import { Form, Grid, Input, Select, Tag, message } from "antd";
import { GitBranch } from "lucide-react";
import {
  useGetSubjectBranchesQuery,
  useAddSubjectBranchMutation,
  useDeleteSubjectBranchMutation,
  useGetSubjectCategoriesQuery,
} from "../../../../service/academic/ApiSubject";
import { InfiniteScrollList } from "../../../../components";
import { DataListCard, DataRow, EditDeleteActions, FormModal } from "../../../../components/ui/muse/DataSection";
import { museColors } from "../../../../config/theme";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const BranchPanel = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData, isLoading } = useGetSubjectBranchesQuery(null);

  const [addBranch, { isLoading: isAdding }] = useAddSubjectBranchMutation();
  const [deleteBranch] = useDeleteSubjectBranchMutation();

  const handleAdd = async (values) => {
    try {
      await addBranch(values).unwrap();
      message.success("Cabang berhasil dibuat");
      setIsModalOpen(false);
      form.resetFields();
    } catch {
      message.error("Gagal membuat cabang");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBranch(id).unwrap();
      message.success("Cabang dihapus");
    } catch {
      message.error("Gagal menghapus cabang");
    }
  };

  const filteredData =
    branchesData?.data?.filter(
      (item) =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchText.toLowerCase()),
    ) || [];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <DataListCard
        title="Cabang Mata Pelajaran"
        description={isMobile ? undefined : "Turunan mapel per kategori"}
        count={filteredData.length}
        unit="cabang"
        searchProps={{
          placeholder: "Cari cabang atau kategori...",
          onChange: (e) => setSearchText(e.target.value),
        }}
        onAdd={() => setIsModalOpen(true)}
        addLabel="Tambah Cabang"
      >
        <InfiniteScrollList
          data={filteredData}
          loading={isLoading}
          hasMore={false}
          height="auto"
          emptyText={
            searchText
              ? "Cabang tidak ditemukan. Coba kata kunci lain."
              : "Belum ada cabang. Buat kategori dulu, lalu tambahkan cabangnya."
          }
          grid={{ gutter: [0, 0], xs: 24 }}
          renderItem={(item) => (
            <DataRow
              icon={<GitBranch size={18} />}
              tone="accentSoft"
              title={item.name}
              subtitle={item.description || "Tidak ada deskripsi"}
              tags={<Tag style={{ margin: 0 }}>{item.category_name || "Tanpa kategori"}</Tag>}
              actions={
                <EditDeleteActions
                  onDelete={() => handleDelete(item.id)}
                  deleteTitle={`Hapus cabang ${item.name}?`}
                  deleteDescription="Mapel di cabang ini bisa terdampak."
                />
              }
            />
          )}
        />
      </DataListCard>

      <FormModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        confirmLoading={isAdding}
        icon={<GitBranch size={16} />}
        title="Tambah Cabang"
        description="Setiap cabang berada di bawah satu kategori."
        okText="Buat Cabang"
      >
        <Form form={form} onFinish={handleAdd} layout="vertical">
          <Form.Item
            name="category_id"
            label="Kategori"
            rules={[{ required: true, message: "Kategori wajib dipilih" }]}
          >
            <Select
              placeholder="Pilih kategori"
              options={categoriesData?.data?.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Nama Cabang"
            rules={[{ required: true, message: "Nama cabang wajib diisi" }]}
          >
            <Input
              prefix={<GitBranch size={16} color={museColors.muted} />}
              placeholder="Contoh: Fiqih, Matematika Wajib"
            />
          </Form.Item>

          <Form.Item name="description" label="Deskripsi (opsional)">
            <Input.TextArea rows={3} placeholder="Keterangan singkat cabang mapel" />
          </Form.Item>
        </Form>
      </FormModal>
    </MotionDiv>
  );
};

export default BranchPanel;
