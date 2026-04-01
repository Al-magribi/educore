import React, { useEffect, useState } from "react";
import {
  Button,
  Layout,
  Typography,
  message,
  Input,
  Flex,
  Grid,
  Card,
  Statistic,
} from "antd";
import { UserPlus, Users, BookOpen, School } from "lucide-react";
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
const { Content } = Layout;
const { useBreakpoint } = Grid;

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

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [debouncedSearch]);

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
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Content style={{ padding: screens.md ? "24px" : "12px" }}>
        <Flex gap={16} wrap='wrap' style={{ marginBottom: 20 }}>
          {summaryCards.map((item) => (
            <Card
              key={item.key}
              style={{
                flex: screens.md ? "1 1 0" : "1 1 100%",
                minWidth: screens.md ? 0 : "100%",
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
          ))}
        </Flex>

        <Card
          style={{ marginBottom: 18 }}
          styles={{ body: { padding: screens.md ? 20 : 16 } }}
          hoverable
        >
          <Flex
            justify='space-between'
            align={screens.md ? "center" : "stretch"}
            vertical={!screens.md}
            gap={16}
          >
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Direktori Guru
              </Title>
              <Text type='secondary'>
                Cari cepat berdasarkan nama atau NIP, lalu lanjutkan edit,
                import, atau tambah guru baru.
              </Text>
            </div>

            <Flex
              gap={10}
              vertical={!screens.md}
              style={{ width: !screens.md ? "100%" : "auto" }}
            >
              <Input
                placeholder='Cari Nama / NIP...'
                prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: !screens.md ? "100%" : 280 }}
                size='large'
                allowClear
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                size='large'
                style={{ minWidth: 170 }}
              >
                Download Template
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={showUpload}
                size='large'
              >
                Import Guru
              </Button>
              <Button
                type='primary'
                icon={<UserPlus size={16} />}
                onClick={showModal}
                size='large'
              >
                Tambah Guru
              </Button>
            </Flex>
          </Flex>
        </Card>

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
      </Content>
    </Layout>
  );
};

export default Teacher;
