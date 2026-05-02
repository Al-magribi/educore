import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  BookOpen,
  CalendarDays,
  Landmark,
  Sparkles,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useGetParentDashboardQuery } from "../../../service/lms/ApiParent";

const { Title, Text } = Typography;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
};

const cardSurface = {
  borderRadius: 24,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
};

const clampText = (lines) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "Belum ada transaksi";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belum ada transaksi";
  return dateFormatter.format(date);
};

const ParentDash = () => {
  const { data, isLoading, isError, error } = useGetParentDashboardQuery();
  const [selectedStudentId, setSelectedStudentId] = useState("all");

  const payload = data?.data;
  const summary = payload?.summary || {};
  const students = Array.isArray(payload?.students)
    ? payload.students.filter(Boolean)
    : [];
  const recentMaterials = Array.isArray(payload?.recent_lms)
    ? payload.recent_lms.filter(Boolean)
    : [];

  const studentTitle = useMemo(() => {
    const total = Number(summary.students_total || 0);
    if (total === 1) return "1 Anak Terhubung";
    return `${total} Anak Terhubung`;
  }, [summary.students_total]);

  useEffect(() => {
    if (!students.length) {
      setSelectedStudentId("all");
      return;
    }

    setSelectedStudentId((current) => {
      if (students.length === 1) {
        return String(students[0].student_id);
      }

      if (current === "all") return current;

      const isStillValid = students.some(
        (student) => String(student?.student_id) === String(current),
      );

      return isStillValid ? current : "all";
    });
  }, [students]);

  const studentOptions = useMemo(() => {
    const mapped = students.map((student) => ({
      label: `${student.student_name}${student.class_name ? ` - ${student.class_name}` : ""}`,
      value: String(student.student_id),
    }));

    if (students.length > 1) {
      return [{ label: "Semua Siswa", value: "all" }, ...mapped];
    }

    return mapped;
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (selectedStudentId === "all") return students;
    return students.filter(
      (student) => String(student?.student_id) === String(selectedStudentId),
    );
  }, [selectedStudentId, students]);

  const selectedStudent = useMemo(() => {
    if (selectedStudentId === "all") return null;
    return (
      students.find(
        (student) => String(student?.student_id) === String(selectedStudentId),
      ) || null
    );
  }, [selectedStudentId, students]);

  const filteredSummary = useMemo(() => {
    if (!filteredStudents.length) {
      return {
        students_total: 0,
        lms_attendance_rate: 0,
        total_savings_balance: 0,
        total_class_cash_balance: 0,
      };
    }

    const totals = filteredStudents.reduce(
      (acc, student) => {
        const attendanceTotal = Number(
          student?.lms?.attendance?.total_sessions || 0,
        );
        const attendancePresent = Number(
          student?.lms?.attendance?.hadir_sessions || 0,
        );

        acc.students_total += 1;
        acc.attendance_total += attendanceTotal;
        acc.attendance_present += attendancePresent;
        acc.total_savings_balance += Number(
          student?.finance?.savings?.balance || 0,
        );
        acc.total_class_cash_balance += Number(
          student?.finance?.class_cash?.balance || 0,
        );

        return acc;
      },
      {
        students_total: 0,
        attendance_total: 0,
        attendance_present: 0,
        total_savings_balance: 0,
        total_class_cash_balance: 0,
      },
    );

    return {
      students_total: totals.students_total,
      lms_attendance_rate:
        totals.attendance_total > 0
          ? Math.round(
              (totals.attendance_present / totals.attendance_total) * 100,
            )
          : 0,
      total_savings_balance: totals.total_savings_balance,
      total_class_cash_balance: totals.total_class_cash_balance,
    };
  }, [filteredStudents]);

  if (isLoading) {
    return (
      <Card style={{ ...cardSurface, borderRadius: 24 }}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat dashboard orang tua.'
        description={error?.data?.message || "Silakan coba beberapa saat lagi."}
      />
    );
  }

  return (
    <Space direction='vertical' size={20} style={{ width: "100%" }}>
      <motion.div {...fadeUp}>
        <Card
          bodyStyle={{ padding: 0 }}
          style={{
            ...cardSurface,
            background:
              "radial-gradient(circle at top left, rgba(125, 211, 252, 0.38), transparent 28%), linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)",
          }}
        >
          <div
            style={{
              padding: 28,
              color: "#f8fafc",
            }}
          >
            <Row gutter={[24, 24]} align='middle'>
              <Col xs={24} lg={16}>
                <Space direction='vertical' size={14} style={{ width: "100%" }}>
                  <Tag
                    color='cyan'
                    style={{
                      borderRadius: 999,
                      width: "fit-content",
                      paddingInline: 12,
                      paddingBlock: 6,
                      border: "none",
                      fontWeight: 600,
                    }}
                  >
                    <Space size={6}>
                      <Sparkles size={14} />
                      <span>Portal Orang Tua</span>
                    </Space>
                  </Tag>

                  <div>
                    <Title level={2} style={{ color: "#f8fafc", margin: 0 }}>
                      Dashboard Orang Tua
                    </Title>
                    <Text
                      style={{
                        color: "rgba(248, 250, 252, 0.82)",
                        fontSize: 15,
                      }}
                    >
                      Pantau ringkasan akademik dan keuangan siswa.
                    </Text>
                  </div>

                  <Space size={[8, 8]} wrap>
                    <Tag
                      style={{
                        borderRadius: 999,
                        paddingInline: 12,
                        paddingBlock: 6,
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.14)",
                      }}
                    >
                      <Space size={6}>
                        <UserRound size={13} />
                        <span>{payload?.parent?.full_name || "Orang tua"}</span>
                      </Space>
                    </Tag>
                    <Tag
                      style={{
                        borderRadius: 999,
                        paddingInline: 12,
                        paddingBlock: 6,
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.14)",
                      }}
                    >
                      {payload?.active_periode?.name || "Periode belum aktif"}
                    </Tag>
                    <Tag
                      style={{
                        borderRadius: 999,
                        paddingInline: 12,
                        paddingBlock: 6,
                        background: "rgba(16,185,129,0.16)",
                        color: "#d1fae5",
                        borderColor: "rgba(209,250,229,0.18)",
                      }}
                    >
                      {selectedStudent
                        ? `Fokus: ${selectedStudent.student_name}`
                        : studentTitle}
                    </Tag>
                  </Space>
                </Space>
              </Col>
            </Row>
          </div>
        </Card>
      </motion.div>

      <Row gutter={[20, 20]} align='stretch'>
        <Col xs={24} xl={16}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          >
            <Card
              title={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Space size={8}>
                    <UsersRound size={18} />
                    <span>Ringkasan Siswa</span>
                  </Space>
                  <Select
                    value={selectedStudentId}
                    onChange={setSelectedStudentId}
                    options={studentOptions}
                    size='middle'
                    placeholder='Pilih siswa'
                    style={{ width: "100%", maxWidth: 320 }}
                  />
                </div>
              }
              style={cardSurface}
            >
              {filteredStudents.length === 0 ? (
                <Empty description='Belum ada data siswa terhubung.' />
              ) : (
                <Row gutter={[16, 16]}>
                  {filteredStudents.map((student, index) => {
                    const attendanceTotal = Number(
                      student?.lms?.attendance?.total_sessions || 0,
                    );
                    const attendancePresent = Number(
                      student?.lms?.attendance?.hadir_sessions || 0,
                    );
                    const attendanceRate =
                      attendanceTotal > 0
                        ? Math.round(
                            (attendancePresent / attendanceTotal) * 100,
                          )
                        : 0;

                    return (
                      <Col
                        xs={24}
                        lg={selectedStudentId === "all" ? 12 : 24}
                        key={student?.student_id ?? `student-${index}`}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.35,
                            delay: 0.18 + index * 0.06,
                            ease: "easeOut",
                          }}
                        >
                          <Card
                            bodyStyle={{ padding: 20 }}
                            style={{
                              borderRadius: 22,
                              border: "1px solid rgba(15, 23, 42, 0.08)",
                              background:
                                "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                            }}
                          >
                            <Space
                              direction='vertical'
                              size={14}
                              style={{ width: "100%" }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  alignItems: "flex-start",
                                  flexWrap: "wrap",
                                }}
                              >
                                <div>
                                  <Text
                                    strong
                                    style={{ fontSize: 18, color: "#0f172a" }}
                                  >
                                    {student.student_name}
                                  </Text>
                                  <div>
                                    <Text type='secondary'>
                                      NIS {student.nis || "-"} |{" "}
                                      {student.class_name || "-"}
                                    </Text>
                                  </div>
                                </div>
                                <Space size={[8, 8]} wrap>
                                  <Tag color='geekblue'>
                                    {student.grade_name || "Tanpa tingkat"}
                                  </Tag>
                                  <Tag color='cyan'>
                                    {student.homebase_name || "Sekolah"}
                                  </Tag>
                                </Space>
                              </div>

                              <Row gutter={[12, 12]}>
                                <Col xs={24} sm={12}>
                                  <Card
                                    size='small'
                                    bodyStyle={{ padding: 14 }}
                                    style={{
                                      borderRadius: 16,
                                      background: "#eff6ff",
                                      borderColor: "#dbeafe",
                                    }}
                                  >
                                    <Text
                                      type='secondary'
                                      style={{ fontSize: 12 }}
                                    >
                                      Mapel LMS
                                    </Text>
                                    <div>
                                      <Text strong style={{ fontSize: 18 }}>
                                        {student?.lms?.subjects_total || 0}
                                      </Text>
                                    </div>
                                  </Card>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <Card
                                    size='small'
                                    bodyStyle={{ padding: 14 }}
                                    style={{
                                      borderRadius: 16,
                                      background: "#ecfeff",
                                      borderColor: "#cffafe",
                                    }}
                                  >
                                    <Text
                                      type='secondary'
                                      style={{ fontSize: 12 }}
                                    >
                                      Materi LMS
                                    </Text>
                                    <div>
                                      <Text strong style={{ fontSize: 18 }}>
                                        {student?.lms?.materials_total || 0}
                                      </Text>
                                    </div>
                                  </Card>
                                </Col>
                              </Row>

                              <Card
                                size='small'
                                bodyStyle={{ padding: 14 }}
                                style={{
                                  borderRadius: 16,
                                  background: "#f8fafc",
                                  borderColor: "#e2e8f0",
                                }}
                              >
                                <Space
                                  direction='vertical'
                                  size={10}
                                  style={{ width: "100%" }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 12,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <Text strong>Kehadiran LMS</Text>
                                    <Text type='secondary'>
                                      {attendancePresent}/{attendanceTotal} sesi
                                      hadir
                                    </Text>
                                  </div>
                                  <Progress
                                    percent={attendanceRate}
                                    strokeColor={{
                                      from: "#0ea5e9",
                                      to: "#22c55e",
                                    }}
                                  />
                                </Space>
                              </Card>

                              <Row gutter={[12, 12]}>
                                <Col xs={24} sm={12}>
                                  <Card
                                    size='small'
                                    bodyStyle={{ padding: 14 }}
                                    style={{
                                      borderRadius: 16,
                                      background: "#f0fdf4",
                                      borderColor: "#dcfce7",
                                      height: "100%",
                                    }}
                                  >
                                    <Space direction='vertical' size={4}>
                                      <Space size={8}>
                                        <Wallet size={16} color='#15803d' />
                                        <Text strong>Tabungan</Text>
                                      </Space>
                                      <Text
                                        style={{
                                          fontSize: 18,
                                          fontWeight: 700,
                                        }}
                                      >
                                        {formatCurrency(
                                          student?.finance?.savings?.balance ||
                                            0,
                                        )}
                                      </Text>
                                      <Text
                                        type='secondary'
                                        style={{ fontSize: 12 }}
                                      >
                                        {student?.finance?.savings
                                          ?.transactions_total || 0}{" "}
                                        transaksi
                                      </Text>
                                      <Text
                                        type='secondary'
                                        style={{ fontSize: 12 }}
                                      >
                                        Update:{" "}
                                        {formatDate(
                                          student?.finance?.savings
                                            ?.last_transaction_date,
                                        )}
                                      </Text>
                                    </Space>
                                  </Card>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <Card
                                    size='small'
                                    bodyStyle={{ padding: 14 }}
                                    style={{
                                      borderRadius: 16,
                                      background: "#fff7ed",
                                      borderColor: "#fed7aa",
                                      height: "100%",
                                    }}
                                  >
                                    <Space direction='vertical' size={4}>
                                      <Space size={8}>
                                        <Landmark size={16} color='#c2410c' />
                                        <Text strong>Kas Kelas</Text>
                                      </Space>
                                      <Text
                                        style={{
                                          fontSize: 18,
                                          fontWeight: 700,
                                        }}
                                      >
                                        {formatCurrency(
                                          student?.finance?.class_cash
                                            ?.balance || 0,
                                        )}
                                      </Text>
                                      <Text
                                        type='secondary'
                                        style={{ fontSize: 12 }}
                                      >
                                        {student?.finance?.class_cash
                                          ?.transactions_total || 0}{" "}
                                        transaksi
                                      </Text>
                                      <Text
                                        type='secondary'
                                        style={{ fontSize: 12 }}
                                      >
                                        Update:{" "}
                                        {formatDate(
                                          student?.finance?.class_cash
                                            ?.last_transaction_date,
                                        )}
                                      </Text>
                                    </Space>
                                  </Card>
                                </Col>
                              </Row>
                            </Space>
                          </Card>
                        </motion.div>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} xl={8}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.22, ease: "easeOut" }}
          >
            <Space direction='vertical' size={20} style={{ width: "100%" }}>
              <Card
                title={
                  <Space size={8}>
                    <BookOpen size={18} />
                    <span>Materi LMS Terbaru</span>
                  </Space>
                }
                style={cardSurface}
                extra={
                  recentMaterials.length > 0 ? (
                    <Text type='secondary'>
                      {recentMaterials.length} materi
                    </Text>
                  ) : null
                }
              >
                {recentMaterials.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description='Belum ada materi terbaru.'
                  />
                ) : (
                  <div
                    style={{
                      maxHeight: 420,
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    <Space
                      direction='vertical'
                      size={10}
                      style={{ width: "100%" }}
                    >
                      {recentMaterials.map((item, index) => (
                        <Card
                          key={item.id || `recent-${index}`}
                          size='small'
                          bodyStyle={{ padding: 14 }}
                          style={{
                            borderRadius: 16,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            background: "#f8fafc",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gap: 6,
                            }}
                          >
                            <Text
                              strong
                              style={{
                                color: "#0f172a",
                                ...clampText(2),
                              }}
                            >
                              {item.title || "Materi tanpa judul"}
                            </Text>
                            <Text
                              type='secondary'
                              style={{
                                fontSize: 12,
                                ...clampText(1),
                              }}
                            >
                              {item.subject_name || "-"} |{" "}
                              {item.chapter_title || "-"}
                            </Text>
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              Dipublikasikan {formatDate(item.created_at)}
                            </Text>
                          </div>
                        </Card>
                      ))}
                    </Space>
                  </div>
                )}
              </Card>
            </Space>
          </motion.div>
        </Col>
      </Row>
    </Space>
  );
};

export default ParentDash;
