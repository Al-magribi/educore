import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import TeacherPointEntryDrawer from "./TeacherPointEntryDrawer";
import TeacherPointEntryTable from "./TeacherPointEntryTable";
import {
  useCreateTeacherPointEntryMutation,
  useDeleteTeacherPointEntryMutation,
  useGetTeacherPointBootstrapQuery,
  useGetTeacherPointEntriesQuery,
  useUpdateTeacherPointEntryMutation,
} from "../../../../service/lms/ApiPoint";

const { Text, Title } = Typography;

const panelCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const AdminPointEntryPanel = ({ isMobile = false, activePeriode }) => {
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [classId, setClassId] = useState(null);

  const {
    data: bootstrapRes,
    isLoading: isBootstrapLoading,
    isFetching: isBootstrapFetching,
    isError: isBootstrapError,
    error: bootstrapError,
  } = useGetTeacherPointBootstrapQuery(
    { classId },
    { skip: !activePeriode?.id },
  );

  const homeroomClass = bootstrapRes?.data?.homeroom_class || null;
  const classOptions = bootstrapRes?.data?.classes || [];
  const students = bootstrapRes?.data?.students || [];
  const rules = bootstrapRes?.data?.rules || [];
  const periode = bootstrapRes?.data?.active_periode || activePeriode || null;
  const showBalance = Boolean(bootstrapRes?.data?.point_config?.show_balance);

  useEffect(() => {
    if (!classId && homeroomClass?.id) {
      setClassId(homeroomClass.id);
    }
  }, [classId, homeroomClass?.id]);

  const {
    data: entriesRes,
    isLoading: isEntriesLoading,
    isFetching: isEntriesFetching,
  } = useGetTeacherPointEntriesQuery(
    {
      periodeId: periode?.id,
      classId: classId || homeroomClass?.id,
    },
    { skip: !periode?.id },
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

  const entries = useMemo(() => entriesRes?.data || [], [entriesRes?.data]);

  const selectedStudent = useMemo(
    () =>
      students.find(
        (item) => Number(item.student_id) === Number(selectedStudentId),
      ) || null,
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
          periode_id: periode?.id,
          class_id: classId || homeroomClass?.id,
          student_id: values.student_id,
          rule_id: values.rule_id,
          entry_date: values.entry_date,
          description: values.description,
        }).unwrap();
        message.success(res?.message || "Poin siswa berhasil diperbarui.");
      } else {
        const res = await createEntry({
          periode_id: periode?.id,
          class_id: classId || homeroomClass?.id,
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
        periodeId: periode?.id,
        classId: classId || homeroomClass?.id,
      }).unwrap();
      message.success(res?.message || "Poin siswa berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus poin siswa.");
    }
  };

  if (!periode) {
    return (
      <Card style={panelCardStyle} styles={{ body: { padding: 28 } }}>
        <Empty
          description='Aktifkan periode sekolah terlebih dahulu sebelum memberi poin siswa.'
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  if (isBootstrapError) {
    return (
      <Card style={panelCardStyle} styles={{ body: { padding: 28 } }}>
        <Empty
          description={
            bootstrapError?.data?.message ||
            "Gagal memuat data kelas untuk input poin."
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {classOptions.length > 0 ? (
          <Card style={panelCardStyle} styles={{ body: { padding: 16 } }}>
            <Flex
              align={isMobile ? "stretch" : "center"}
              gap={12}
              vertical={isMobile}
            >
              <Text strong>Kelas</Text>
              <Select
                value={classId || homeroomClass?.id}
                options={classOptions.map((item) => ({
                  value: item.id,
                  label: item.grade_name
                    ? `${item.name} · ${item.grade_name}`
                    : item.name,
                }))}
                onChange={(value) => {
                  setClassId(value);
                  setSelectedStudentId(null);
                }}
                style={{ minWidth: isMobile ? "100%" : 280 }}
              />
            </Flex>
          </Card>
        ) : null}

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
                  Input Poin Siswa
                </Title>
                <Text style={{ color: "#64748b" }}>
                  Pilih kelas dan siswa, lalu tambahkan prestasi atau
                  pelanggaran sesuai rule yang aktif.
                </Text>
              </div>
              <Button
                type='primary'
                icon={<Plus size={16} />}
                onClick={handleOpenCreate}
                disabled={!students.length}
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
              <Card
                style={{
                  borderRadius: 18,
                  border: "1px solid #e5edf6",
                  boxShadow: "none",
                }}
              >
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
              <Card
                style={{
                  borderRadius: 18,
                  border: "1px solid #fef3c7",
                  boxShadow: "none",
                }}
              >
                <Space>
                  <Trophy size={18} color='#a16207' />
                  <div>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                      Prestasi
                    </Text>
                    <Title
                      level={4}
                      style={{ margin: "2px 0 0", color: "#a16207" }}
                    >
                      {summaryStats.totalReward}
                    </Title>
                  </div>
                </Space>
              </Card>
              <Card
                style={{
                  borderRadius: 18,
                  border: "1px solid #fecaca",
                  boxShadow: "none",
                }}
              >
                <Space>
                  <ShieldAlert size={18} color='#b91c1c' />
                  <div>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                      Pelanggaran
                    </Text>
                    <Title
                      level={4}
                      style={{ margin: "2px 0 0", color: "#b91c1c" }}
                    >
                      {summaryStats.totalPunishment}
                    </Title>
                  </div>
                </Space>
              </Card>
              <Card
                style={{
                  borderRadius: 18,
                  border: "1px solid #dbeafe",
                  boxShadow: "none",
                }}
              >
                <Space>
                  <Plus size={18} color='#2563eb' />
                  <div>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                      Total Entri
                    </Text>
                    <Title
                      level={4}
                      style={{ margin: "2px 0 0", color: "#2563eb" }}
                    >
                      {summaryStats.totalEntries}
                    </Title>
                  </div>
                </Space>
              </Card>
            </div>

            <div style={{ maxWidth: isMobile ? "100%" : 420 }}>
              <Input
                allowClear
                value={searchStudent}
                onChange={(event) => setSearchStudent(event.target.value)}
                prefix={<Search size={16} color='#64748b' />}
                placeholder='Cari siswa berdasarkan nama atau NIS'
                style={{ borderRadius: 14, height: 42 }}
              />
            </div>

            {filteredStudents.length ? (
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
                  const isActive =
                    Number(selectedStudentId) === Number(student.student_id);
                  return (
                    <Card
                      key={student.student_id}
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
                        {showBalance ? (
                          <Tag
                            style={{
                              margin: 0,
                              borderRadius: 999,
                              borderColor: "#bfdbfe",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              width: "fit-content",
                            }}
                          >
                            Poin bersih {student.balance || 0}
                          </Tag>
                        ) : null}
                      </Flex>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Empty
                description={
                  isBootstrapLoading || isBootstrapFetching
                    ? "Memuat data siswa..."
                    : "Tidak ada siswa yang cocok dengan pencarian."
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Flex>
        </Card>

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

export default AdminPointEntryPanel;
