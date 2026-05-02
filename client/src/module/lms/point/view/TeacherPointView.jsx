import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Input,
  Segmented,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  FileClock,
  LayoutGrid,
  Plus,
  Search,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import TeacherPointHero from "../components/TeacherPointHero";
import TeacherPointEntryDrawer from "../components/TeacherPointEntryDrawer";
import TeacherPointEntryTable from "../components/TeacherPointEntryTable";
import LoadApp from "../../../../components/loader/LoadApp";
import {
  useCreateTeacherPointEntryMutation,
  useDeleteTeacherPointEntryMutation,
  useGetTeacherPointBootstrapQuery,
  useGetTeacherPointEntriesQuery,
  useUpdateTeacherPointEntryMutation,
} from "../../../../service/lms/ApiPoint";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const emptyCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const panelCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const tabsCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const filterOptions = [
  { label: "Semua", value: "" },
  { label: "Prestasi", value: "reward" },
  { label: "Pelanggaran", value: "punishment" },
];

const TeacherPointView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [activeTab, setActiveTab] = useState("summary");
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const {
    data: bootstrapRes,
    isLoading: isBootstrapLoading,
    isError: isBootstrapError,
    error: bootstrapError,
  } = useGetTeacherPointBootstrapQuery();

  const activePeriode = bootstrapRes?.data?.active_periode || null;
  const pointConfig = bootstrapRes?.data?.point_config || null;
  const homeroomClass = bootstrapRes?.data?.homeroom_class || null;
  const students = bootstrapRes?.data?.students || [];
  const rules = bootstrapRes?.data?.rules || [];

  const {
    data: entriesRes,
    isLoading: isEntriesLoading,
    isFetching: isEntriesFetching,
  } = useGetTeacherPointEntriesQuery(
    {
      periodeId: activePeriode?.id,
      studentId: selectedStudentId,
    },
    { skip: !activePeriode?.id },
  );

  const [createEntry, { isLoading: isCreating }] =
    useCreateTeacherPointEntryMutation();
  const [updateEntry, { isLoading: isUpdating }] =
    useUpdateTeacherPointEntryMutation();
  const [deleteEntry] = useDeleteTeacherPointEntryMutation();

  const filteredStudents = useMemo(() => {
    const keyword = searchStudent.trim().toLowerCase();
    if (!keyword) return students;
    return students.filter((item) => {
      const name = item.student_name?.toLowerCase() || "";
      const nis = item.nis?.toLowerCase() || "";
      return name.includes(keyword) || nis.includes(keyword);
    });
  }, [searchStudent, students]);

  const entries = useMemo(() => {
    const source = entriesRes?.data || [];
    if (!selectedType) return source;
    return source.filter((item) => item.point_type === selectedType);
  }, [entriesRes?.data, selectedType]);

  const selectedStudent = useMemo(
    () =>
      students.find((item) => Number(item.student_id) === Number(selectedStudentId)) ||
      null,
    [selectedStudentId, students],
  );

  const summaryStats = useMemo(() => {
    return students.reduce(
      (acc, item) => {
        acc.totalStudents += 1;
        acc.totalReward += Number(item.total_reward || 0);
        acc.totalPunishment += Number(item.total_punishment || 0);
        acc.totalEntries += Number(item.total_entries || 0);
        return acc;
      },
      {
        totalStudents: 0,
        totalReward: 0,
        totalPunishment: 0,
        totalEntries: 0,
      },
    );
  }, [students]);

  const handleOpenCreate = () => {
    setSelectedEntry(
      selectedStudent
        ? {
            student_id: selectedStudent.student_id,
          }
        : null,
    );
    setDrawerOpen(true);
  };

  const handleOpenEdit = (entry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedEntry(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (values?.id) {
        const res = await updateEntry({
          id: values.id,
          periode_id: activePeriode?.id,
          student_id: values.student_id,
          rule_id: values.rule_id,
          entry_date: values.entry_date,
          description: values.description,
        }).unwrap();
        message.success(res?.message || "Poin siswa berhasil diperbarui.");
      } else {
        const res = await createEntry({
          periode_id: activePeriode?.id,
          student_id: values.student_id,
          rule_id: values.rule_id,
          entry_date: values.entry_date,
          description: values.description,
        }).unwrap();
        message.success(res?.message || "Poin siswa berhasil ditambahkan.");
      }

      handleCloseDrawer();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan poin siswa.");
    }
  };

  const handleDelete = async (entry) => {
    try {
      const res = await deleteEntry({
        id: entry.id,
        periodeId: activePeriode?.id,
      }).unwrap();
      message.success(res?.message || "Poin siswa berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus poin siswa.");
    }
  };

  const renderStudentCards = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {filteredStudents.map((student) => {
        const isActive = Number(selectedStudentId) === Number(student.student_id);
        return (
          <motion.div
            key={student.student_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <Card
              hoverable
              onClick={() =>
                setSelectedStudentId((prev) =>
                  Number(prev) === Number(student.student_id)
                    ? null
                    : student.student_id,
                )
              }
              style={{
                borderRadius: 20,
                border: isActive
                  ? "1px solid #93c5fd"
                  : "1px solid #e5edf6",
                background: isActive
                  ? "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)"
                  : "#fff",
                boxShadow: isActive
                  ? "0 16px 30px rgba(37, 99, 235, 0.12)"
                  : "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
              styles={{ body: { padding: 18 } }}
            >
              <Flex vertical gap={12}>
                <div>
                  <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
                    {student.student_name}
                  </Text>
                  <div>
                    <Text style={{ color: "#64748b" }}>
                      NIS {student.nis || "-"}
                    </Text>
                  </div>
                </div>

                <Flex justify='space-between' gap={10}>
                  <Tag
                    style={{
                      margin: 0,
                      borderRadius: 999,
                      borderColor: "#fcd34d",
                      background: "#fffbeb",
                      color: "#a16207",
                    }}
                  >
                    Prestasi {student.total_reward || 0}
                  </Tag>
                  <Tag
                    style={{
                      margin: 0,
                      borderRadius: 999,
                      borderColor: "#fecaca",
                      background: "#fef2f2",
                      color: "#b91c1c",
                    }}
                  >
                    Pelanggaran {student.total_punishment || 0}
                  </Tag>
                </Flex>
              </Flex>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  const tabSummary = {
    summary: {
      title: "Ringkasan Kelas",
      description:
        "Pilih siswa, pantau akumulasi prestasi dan pelanggaran, lalu siapkan input poin dengan cepat.",
    },
    history: {
      title: "Riwayat Poin Siswa",
      description:
        "Tinjau, ubah, atau hapus entri poin siswa di kelas wali sesuai kebutuhan tindak lanjut.",
    },
  };

  const tabItems = [
    {
      key: "summary",
      label: (
        <Space size={8}>
          <LayoutGrid size={15} />
          Ringkasan Kelas
        </Space>
      ),
      children: (
        <motion.div
          key='teacher-point-summary'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <Card
            style={panelCardStyle}
            styles={{ body: { padding: isMobile ? 16 : 20 } }}
          >
            <Flex vertical gap={16}>
              <Flex
                vertical={isMobile}
                justify='space-between'
                align={isMobile ? "flex-start" : "center"}
                gap={12}
              >
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Ringkasan Kelas
                  </Title>
                  <Text style={{ color: "#64748b" }}>
                    Gunakan panel ini untuk memilih siswa dan memfokuskan riwayat
                    poin per anak di kelas wali Anda.
                  </Text>
                </div>
                <Button
                  type='primary'
                  icon={<Plus size={16} />}
                  onClick={handleOpenCreate}
                  style={{
                    borderRadius: 12,
                    background: "#0f172a",
                    borderColor: "#0f172a",
                    fontWeight: 700,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  Tambah Poin
                </Button>
              </Flex>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <Card style={{ borderRadius: 18, border: "1px solid #e5edf6", boxShadow: "none" }}>
                  <Space>
                    <Users size={18} color='#1d4ed8' />
                    <div>
                      <Text style={{ color: "#64748b", fontSize: 12 }}>Siswa</Text>
                      <Title level={4} style={{ margin: "2px 0 0" }}>
                        {summaryStats.totalStudents}
                      </Title>
                    </div>
                  </Space>
                </Card>
                <Card style={{ borderRadius: 18, border: "1px solid #fef3c7", boxShadow: "none" }}>
                  <Space>
                    <Trophy size={18} color='#a16207' />
                    <div>
                      <Text style={{ color: "#64748b", fontSize: 12 }}>
                        Prestasi
                      </Text>
                      <Title level={4} style={{ margin: "2px 0 0", color: "#a16207" }}>
                        {summaryStats.totalReward}
                      </Title>
                    </div>
                  </Space>
                </Card>
                <Card style={{ borderRadius: 18, border: "1px solid #fecaca", boxShadow: "none" }}>
                  <Space>
                    <ShieldAlert size={18} color='#b91c1c' />
                    <div>
                      <Text style={{ color: "#64748b", fontSize: 12 }}>
                        Pelanggaran
                      </Text>
                      <Title level={4} style={{ margin: "2px 0 0", color: "#b91c1c" }}>
                        {summaryStats.totalPunishment}
                      </Title>
                    </div>
                  </Space>
                </Card>
                <Card style={{ borderRadius: 18, border: "1px solid #dbeafe", boxShadow: "none" }}>
                  <Space>
                    <Plus size={18} color='#2563eb' />
                    <div>
                      <Text style={{ color: "#64748b", fontSize: 12 }}>
                        Total Entri
                      </Text>
                      <Title level={4} style={{ margin: "2px 0 0", color: "#2563eb" }}>
                        {summaryStats.totalEntries}
                      </Title>
                    </div>
                  </Space>
                </Card>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1.2fr auto",
                  gap: 12,
                }}
              >
                <Input
                  allowClear
                  value={searchStudent}
                  onChange={(event) => setSearchStudent(event.target.value)}
                  prefix={<Search size={16} color='#64748b' />}
                  placeholder='Cari siswa berdasarkan nama atau NIS'
                  style={{ borderRadius: 14, height: 42 }}
                />
                <Segmented
                  block
                  options={filterOptions}
                  value={selectedType}
                  onChange={setSelectedType}
                />
              </div>

              {filteredStudents.length ? (
                renderStudentCards()
              ) : (
                <Empty
                  description='Tidak ada siswa yang cocok dengan pencarian.'
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Flex>
          </Card>
        </motion.div>
      ),
    },
    {
      key: "history",
      label: (
        <Space size={8}>
          <FileClock size={15} />
          Riwayat Poin Siswa
        </Space>
      ),
      children: (
        <motion.div
          key='teacher-point-history'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <TeacherPointEntryTable
            dataSource={entries}
            loading={isEntriesLoading || isEntriesFetching}
            isMobile={isMobile}
            selectedStudent={selectedStudent}
            onCreate={handleOpenCreate}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
        </motion.div>
      ),
    },
  ];

  const isPageLoading =
    isBootstrapLoading || (!!activePeriode?.id && isEntriesLoading);

  if (isPageLoading) return <LoadApp />;

  if (isBootstrapError) {
    return (
      <Card style={emptyCardStyle} styles={{ body: { padding: 28 } }}>
        <Flex vertical align='center' gap={12}>
          <Title level={4} style={{ margin: 0 }}>
            Akses kelola poin tidak tersedia
          </Title>
          <Text style={{ color: "#64748b", textAlign: "center" }}>
            {bootstrapError?.data?.message ||
              "Halaman ini hanya bisa diakses wali kelas yang diizinkan admin."}
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <>
      <motion.div
        initial='hidden'
        animate='show'
        variants={containerVariants}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: isMobile ? 0 : "0 4px 12px",
        }}
      >
        <motion.div variants={itemVariants}>
          <TeacherPointHero
            isMobile={isMobile}
            periode={activePeriode}
            homeroomClass={homeroomClass}
            pointConfig={pointConfig}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card style={tabsCardStyle} styles={{ body: { padding: isMobile ? 16 : 20 } }}>
            <Flex vertical gap={16}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {tabSummary[activeTab].title}
                </Title>
                <Text style={{ color: "#64748b" }}>
                  {tabSummary[activeTab].description}
                </Text>
              </div>

              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size={isMobile ? "middle" : "large"}
                tabBarGutter={8}
                animated
              />
            </Flex>
          </Card>
        </motion.div>
      </motion.div>

      <TeacherPointEntryDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        students={students}
        rules={rules}
        initialValues={selectedEntry}
        submitting={isCreating || isUpdating}
      />
    </>
  );
};

export default TeacherPointView;
