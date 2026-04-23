import React, { useDeferredValue, useState } from "react";
import { useGetStudentExamsQuery } from "../../../../service/cbt/ApiExam";
import JoinExamModal from "./JoinExamModal";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
  Timer,
  UserRound,
} from "lucide-react";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

const heroStyle = {
  borderRadius: 28,
  overflow: "hidden",
  border: "none",
  background: "linear-gradient(135deg, #0f172a 0%, #134e4a 48%, #0ea5e9 100%)",
  boxShadow: "0 24px 50px rgba(15, 23, 42, 0.16)",
};

const surfaceCardStyle = {
  borderRadius: 24,
  border: "1px solid #e2e8f0",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
  height: "100%",
};

const examCardStyle = {
  borderRadius: 24,
  border: "1px solid #dbeafe",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  height: "100%",
  overflow: "hidden",
};

const pillStyle = {
  padding: "6px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.14)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.14)",
};

const metaRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#475569",
};

const iconBadgeStyle = (background, color) => ({
  width: 46,
  height: 46,
  borderRadius: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color,
});

const StudentExamList = () => {
  const { data, isLoading, isError } = useGetStudentExamsQuery();
  const [activeExam, setActiveExam] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [search, setSearch] = useState("");
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const deferredSearch = useDeferredValue(search);

  const exams = data || [];
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredExams = exams.filter((item) => {
    if (!normalizedSearch) return true;

    return [item.name, item.subject_name, item.teacher_name].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  });
  const examCount = exams.length;
  const className = exams[0]?.class_name || "Kelas belum tersedia";

  const openJoinModal = (exam) => {
    setActiveExam(exam);
    setIsJoinOpen(true);
  };

  const closeJoinModal = () => {
    setIsJoinOpen(false);
    setActiveExam(null);
  };

  if (isLoading) {
    return (
      <Space direction='vertical' size={16} style={{ width: "100%" }}>
        <Skeleton.Node active style={{ width: "100%", height: 220 }} />
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((item) => (
            <Col key={item} xs={24} md={8}>
              <Card style={surfaceCardStyle}>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
        <Card style={surfaceCardStyle}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </Space>
    );
  }

  if (isError) {
    return (
      <Card style={surfaceCardStyle}>
        <Text type='danger'>Gagal memuat jadwal ujian.</Text>
      </Card>
    );
  }

  return (
    <>
      <MotionDiv
        initial='hidden'
        animate='show'
        variants={containerVariants}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <MotionDiv variants={itemVariants}>
          <Card
            bordered={false}
            style={heroStyle}
            bodyStyle={{ padding: isMobile ? 20 : 28 }}
          >
            <Row gutter={[24, 24]} align='middle'>
              <Col xs={24} lg={15}>
                <Space
                  direction='vertical'
                  size={14}
                  style={{
                    width: "100%",
                    textAlign: isMobile ? "center" : "left",
                  }}
                >
                  <Space
                    align='center'
                    size={12}
                    style={{
                      justifyContent: isMobile ? "center" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: isMobile ? 52 : 58,
                        height: isMobile ? 52 : 58,
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.14)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <ClipboardList size={isMobile ? 24 : 28} />
                    </div>
                    <div>
                      <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                        CBT Siswa
                      </Text>
                      <Title
                        level={isMobile ? 4 : 2}
                        style={{ color: "#fff", margin: 0, lineHeight: 1.15 }}
                      >
                        Jadwal Ujian Aktif
                      </Title>
                    </div>
                  </Space>

                  <Space
                    wrap
                    size={[8, 8]}
                    style={{
                      justifyContent: isMobile ? "center" : "flex-start",
                    }}
                  >
                    <Tag bordered={false} style={pillStyle}>
                      <Space size={6}>
                        <GraduationCap size={14} />
                        <span>{className}</span>
                      </Space>
                    </Tag>
                    <Tag bordered={false} style={pillStyle}>
                      <Space size={6}>
                        <CalendarClock size={14} />
                        <span>{examCount} ujian aktif</span>
                      </Space>
                    </Tag>
                    <Tag bordered={false} style={pillStyle}>
                      <Space size={6}>
                        <ShieldCheck size={14} />
                        <span>Siap dikerjakan</span>
                      </Space>
                    </Tag>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            bordered={false}
            style={surfaceCardStyle}
            bodyStyle={{ padding: isMobile ? 18 : 24 }}
            title={
              <Flex
                vertical={isMobile ? true : false}
                gap={"middle"}
                justify='space-between'
                align='center'
                style={{ padding: 14 }}
              >
                <Space align='center' size={10}>
                  <div style={iconBadgeStyle("#dbeafe", "#1d4ed8")}>
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <Text type='secondary' style={{ display: "block" }}>
                      Daftar Tersedia
                    </Text>
                    <Text strong style={{ color: "#0f172a", fontSize: 16 }}>
                      Ujian yang bisa Anda ikuti
                    </Text>
                  </div>
                </Space>

                <Input.Search
                  allowClear
                  placeholder='Cari nama ujian, mapel, atau guru'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{ maxWidth: isMobile ? "100%" : 360 }}
                />
              </Flex>
            }
          >
            {filteredExams.length ? (
              <Row gutter={[16, 16]}>
                <AnimatePresence>
                  {filteredExams.map((item, index) => (
                    <Col key={item.id} xs={24} md={12} xl={8}>
                      <MotionDiv
                        variants={itemVariants}
                        initial='hidden'
                        animate='show'
                        exit='hidden'
                        transition={{ delay: index * 0.04 }}
                        whileHover={{ y: -6 }}
                        style={{ height: "100%" }}
                      >
                        <Card
                          bordered={false}
                          style={examCardStyle}
                          bodyStyle={{
                            padding: 20,
                            display: "flex",
                            flexDirection: "column",
                            gap: 18,
                            height: "100%",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <Space size={8} wrap style={{ marginBottom: 10 }}>
                                <Tag
                                  color='blue'
                                  style={{
                                    borderRadius: 999,
                                    marginInlineEnd: 0,
                                  }}
                                >
                                  {item.bank_type || "Ujian"}
                                </Tag>
                                <Tag
                                  color='green'
                                  style={{
                                    borderRadius: 999,
                                    marginInlineEnd: 0,
                                  }}
                                >
                                  Aktif
                                </Tag>
                              </Space>
                              <Title
                                level={5}
                                style={{
                                  margin: 0,
                                  color: "#0f172a",
                                  lineHeight: 1.3,
                                }}
                              >
                                {item.name}
                              </Title>
                            </div>
                            <div style={iconBadgeStyle("#eff6ff", "#2563eb")}>
                              <BookOpen size={18} />
                            </div>
                          </div>

                          <Space
                            direction='vertical'
                            size={12}
                            style={{ width: "100%" }}
                          >
                            <div style={metaRowStyle}>
                              <BookOpen size={16} />
                              <Text type='secondary'>
                                {item.subject_name ||
                                  "Mata pelajaran belum tersedia"}
                              </Text>
                            </div>
                            <div style={metaRowStyle}>
                              <UserRound size={16} />
                              <Text type='secondary'>
                                {item.teacher_name || "Guru belum tersedia"}
                              </Text>
                            </div>
                            <div style={metaRowStyle}>
                              <Timer size={16} />
                              <Text type='secondary'>
                                Durasi {item.duration_minutes || 0} menit
                              </Text>
                            </div>
                          </Space>

                          <div
                            style={{
                              marginTop: "auto",
                              paddingTop: 16,
                              borderTop: "1px solid #e2e8f0",
                            }}
                          >
                            <Button
                              type='primary'
                              block
                              size='large'
                              onClick={() => openJoinModal(item)}
                              style={{
                                height: 44,
                                borderRadius: 14,
                                fontWeight: 700,
                                boxShadow:
                                  "0 12px 24px rgba(37, 99, 235, 0.22)",
                              }}
                            >
                              <Space size={8}>
                                <span>Ikuti Ujian</span>
                                <ArrowRight size={16} />
                              </Space>
                            </Button>
                          </div>
                        </Card>
                      </MotionDiv>
                    </Col>
                  ))}
                </AnimatePresence>
              </Row>
            ) : (
              <Empty
                description={
                  normalizedSearch
                    ? "Tidak ada ujian yang cocok dengan pencarian."
                    : "Belum ada jadwal ujian untuk kelas Anda."
                }
              />
            )}
          </Card>
        </MotionDiv>
      </MotionDiv>

      <JoinExamModal
        open={isJoinOpen}
        onClose={closeJoinModal}
        exam={activeExam}
      />
    </>
  );
};

export default StudentExamList;
