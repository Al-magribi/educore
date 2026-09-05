import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  MessageCircle,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  useGetParentDashboardQuery,
  useGetParentTelegramQuery,
} from "../../../service/lms/ApiParent";

const { Title, Text } = Typography;

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

const ParentDash = () => {
  const { data, isLoading, isError, error } = useGetParentDashboardQuery();
  const { data: telegramRes } = useGetParentTelegramQuery();
  const [selectedStudentId, setSelectedStudentId] = useState("all");

  const payload = data?.data;
  const telegram = telegramRes?.data;
  const summary = payload?.summary || {};
  const students = Array.isArray(payload?.students)
    ? payload.students.filter(Boolean)
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
        <Card style={cardSurface}>
          <Space align='start' size={14} style={{ width: "100%" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #dbeafe, #ccfbf1)",
                color: "#0f766e",
                flexShrink: 0,
              }}
            >
              <MessageCircle size={20} />
            </div>
            <Space direction='vertical' size={8} style={{ flex: 1, width: "100%" }}>
              <Space wrap>
                <Text strong style={{ fontSize: 16 }}>
                  Notifikasi Absensi Telegram
                </Text>
                {telegram?.is_bound ? (
                  <Tag color='success'>Terhubung</Tag>
                ) : (
                  <Tag>Belum terhubung</Tag>
                )}
              </Space>
              <Text type='secondary'>
                {telegram?.is_bound
                  ? "Akun Telegram Anda sudah terhubung. Notifikasi datang/pulang anak dan laporan kehadiran harian akan dikirim ke chat bot sekolah."
                  : "Hubungkan Telegram agar menerima notifikasi datang/pulang anak saat tap di mesin absensi, plus laporan kehadiran harian."}
              </Text>
              {telegram?.bind_link ? (
                <Button
                  type={telegram?.is_bound ? "default" : "primary"}
                  href={telegram.bind_link}
                  target='_blank'
                  rel='noreferrer'
                >
                  {telegram?.is_bound ? "Buka Bot Lagi" : "Hubungkan Telegram"}
                </Button>
              ) : (
                <Alert
                  type='warning'
                  showIcon
                  message='Bot Telegram sekolah belum dikonfigurasi. Hubungi admin sekolah.'
                />
              )}
            </Space>
          </Space>
        </Card>
      </motion.div>

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
              {filteredStudents.map((student, index) => (
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
                            <Text strong style={{ color: "#0f172a" }}>
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
                              <Text type='secondary' style={{ fontSize: 12 }}>
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
                              <Text type='secondary' style={{ fontSize: 12 }}>
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
                      </Space>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      </motion.div>
    </Space>
  );
};

export default ParentDash;
