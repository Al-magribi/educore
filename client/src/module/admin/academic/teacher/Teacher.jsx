import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button, Grid, message } from "antd";
import { BookOpen, School, Users } from "lucide-react";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import TeacherList from "./TeacherList";
import TeacherForm from "./TeacherForm";
import UploadTeacher from "./UploadTeacher"; // 1. Import UploadTeacher
import { downloadTeacherTemplate } from "./teacherImportTemplate";
import {
  useGetTeachersQuery,
  useLazyGetTeachersQuery,
  useAddTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useGetClassesListQuery,
  useGetSubjectsListQuery,
} from "../../../../service/academic/ApiTeacher";
import useDebounced from "../../../../utils/useDebounced";
import { StatCard } from "../../../../components/ui/muse";
import { DataListCard } from "../../../../components/ui/muse/DataSection";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const Teacher = () => {
  const screens = useBreakpoint();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounced(searchText, 500);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const {
    data: teachersData,
    isLoading,
    isFetching,
    refetch,
  } = useGetTeachersQuery({
    page: pagination.current,
    limit: pagination.pageSize,
    search: debouncedSearch,
  });
  const [fetchTeachersExport] = useLazyGetTeachersQuery();
  const [addTeacher, { isLoading: isAdding }] = useAddTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();
  const [deleteTeacher] = useDeleteTeacherMutation();
  const { data: classesData = [] } = useGetClassesListQuery();
  const { data: subjectsData = [] } = useGetSubjectsListQuery();
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteTeacher(id).unwrap();
      message.success("Guru berhasil dihapus");
      refetch(); // Refetch data setelah hapus
    } catch (error) {
      message.error("Gagal menghapus guru: " + error?.data?.message);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const formattedAllocations = [];
      if (values.allocations?.length) {
        values.allocations.forEach((group) => {
          if (group.class_ids?.length) {
            group.class_ids.forEach((classId) => {
              formattedAllocations.push({
                subject_id: group.subject_id,
                class_id: classId,
              });
            });
          }
        });
      }

      const payload = { ...values, allocations: formattedAllocations };

      if (editingTeacher) {
        await updateTeacher({ id: editingTeacher.id, ...payload }).unwrap();
        message.success("Data guru berhasil diperbarui");
      } else {
        await addTeacher(payload).unwrap();
        message.success("Guru baru berhasil ditambahkan");
      }
      refetch();
      setIsModalOpen(false);
      setEditingTeacher(null);
    } catch (error) {
      console.error(error);
      message.error("Terjadi kesalahan: " + error?.data?.message);
    }
  };

  const handleTableChange = (nextPage) => {
    setPagination((prev) => ({
      ...prev,
      current: nextPage?.current || 1,
      pageSize: nextPage?.pageSize || prev.pageSize,
    }));
  };

  const showModal = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const showUpload = () => setIsUploadOpen(true);
  const closeUpload = () => setIsUploadOpen(false);
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const result = await fetchTeachersExport({
        page: 1,
        limit: 10000,
        search: "",
      }).unwrap();

      downloadTeacherTemplate({
        teachers: result?.data || [],
        classes: classesData,
        subjects: subjectsData,
      });
      message.success(
        (result?.data || []).length > 0
          ? `Template berisi ${(result?.data || []).length} data guru siap diedit.`
          : "Template contoh berhasil diunduh. Belum ada data guru tersimpan.",
      );
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal mengunduh template data guru.",
      );
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const teacherItems = teachersData?.data || [];
  const totalTeachers = teachersData?.total ?? teachersData?.totalItems ?? 0;
  const homeroomCount = teacherItems.filter((item) => item.is_homeroom).length;
  const allocationCount = teacherItems.reduce(
    (total, item) => total + (item.allocations?.length || 0),
    0,
  );
  return (
    <>
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: "flex", flexDirection: "column", gap: screens.md ? 24 : 16 }}
      >
        <div
          style={{
            display: "grid",
            gap: screens.md ? 24 : 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <StatCard title='Total Guru' value={totalTeachers} icon={<Users size={24} />} tone='primary' />
          <StatCard title='Wali Kelas' value={homeroomCount} icon={<School size={24} />} tone='accent' />
          <StatCard
            title='Alokasi Mengajar'
            value={allocationCount}
            note='Pada halaman yang ditampilkan'
            icon={<BookOpen size={24} />}
            tone='warning'
          />
        </div>

        <DataListCard
          flush={screens.md}
          title='Daftar Guru'
          count={teachersData?.total ?? teachersData?.totalItems ?? totalTeachers}
          unit='guru'
          searchProps={{
            placeholder: "Cari nama / NIP...",
            onChange: (e) => {
              setSearchText(e.target.value);
              setPagination((prev) => ({ ...prev, current: 1 }));
            },
          }}
          extra={
            <>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                loading={isDownloadingTemplate}
              >
                Template
              </Button>
              <Button icon={<UploadOutlined />} onClick={showUpload}>
                Import
              </Button>
            </>
          }
          onAdd={showModal}
          addLabel='Tambah Guru'
        >
          <TeacherList
            data={teacherItems}
            loading={isLoading || isFetching}
            onEdit={handleEdit}
            onDelete={handleDelete}
            pagination={{
              ...pagination,
              total: teachersData?.total ?? teachersData?.totalItems ?? 0,
            }}
            onPageChange={handleTableChange}
          />
        </DataListCard>
      </MotionDiv>

      <TeacherForm
        open={isModalOpen}
        onCancel={closeModal}
        onSubmit={handleSubmit}
        initialValues={editingTeacher}
        loading={isAdding || isUpdating}
      />

      <UploadTeacher
        open={isUploadOpen}
        onClose={closeUpload}
        onFinish={() => {
          closeUpload();
          refetch();
        }}
      />
    </>
  );
};

export default Teacher;
