import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button, Col, Form, Grid, Input, InputNumber, Row, Select, Tag, message } from "antd";
import { BookOpen, Edit2, GitBranch, Hash, Layers, Upload } from "lucide-react";
import {
  useGetSubjectsQuery,
  useAddSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetSubjectCategoriesQuery,
  useGetSubjectBranchesQuery,
} from "../../../../service/academic/ApiSubject";
import { InfiniteScrollList } from "../../../../components";
import SubjectImportDrawer from "./SubjectImportDrawer";
import { DataListCard, DataRow, EditDeleteActions, FormModal } from "../../../../components/ui/muse/DataSection";
import { museColors } from "../../../../config/theme";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const CATEGORY_COLORS = ["blue", "green", "gold", "purple", "cyan", "orange"];

const getCategoryStyle = (categoryName) => {
  const source = (categoryName || "umum").toString().trim().toLowerCase();
  const index =
    source.split("").reduce((total, char) => total + char.charCodeAt(0), 0) %
    CATEGORY_COLORS.length;

  return { ribbon: CATEGORY_COLORS[index] };
};

const SubjectTable = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;

  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterBranch, setFilterBranch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [allSubjects, setAllSubjects] = useState([]);
  const [form] = Form.useForm();
  const [selectedCategoryInForm, setSelectedCategoryInForm] = useState(null);

  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData } = useGetSubjectBranchesQuery(null);
  const { data: subjectsData, isFetching } = useGetSubjectsQuery({
    page,
    limit,
    search: searchText,
    category_id: filterCategory || "",
    branch_id: filterBranch || "",
  });

  const [addSubject, { isLoading: isAdding }] = useAddSubjectMutation();
  const [updateSubject, { isLoading: isUpdating }] = useUpdateSubjectMutation();
  const [deleteSubject] = useDeleteSubjectMutation();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (subjectsData?.data) {
      if (page === 1) {
        setAllSubjects(subjectsData.data);
      } else {
        setAllSubjects((prev) => {
          const newItems = subjectsData.data.filter(
            (newItem) =>
              !prev.some((existingItem) => existingItem.id === newItem.id),
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [subjectsData, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLoadMore = () => {
    if (!isFetching && allSubjects.length < (subjectsData?.total || 0)) {
      setPage((prev) => prev + 1);
    }
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      kkm: record.kkm,
      category_id: record.category_id,
      branch_id: record.branch_id,
    });
    setSelectedCategoryInForm(record.category_id);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setSelectedCategoryInForm(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        category_id: values.category_id,
        branch_id: values.branch_id || null,
      };
      if (editingItem) {
        await updateSubject({ id: editingItem.id, ...payload }).unwrap();
        message.success("Mapel berhasil diperbarui");
        setPage(1);
      } else {
        await addSubject(payload).unwrap();
        message.success("Mapel berhasil ditambahkan");
        setPage(1);
      }
      handleClose();
    } catch {
      message.error("Gagal menyimpan mapel");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSubject(id).unwrap();
      message.success("Mapel dihapus");
      setPage(1);
    } catch {
      message.error("Gagal menghapus mapel");
    }
  };

  const formBranches =
    branchesData?.data?.filter(
      (b) => b.category_id === selectedCategoryInForm,
    ) || [];

  const filterBranchesList = filterCategory
    ? branchesData?.data?.filter((b) => b.category_id === filterCategory)
    : branchesData?.data;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <DataListCard
        title='Direktori Mata Pelajaran'
        count={subjectsData?.total || allSubjects.length}
        unit='mapel'
        searchProps={{
          placeholder: "Cari mata pelajaran...",
          onChange: (e) => {
            setSearchText(e.target.value);
            setPage(1);
          },
        }}
        extra={
          <>
            <Select
              aria-label='Filter kategori'
              placeholder='Semua kategori'
              allowClear
              style={{ width: isMobile ? "100%" : 170 }}
              value={filterCategory}
              onChange={(val) => {
                setFilterCategory(val);
                setFilterBranch(null);
                setPage(1);
              }}
              options={categoriesData?.data?.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
              prefix={<Layers size={14} color={museColors.muted} />}
              virtual={false}
            />
            <Select
              aria-label='Filter cabang'
              placeholder='Semua cabang'
              allowClear
              style={{ width: isMobile ? "100%" : 170 }}
              value={filterBranch}
              onChange={(val) => {
                setFilterBranch(val);
                setPage(1);
              }}
              options={filterBranchesList?.map((b) => ({
                label: b.name,
                value: b.id,
              }))}
              disabled={!filterCategory && !filterBranch}
              prefix={<GitBranch size={14} color={museColors.muted} />}
              virtual={false}
            />
            <Button icon={<Upload size={16} />} onClick={() => setIsImportOpen(true)}>
              Import
            </Button>
          </>
        }
        onAdd={() => setIsModalOpen(true)}
        addLabel='Tambah Mapel'
      >
        <InfiniteScrollList
          data={allSubjects}
          loading={isFetching}
          hasMore={allSubjects.length < (subjectsData?.total || 0)}
          onLoadMore={handleLoadMore}
          height='auto'
          emptyText={
            searchText || filterCategory || filterBranch
              ? "Tidak ada mapel yang cocok dengan filter."
              : "Belum ada mata pelajaran. Tambahkan manual atau import dari Excel."
          }
          grid={{ gutter: [0, 0], xs: 24 }}
          renderItem={(item) => (
            <DataRow
              icon={<BookOpen size={18} />}
              title={item.name}
              subtitle={`Kode ${item.code || "-"} · Cabang ${item.branch_name || "-"}`}
              tags={
                isMobile ? null : (
                  <>
                    <Tag color={getCategoryStyle(item.category_name).ribbon} style={{ margin: 0 }}>
                      {item.category_name || "Umum"}
                    </Tag>
                    <Tag style={{ margin: 0 }}>KKM {item.kkm ?? "-"}</Tag>
                  </>
                )
              }
              actions={
                <EditDeleteActions
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                  deleteTitle={`Hapus mapel ${item.name}?`}
                  deleteDescription='Jadwal dan nilai yang memakai mapel ini bisa terdampak.'
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
        confirmLoading={isAdding || isUpdating}
        icon={editingItem ? <Edit2 size={16} /> : <BookOpen size={16} />}
        title={editingItem ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
        description='Pilih kategori dulu, lalu cabang (opsional).'
        okText={editingItem ? "Simpan Perubahan" : "Buat Mapel"}
        width={640}
      >
        <Form form={form} onFinish={handleSubmit} layout='vertical'>
          <Form.Item
            name='name'
            label='Nama Mata Pelajaran'
            rules={[{ required: true, message: "Nama wajib diisi" }]}
          >
            <Input
              prefix={<BookOpen size={16} color={museColors.muted} />}
              placeholder='Contoh: Matematika'
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name='category_id'
                label='Kategori'
                rules={[{ required: true, message: "Pilih kategori" }]}
              >
                <Select
                  placeholder='Pilih kategori'
                  options={categoriesData?.data?.map((c) => ({
                    label: c.name,
                    value: c.id,
                  }))}
                  onChange={(val) => {
                    setSelectedCategoryInForm(val);
                    form.setFieldValue("branch_id", null);
                  }}
                  virtual={false}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name='branch_id' label='Cabang (opsional)'>
                <Select
                  placeholder={selectedCategoryInForm ? "Pilih cabang" : "Pilih kategori dulu"}
                  options={formBranches.map((b) => ({
                    label: b.name,
                    value: b.id,
                  }))}
                  disabled={!selectedCategoryInForm}
                  allowClear
                  virtual={false}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name='code' label='Kode Mapel'>
                <Input
                  placeholder='Contoh: MP-01'
                  prefix={<Hash size={16} color={museColors.muted} />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name='kkm'
                label='Nilai KKM'
                rules={[{ required: true, message: "Nilai KKM wajib diisi" }]}
              >
                <InputNumber min={0} max={100} style={{ width: "100%" }} placeholder='0-100' />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </FormModal>

      <SubjectImportDrawer open={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </MotionDiv>
  );
};

export default SubjectTable;
