import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  Typography,
  message,
  Flex,
  Layout,
  Card,
  Grid,
  Statistic,
} from "antd";
import {
  Search as SearchIcon,
  Plus,
  Users,
  UserCheck,
  Layers3,
} from "lucide-react";
import { InfiniteScrollList } from "../../../../components";
import {
  useGetStudentsQuery,
  useAddStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
} from "../../../../service/academic/ApiStudent";

import StudentCard from "./StudentCard";
import StudentForm from "./StudentForm";

const { Title, Text } = Typography;
const { Content } = Layout;
const { useBreakpoint } = Grid;

const StudentPage = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [accumulatedData, setAccumulatedData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data: apiData, isFetching } = useGetStudentsQuery({
    page,
    limit: 12,
    search,
  });

  const [addStudent, { isLoading: isAdding }] = useAddStudentMutation();
  const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (apiData?.data) {
      if (page === 1) {
        setAccumulatedData(apiData.data);
      } else {
        setAccumulatedData((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const newUniqueItems = apiData.data.filter(
            (item) => !existingIds.has(item.id),
          );
          return [...prev, ...newUniqueItems];
        });
      }

      const currentCount = (page - 1) * 12 + apiData.data.length;
      if (currentCount >= apiData.totalData) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    }
  }, [apiData, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
    setHasMore(true);
  };

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleOpenDrawer = (record = null) => {
    setEditingItem(record);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingItem) {
        const payload = {
          full_name: values.full_name,
          nis: values.nis,
          nisn: values.nisn,
          gender: values.gender,
          is_active: values.is_active,
          class_id: values.class_id,
        };

        await updateStudent({ id: editingItem.id, ...payload }).unwrap();
        setAccumulatedData((prev) =>
          prev.map((item) =>
            item.id === editingItem.id ? { ...item, ...payload } : item,
          ),
        );
        message.success("Berhasil diperbarui");
      } else {
        const payload = {
          username: values.username,
          password: values.password,
          full_name: values.full_name,
          nis: values.nis,
          nisn: values.nisn,
          gender: values.gender,
          class_id: values.class_id,
        };

        await addStudent(payload).unwrap();
        setPage(1);
        message.success("Siswa ditambahkan");
      }
      setIsDrawerOpen(false);
    } catch {
      message.error("Gagal menyimpan data");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id).unwrap();
      setAccumulatedData((prev) => prev.filter((item) => item.id !== id));
      message.success("Siswa dihapus");
    } catch {
      message.error("Gagal menghapus");
    }
  };

  const totalStudents = apiData?.totalData || 0;
  const activeStudents = accumulatedData.filter(
    (item) => item.is_active,
  ).length;
  const loadedStudents = accumulatedData.length;
  const summaryCards = [
    {
      key: "students",
      title: "Total Siswa",
      value: totalStudents,
      icon: <Users size={18} />,
    },
    {
      key: "active",
      title: "Aktif di List",
      value: activeStudents,
      icon: <UserCheck size={18} />,
    },
    {
      key: "loaded",
      title: "Data Dimuat",
      value: loadedStudents,
      icon: <Layers3 size={18} />,
    },
  ];

  return (
    <>
      <Flex gap={16} wrap='wrap' style={{ marginBottom: 20 }}>
        {summaryCards.map((item) => (
          <Card
            key={item.key}
            style={{
              flex: activeScreens.md ? "1 1 0" : "1 1 100%",
              minWidth: activeScreens.md ? 0 : "100%",
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
        style={{
          marginBottom: 18,
        }}
        styles={{ body: { padding: activeScreens.md ? 20 : 16 } }}
        hoverable
      >
        <Flex
          justify='space-between'
          align={activeScreens.md ? "center" : "stretch"}
          vertical={!activeScreens.md}
          gap={16}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Direktori Siswa
            </Title>
            <Text type='secondary'>
              Temukan siswa dengan cepat lalu lanjutkan tambah atau edit data.
            </Text>
          </div>

          <Flex
            gap={10}
            vertical={!activeScreens.md}
            style={{ width: !activeScreens.md ? "100%" : "auto" }}
          >
            <Input
              placeholder='Cari siswa...'
              prefix={<SearchIcon size={16} color='rgba(0,0,0,.25)' />}
              onChange={handleSearch}
              style={{ width: !activeScreens.md ? "100%" : 280 }}
              size='large'
              allowClear
            />
            <Button
              type='primary'
              icon={<Plus size={18} />}
              onClick={() => handleOpenDrawer(null)}
              size='large'
            >
              Tambah Siswa
            </Button>
          </Flex>
        </Flex>
      </Card>

      <InfiniteScrollList
        data={accumulatedData}
        loading={isFetching}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        height={
          activeScreens.md ? "calc(100vh - 360px)" : "calc(100vh - 320px)"
        }
        emptyText='Tidak ada siswa ditemukan'
        grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 8, lg: 6, xl: 6 }}
        renderItem={(item) => (
          <StudentCard
            student={item}
            onEdit={handleOpenDrawer}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        )}
      />

      <StudentForm
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editingItem}
        isLoading={isAdding || isUpdating}
      />
    </>
  );
};

export default StudentPage;
