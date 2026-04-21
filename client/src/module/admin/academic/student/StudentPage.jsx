import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Input,
  Button,
  Typography,
  message,
  Flex,
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
  GraduationCap,
  Sparkles,
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

const StudentPage = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;

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
      setHasMore(currentCount < apiData.totalData);
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
        message.success("Data siswa berhasil diperbarui");
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
        message.success("Siswa baru berhasil ditambahkan");
      }
      setIsDrawerOpen(false);
    } catch {
      message.error("Gagal menyimpan data siswa");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id).unwrap();
      setAccumulatedData((prev) => prev.filter((item) => item.id !== id));
      message.success("Data siswa berhasil dihapus");
    } catch {
      message.error("Gagal menghapus data siswa");
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
      tint: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
      color: "#1d4ed8",
    },
    {
      key: "active",
      title: "Aktif di List",
      value: activeStudents,
      icon: <UserCheck size={18} />,
      tint: "linear-gradient(135deg, #dcfce7, #ccfbf1)",
      color: "#047857",
    },
    {
      key: "loaded",
      title: "Data Dimuat",
      value: loadedStudents,
      icon: <Layers3 size={18} />,
      tint: "linear-gradient(135deg, #ede9fe, #dbeafe)",
      color: "#5b21b6",
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
            variant='borderless'
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background:
                "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(236,253,245,0.98))",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
            }}
            styles={{ body: { padding: activeScreens.md ? 24 : 18 } }}
          >
            <Flex
              justify='space-between'
              align={activeScreens.md ? "center" : "stretch"}
              vertical={!activeScreens.md}
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
                    DIREKTORI SISWA
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
                    <span>Administrasi peserta didik</span>
                  </Flex>
                </Flex>
                <Title level={4} style={{ margin: "0 0 4px" }}>
                  Kelola data siswa secara lebih tertata dan akurat
                </Title>
                <Text type='secondary' style={{ maxWidth: 760 }}>
                  Lakukan pencarian, pembaruan biodata, dan penambahan siswa
                </Text>
              </div>

              {!isMobile && (
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
                  flex: activeScreens.md ? "1 1 0" : "1 1 100%",
                  minWidth: activeScreens.md ? 0 : "100%",
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
                        background: item.tint,
                        color: item.color,
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
            variant='borderless'
            styles={{ body: { padding: activeScreens.md ? 20 : 16 } }}
            hoverable
            style={{
              borderRadius: 22,
              boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Flex
              justify='space-between'
              align={activeScreens.md ? "center" : "stretch"}
              vertical={!activeScreens.md}
              gap={16}
            >
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Pencarian & Aksi Cepat
                </Title>
                <Text type='secondary'>
                  Temukan siswa lebih cepat lalu lanjutkan proses edit atau
                  penambahan data.
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
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <InfiniteScrollList
            data={accumulatedData}
            loading={isFetching}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            height={
              activeScreens.md ? "calc(100vh - 420px)" : "calc(100vh - 360px)"
            }
            emptyText='Belum ada data siswa yang dapat ditampilkan'
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
        </MotionDiv>
      </MotionDiv>

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
