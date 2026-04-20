import React, { Suspense, lazy, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Avatar,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Skeleton,
  Space,
  Button,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  BookCopy,
  BookOpen,
  Layers,
  Search,
  Users,
  GraduationCap,
  ArrowLeft,
  Sparkles,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGetSubjectsQuery } from "../../../service/lms/ApiLms";
import { useSearchParams } from "react-router-dom";
const TeacherView = lazy(() => import("./teacher/TeacherView"));
const AdminView = lazy(() => import("./admin/AdminView"));

const { Title, Text } = Typography;
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
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const heroCardStyle = {
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid rgba(191, 219, 254, 0.82)",
  background:
    "radial-gradient(circle at top right, rgba(125, 211, 252, 0.35), transparent 34%), linear-gradient(135deg, #0f172a 0%, #0f3d8f 45%, #0ea5e9 100%)",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
};

const statCardStyle = {
  borderRadius: 22,
  border: "1px solid #e2e8f0",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
  height: "100%",
};

const sectionCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.05)",
};

const subjectCardStyle = {
  borderRadius: 22,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
  height: "100%",
  cursor: "pointer",
};

const iconWrapStyle = (background, color) => ({
  width: 48,
  height: 48,
  borderRadius: 16,
  background,
  color,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
});

const LmsManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [searchParams, setSearchParams] = useSearchParams();

  const view = searchParams.get("view");
  const subject_id = searchParams.get("subject_id");

  const [searchText, setSearchText] = useState("");
  const { data: subjectsRes, isLoading } = useGetSubjectsQuery();
  const subjects = subjectsRes?.data || [];

  const filteredSubjects = useMemo(() => {
    if (!searchText) return subjects;
    const keyword = searchText.toLowerCase();
    return subjects.filter((item) => {
      const name = item?.name?.toLowerCase() || "";
      const code = item?.code?.toLowerCase() || "";
      const category = item?.category_name?.toLowerCase() || "";
      const branch = item?.branch_name?.toLowerCase() || "";
      return (
        name.includes(keyword) ||
        code.includes(keyword) ||
        category.includes(keyword) ||
        branch.includes(keyword)
      );
    });
  }, [subjects, searchText]);

  const roleLabel = isAdmin ? "Admin" : "Guru";
  const roleHint = isAdmin
    ? "Menampilkan semua pelajaran pada satuan Anda."
    : "Menampilkan pelajaran yang Anda ampu.";
  const activeSubject = subjects.find(
    (item) => String(item.id) === String(subject_id),
  );

  const summaryStats = useMemo(() => {
    const categoryCount = new Set(
      subjects.map((item) => item?.category_name).filter(Boolean),
    ).size;
    const branchCount = new Set(
      subjects.map((item) => item?.branch_name).filter(Boolean),
    ).size;
    const classCount = new Set(
      subjects.flatMap((item) => item?.class_names || []).filter(Boolean),
    ).size;

    return [
      {
        key: "subjects",
        title: "Total Pelajaran",
        value: subjects.length,
        suffix: "mapel",
        icon: <BookCopy size={20} />,
        bg: "#dbeafe",
        color: "#1d4ed8",
      },
      {
        key: "categories",
        title: "Kategori",
        value: categoryCount,
        suffix: "kategori",
        icon: <Layers size={20} />,
        bg: "#dcfce7",
        color: "#15803d",
      },
      {
        key: "search",
        title: "Hasil Tersaring",
        value: filteredSubjects.length,
        suffix: "mapel",
        icon: <Target size={20} />,
        bg: "#fef3c7",
        color: "#b45309",
      },
      {
        key: isTeacher ? "classes" : "branches",
        title: isTeacher ? "Cakupan Kelas" : "Cabang",
        value: isTeacher ? classCount : branchCount,
        suffix: isTeacher ? "kelas" : "cabang",
        icon: isTeacher ? <Users size={20} /> : <Sparkles size={20} />,
        bg: isTeacher ? "#ede9fe" : "#fae8ff",
        color: isTeacher ? "#6d28d9" : "#a21caf",
      },
    ];
  }, [filteredSubjects.length, isTeacher, subjects]);

  const handleDetail = (view, subject_id) => {
    setSearchParams({ view: view, subject_id });
  };

  const handleReset = () => setSearchParams({});

  return (
    <motion.div
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <title>Daftar Pelajaran</title>
      <motion.div variants={itemVariants}>
        <Card
          variant='borderless'
          style={{
            ...heroCardStyle,
            borderRadius: isMobile ? 22 : 28,
          }}
          styles={{ body: { padding: isMobile ? 20 : 28 } }}
        >
          <Row gutter={isMobile ? [18, 18] : [24, 24]} align='middle'>
            <Col xs={24} lg={15}>
              <Flex vertical gap={16}>
                <Space size={14} wrap align='start'>
                  <Avatar
                    size={isMobile ? 54 : 62}
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.22)",
                      boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)",
                    }}
                    icon={<GraduationCap size={26} />}
                  />
                  <Flex vertical>
                    <Space size={[8, 8]} wrap>
                      <Tag
                        style={{
                          marginRight: 0,
                          borderRadius: 999,
                          paddingInline: 12,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(255,255,255,0.12)",
                          color: "#fff",
                        }}
                      >
                        Akses {roleLabel}
                      </Tag>
                      <Tag
                        style={{
                          marginRight: 0,
                          borderRadius: 999,
                          paddingInline: 12,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(255,255,255,0.08)",
                          color: "#e0f2fe",
                        }}
                      >
                        {view && subject_id
                          ? activeSubject?.name || "Detail Pelajaran"
                          : `${subjects.length} pelajaran tersedia`}
                      </Tag>
                    </Space>

                    <Title
                      level={isMobile ? 4 : 2}
                      style={{
                        margin: 0,
                        color: "#fff",
                        lineHeight: 1.15,
                        maxWidth: 640,
                      }}
                    >
                      {view && subject_id
                        ? activeSubject?.name || "Detail Pelajaran"
                        : "Kelola Mata Pelajaran"}
                    </Title>
                  </Flex>
                </Space>
              </Flex>
            </Col>

            <Col xs={24} lg={9}>
              <Flex
                vertical
                gap={12}
                style={{
                  padding: isMobile ? 16 : 18,
                  borderRadius: isMobile ? 18 : 22,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {view && subject_id ? (
                  <Button
                    size='large'
                    icon={<ArrowLeft size={16} />}
                    onClick={handleReset}
                    style={{
                      width: "100%",
                      height: 46,
                      borderRadius: 14,
                      borderColor: "rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.16)",
                      color: "#fff",
                    }}
                  >
                    Kembali ke daftar pelajaran
                  </Button>
                ) : null}

                <Input
                  allowClear
                  size='large'
                  value={searchText}
                  placeholder='Cari pelajaran, kategori, atau cabang...'
                  prefix={<Search size={16} style={{ color: "#64748b" }} />}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.96)",
                  }}
                />

                <Flex
                  justify='space-between'
                  align={isMobile ? "flex-start" : "center"}
                  wrap='wrap'
                  gap={8}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    background: "rgba(15, 23, 42, 0.16)",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.75)" }}>
                    Status tampilan
                  </Text>
                  <Text strong style={{ color: "#fff" }}>
                    {view && subject_id ? "Detail aktif" : "Daftar mapel"}
                  </Text>
                </Flex>
              </Flex>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {view && subject_id ? (
        <motion.div variants={itemVariants}>
          <Suspense
            fallback={
              <Card variant='borderless' style={sectionCardStyle}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            }
          >
            {isTeacher ? (
              <TeacherView subjectId={subject_id} subject={activeSubject} />
            ) : (
              <AdminView subjectId={subject_id} subject={activeSubject} />
            )}
          </Suspense>
        </motion.div>
      ) : isLoading ? (
        <motion.div variants={itemVariants}>
          <Row gutter={[16, 16]}>
            {[1, 2, 3, 4, 5, 6].map((key) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={key}>
                <Card variant='borderless' style={subjectCardStyle}>
                  <Skeleton active paragraph={{ rows: 3 }} />
                </Card>
              </Col>
            ))}
          </Row>
        </motion.div>
      ) : filteredSubjects.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card variant='borderless' style={sectionCardStyle}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchText
                  ? `Tidak ada pelajaran yang cocok dengan pencarian "${searchText}".`
                  : isTeacher
                    ? "Belum ada pelajaran yang Anda ampu."
                    : "Belum ada pelajaran terdaftar."
              }
            />
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card
            variant='borderless'
            style={sectionCardStyle}
            styles={{ body: { padding: isMobile ? 18 : 22 } }}
          >
            <Flex
              justify='space-between'
              align={isMobile ? "flex-start" : "center"}
              wrap='wrap'
              gap={12}
              style={{ marginBottom: 18 }}
            >
              <div>
                <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
                  Katalog Pelajaran
                </Title>
                <Text type='secondary'>
                  Pilih pelajaran untuk membuka ringkasan, rekap, dan
                  pengelolaan detail.
                </Text>
              </div>
              <Tag
                style={{
                  marginRight: 0,
                  borderRadius: 999,
                  paddingInline: 12,
                  background: "#eff6ff",
                  borderColor: "#bfdbfe",
                  color: "#1d4ed8",
                }}
              >
                {filteredSubjects.length} ditampilkan
              </Tag>
            </Flex>

            <Row gutter={[16, 16]}>
              {filteredSubjects.map((item) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
                  <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{ height: "100%" }}
                  >
                    <Card
                      hoverable
                      variant='borderless'
                      onClick={() =>
                        handleDetail(isTeacher ? "teacher" : "admin", item.id)
                      }
                      style={{
                        ...subjectCardStyle,
                        borderRadius: isMobile ? 18 : 22,
                      }}
                      styles={{ body: { padding: isMobile ? 16 : 18 } }}
                    >
                      <Flex vertical justify='space-between' gap={16}>
                        <Flex align='start' gap={14}>
                          <div style={iconWrapStyle("#dcfce7", "#15803d")}>
                            <BookOpen size={20} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              strong
                              style={{
                                fontSize: 15,
                                color: "#0f172a",
                                display: "block",
                                lineHeight: 1.45,
                              }}
                              title={item.name}
                            >
                              {item.name}
                            </Text>
                            <Text
                              type='secondary'
                              style={{
                                fontSize: 12,
                                display: "block",
                                marginTop: 4,
                              }}
                            >
                              Kode: {item.code || "-"}
                            </Text>
                          </div>
                        </Flex>

                        <Space size={[8, 8]} wrap>
                          <Tag
                            style={{
                              borderRadius: 999,
                              marginRight: 0,
                              background: "#eff6ff",
                              borderColor: "#bfdbfe",
                              color: "#1d4ed8",
                            }}
                            icon={<Layers size={13} />}
                          >
                            {item.category_name || "Umum"}
                          </Tag>
                          {item.branch_name ? (
                            <Tag
                              style={{
                                borderRadius: 999,
                                marginRight: 0,
                                background: "#ecfeff",
                                borderColor: "#a5f3fc",
                                color: "#0f766e",
                              }}
                            >
                              {item.branch_name}
                            </Tag>
                          ) : null}
                        </Space>

                        <Flex
                          justify='space-between'
                          align={isMobile ? "flex-start" : "center"}
                          wrap='wrap'
                          gap={10}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 16,
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <div>
                            <Text
                              type='secondary'
                              style={{ fontSize: 12, display: "block" }}
                            >
                              Target KKM
                            </Text>
                            <Text strong style={{ color: "#0f172a" }}>
                              {item.kkm ?? "-"}
                            </Text>
                          </div>
                          {isTeacher && item.class_names?.length > 0 ? (
                            <Tag
                              style={{
                                borderRadius: 999,
                                marginRight: 0,
                                background: "#f0fdf4",
                                borderColor: "#bbf7d0",
                                color: "#15803d",
                              }}
                              icon={<Users size={13} />}
                            >
                              {item.class_names.length} Kelas
                            </Tag>
                          ) : (
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              Siap dibuka
                            </Text>
                          )}
                        </Flex>

                        <Text
                          type='secondary'
                          style={{
                            fontSize: 12,
                            minHeight: isMobile ? "auto" : 34,
                            display: "block",
                            lineHeight: 1.45,
                          }}
                        >
                          {isTeacher && item.class_names?.length > 0
                            ? item.class_names.join(", ")
                            : "Buka pelajaran ini untuk melihat pengelolaan dan rekap terkait."}
                        </Text>
                      </Flex>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LmsManagement;
