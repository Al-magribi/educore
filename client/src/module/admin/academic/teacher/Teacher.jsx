import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Typography,
  message,
  Input,
  Flex,
  Grid,
  Card,
  Statistic,
} from "antd";
import {
  UserPlus,
  Users,
  BookOpen,
  School,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import {
  DownloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import TeacherList from "./TeacherList";
import TeacherForm from "./TeacherForm";
import UploadTeacher from "./UploadTeacher"; // 1. Import UploadTeacher
import { downloadTeacherTemplate } from "./teacherImportTemplate";
import {
  useGetTeachersQuery,
  useAddTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useGetClassesListQuery,
  useGetSubjectsListQuery,
} from "../../../../service/academic/ApiTeacher";
import useDebounced from "../../../../utils/useDebounced";

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
  const [addTeacher, { isLoading: isAdding }] = useAddTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();
  const [deleteTeacher] = useDeleteTeacherMutation();
  const { data: classesData = [] } = useGetClassesListQuery();
  const { data: subjectsData = [] } = useGetSubjectsListQuery();

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
  const handleDownloadTemplate = () => {
    downloadTeacherTemplate({
      classes: classesData,
      subjects: subjectsData,
    });
  };

  const teacherItems = teachersData?.data || [];
  const totalTeachers = teachersData?.total ?? teachersData?.totalItems ?? 0;
  const homeroomCount = teacherItems.filter((item) => item.is_homeroom).length;
  const allocationCount = teacherItems.reduce(
    (total, item) => total + (item.allocations?.length || 0),
    0,
  );
  const summaryCards = [
    {
      key: "teacher",
      title: "Total Guru",
      value: totalTeachers,
      icon: <Users size={18} />,
    },
    {
      key: "homeroom",
      title: "Wali Kelas",
      value: homeroomCount,
      icon: <School size={18} />,
    },
    {
      key: "allocation",
      title: "Alokasi Tampil",
      value: allocationCount,
      icon: <BookOpen size={18} />,
    },
  ];

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
            bordered={false}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background:
                "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(236,253,245,0.98))",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
            }}
            styles={{ body: { padding: screens.md ? 24 : 18 } }}
          >
            <Flex
              justify='space-between'
              align={screens.md ? "center" : "stretch"}
              vertical={!screens.md}
              gap={16}
            >
              <div>
                <Flex
                  align='center'
                  gap={10}
                  wrap='wrap'
                  style={{ marginBottom: 8 }}
                >
                  <Text
                    style={{
                      color: "#1d4ed8",
                      fontWeight: 700,
                      letterSpacing: 0.4,
                    }}
                  >
                    DIREKTORI GURU
                  </Text>
                  <Flex
                    align='center'
                    gap={6}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "rgba(29, 78, 216, 0.10)",
                      color: "#1d4ed8",
                      fontWeight: 600,
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Manajemen pengajar</span>
                  </Flex>
                </Flex>
                <Title level={4} style={{ margin: "0 0 4px" }}>
                  Kelola data guru, wali kelas, dan alokasi mengajar
                </Title>
                <Text type='secondary' style={{ maxWidth: 760 }}>
                  Cari data guru, impor template, dan atur pengampu mapel
                </Text>
              </div>

              {!screens.xs && (
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 20,
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, #2563eb, #14b8a6)",
                    color: "#fff",
                    boxShadow: "0 18px 32px rgba(37, 99, 235, 0.24)",
                  }}
                >
                  <GraduationCap size={24} />
                </div>
              )}
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
                  flex: screens.md ? "1 1 0" : "1 1 100%",
                  minWidth: screens.md ? 0 : "100%",
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
                        background: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
                        color: "#1d4ed8",
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
            bordered={false}
            styles={{ body: { padding: screens.md ? 20 : 16 } }}
            hoverable
            style={{
              borderRadius: 22,
              boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Flex
              justify='space-between'
              align={screens.md ? "center" : "stretch"}
              vertical={!screens.md}
              gap={16}
            >
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Pencarian & Aksi Cepat
                </Title>
                <Text type='secondary'>
                  Temukan guru lebih cepat, lalu lanjutkan tambah, impor, atau
                  pembaruan data.
                </Text>
              </div>

              <Flex
                gap={10}
                wrap='wrap'
                vertical={!screens.md}
                style={{ width: !screens.md ? "100%" : "auto" }}
              >
                <Input
                  placeholder='Cari Nama / NIP...'
                  prefix={
                    <SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />
                  }
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setPagination((prev) => ({ ...prev, current: 1 }));
                  }}
                  style={{ width: !screens.md ? "100%" : 260 }}
                  allowClear
                />
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadTemplate}
                >
                  Template
                </Button>
                <Button icon={<UploadOutlined />} onClick={showUpload}>
                  Import
                </Button>
                <Button
                  type='primary'
                  icon={<UserPlus size={16} />}
                  onClick={showModal}
                >
                  Guru
                </Button>
              </Flex>
            </Flex>
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
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
        </MotionDiv>
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
