import React from "react";
import { useGetTeacherDashQuery } from "../../../service/main/ApiDash";
import {
  Alert,
  Avatar,
  Card,
  Col,
  Flex,
  Grid,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { BookOpen, CalendarCheck, ClipboardList, Layers } from "lucide-react";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
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

const cardStyle = {
  borderRadius: 24,
  border: "1px solid #eef2f7",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.07)",
  overflow: "hidden",
};

const heroStyle = {
  ...cardStyle,
  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
  color: "#fff",
  boxShadow: "0 24px 50px rgba(15, 23, 42, 0.18)",
};

const statCardStyle = {
  borderRadius: 18,
  border: "1px solid #e5edf8",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  height: "100%",
};

const sectionCardStyle = {
  ...cardStyle,
  height: "100%",
};

const tableCardHeadStyle = {
  borderBottom: "1px solid #f1f5f9",
  minHeight: 64,
};

const listItemStyle = {
  borderRadius: 18,
  border: "1px solid #edf2f7",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  padding: 16,
};

const iconStyle = (color) => ({ color, width: 20, height: 20 });

const iconWrapStyle = (background, color) => ({
  width: 42,
  height: 42,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color,
  flexShrink: 0,
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const renderSectionTitle = (icon, title, subtitle) => (
  <Space align='center' size={10} wrap={false} style={{ width: "100%" }}>
    {icon}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <Text
        type='secondary'
        style={{
          fontSize: 12,
          whiteSpace: "normal",
          display: "block",
        }}
      >
        {subtitle}
      </Text>
    </div>
  </Space>
);

const renderTagList = (items = [], emptyText = "Belum ada data") =>
  items.length ? (
    <Space wrap size={[6, 6]}>
      {items.map((item) => (
        <Tag key={item.id}>{item.name}</Tag>
      ))}
    </Space>
  ) : (
    <Text type='secondary'>{emptyText}</Text>
  );

const TeacherDash = () => {
  const { data, isLoading, isError } = useGetTeacherDashQuery();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const stats = [
    {
      key: "subjects",
      title: "Mata Pelajaran",
      value: data?.stats?.subjects || 0,
      icon: <BookOpen style={iconStyle("#1d4ed8")} />,
      bg: "#dbeafe",
      color: "#1d4ed8",
    },
    {
      key: "banks",
      title: "Bank Soal",
      value: data?.stats?.banks || 0,
      icon: <Layers style={iconStyle("#0f766e")} />,
      bg: "#ccfbf1",
      color: "#0f766e",
    },
    {
      key: "exams-active",
      title: "Ujian Aktif",
      value: data?.stats?.examsActive || 0,
      icon: <CalendarCheck style={iconStyle("#15803d")} />,
      bg: "#dcfce7",
      color: "#15803d",
    },
    {
      key: "exams-total",
      title: "Total Ujian",
      value: data?.stats?.examsTotal || 0,
      icon: <ClipboardList style={iconStyle("#c2410c")} />,
      bg: "#ffedd5",
      color: "#c2410c",
    },
  ];

  if (isLoading) {
    return (
      <Space direction='vertical' size={16} style={{ width: "100%" }}>
        <Card style={heroStyle} bodyStyle={{ padding: isMobile ? 20 : 28 }}>
          <Skeleton
            active
            avatar
            paragraph={{ rows: 2 }}
            title={{ width: "40%" }}
          />
        </Card>

        <Row gutter={[16, 16]}>
          {stats.map((item) => (
            <Col xs={24} sm={12} xl={6} key={item.key}>
              <Card style={statCardStyle}>
                <Skeleton
                  active
                  paragraph={{ rows: 1 }}
                  title={{ width: "50%" }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Card style={sectionCardStyle}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </Space>
    );
  }

  if (isError) {
    return (
      <Alert
        message='Gagal memuat data dashboard guru.'
        type='error'
        showIcon
      />
    );
  }

  const teacherName = data?.teacher?.full_name || "Guru";
  const teacherInitial = teacherName?.[0]?.toUpperCase() || "G";
  const homebaseSummary = [
    data?.homebase?.name || "Homebase",
    data?.homebase?.level || "Satuan",
  ].join(" / ");
  const subjects = data?.subjects || [];
  const banks = data?.banks || [];
  const exams = data?.exams || [];

  return (
    <motion.div
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{
        padding: isMobile ? "0 0 12px" : "0 8px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <motion.div variants={itemVariants}>
        <Card style={heroStyle} bodyStyle={{ padding: isMobile ? 20 : 28 }}>
          <Flex
            vertical={isMobile ? true : false}
            justify={isMobile ? "center" : "space-between"}
          >
            <Flex gap={"middle"} align='center'>
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                style={{ flexShrink: 0 }}
              >
                <Avatar
                  size={isMobile ? 60 : 72}
                  src={data?.teacher?.img_url || undefined}
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    fontWeight: 700,
                    fontSize: isMobile ? 24 : 28,
                    border: "1px solid rgba(255,255,255,0.22)",
                    flexShrink: 0,
                  }}
                >
                  {teacherInitial}
                </Avatar>
              </motion.div>

              <Space vertical>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  Dashboard Guru
                </Text>
                <Title
                  level={isMobile ? 4 : 3}
                  style={{
                    margin: 0,
                    color: "#fff",
                    lineHeight: 1.15,
                    fontSize: isMobile ? 24 : undefined,
                  }}
                >
                  {teacherName}
                </Title>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  {homebaseSummary}
                </Text>
              </Space>
            </Flex>

            <Space wrap size={[8, 8]} style={{ marginTop: isMobile ? 8 : 6 }}>
              <Tag
                style={{
                  borderRadius: 999,
                  paddingInline: 12,
                  paddingBlock: 2,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  marginInlineEnd: 0,
                  fontSize: 12,
                }}
              >
                NIP: {data?.teacher?.nip || "-"}
              </Tag>
              <Tag
                style={{
                  borderRadius: 999,
                  paddingInline: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: data?.activePeriode
                    ? "rgba(34,197,94,0.18)"
                    : "rgba(248,113,113,0.18)",
                  color: "#fff",
                  marginInlineEnd: 0,
                  whiteSpace: "normal",
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {data?.activePeriode
                  ? `Periode Aktif: ${data.activePeriode.name}`
                  : "Belum ada periode aktif"}
              </Tag>
            </Space>
          </Flex>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Row gutter={[16, 16]}>
          {stats.map((item) => (
            <Col xs={24} sm={12} xl={6} key={item.key}>
              <motion.div
                whileHover={isMobile ? undefined : { y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <Card style={statCardStyle} bodyStyle={{ padding: 20 }}>
                  <Space
                    align='start'
                    size={14}
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Space size={14} style={{ width: "100%" }}>
                      <span style={iconWrapStyle(item.bg, item.color)}>
                        {item.icon}
                      </span>
                      <Space
                        direction='vertical'
                        size={2}
                        style={{ minWidth: 0 }}
                      >
                        <Text type='secondary'>{item.title}</Text>
                        <Statistic
                          value={item.value}
                          valueStyle={{ fontSize: isMobile ? 24 : 28 }}
                        />
                      </Space>
                    </Space>
                  </Space>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={renderSectionTitle(
                <span style={iconWrapStyle("#dbeafe", "#1d4ed8")}>
                  <BookOpen style={iconStyle("#1d4ed8")} />
                </span>,
                "Mata Pelajaran",
                "Daftar mapel dan kelas yang diampu",
              )}
              style={sectionCardStyle}
              headStyle={tableCardHeadStyle}
              bodyStyle={{ paddingTop: 8, paddingInline: isMobile ? 12 : 24 }}
            >
              <Space direction='vertical' size={12} style={{ width: "100%" }}>
                {subjects.length ? (
                  subjects.map((subject) => (
                    <div key={subject.id} style={listItemStyle}>
                      <Space
                        direction='vertical'
                        size={10}
                        style={{ width: "100%" }}
                      >
                        <div>
                          <Text strong style={{ fontSize: 15 }}>
                            {subject.name}
                          </Text>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 2,
                            }}
                          >
                            {subject.code || "Tanpa kode"}
                          </div>
                        </div>
                        <Space wrap size={[8, 8]}>
                          <Tag color='blue'>
                            Kelas: {subject.class_count || 0}
                          </Tag>
                        </Space>
                        {renderTagList(subject.classes, "Belum ada kelas")}
                      </Space>
                    </div>
                  ))
                ) : (
                  <Text type='secondary'>Belum ada data mata pelajaran</Text>
                )}
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={renderSectionTitle(
                <span style={iconWrapStyle("#ccfbf1", "#0f766e")}>
                  <Layers style={iconStyle("#0f766e")} />
                </span>,
                "Bank Soal Terbaru",
                "Kumpulan soal terbaru per mata pelajaran",
              )}
              style={sectionCardStyle}
              headStyle={tableCardHeadStyle}
              bodyStyle={{ paddingTop: 8, paddingInline: isMobile ? 12 : 24 }}
            >
              <Space direction='vertical' size={12} style={{ width: "100%" }}>
                {banks.length ? (
                  banks.map((bank) => (
                    <div key={bank.id} style={listItemStyle}>
                      <Space
                        direction='vertical'
                        size={10}
                        style={{ width: "100%" }}
                      >
                        <div>
                          <Text strong style={{ fontSize: 15 }}>
                            {bank.title}
                          </Text>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 2,
                            }}
                          >
                            {bank.subject_name || "Tanpa mapel"}
                          </div>
                        </div>
                        <Space wrap size={[8, 8]}>
                          <Tag color='geekblue'>{bank.type || "-"}</Tag>
                          <Tag color='cyan'>
                            Soal: {bank.question_count || 0}
                          </Tag>
                          <Tag>{formatDate(bank.created_at)}</Tag>
                        </Space>
                      </Space>
                    </div>
                  ))
                ) : (
                  <Text type='secondary'>Belum ada bank soal</Text>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          title={renderSectionTitle(
            <span style={iconWrapStyle("#ffedd5", "#c2410c")}>
              <ClipboardList style={iconStyle("#c2410c")} />
            </span>,
            "Jadwal Ujian Terbaru",
            "Pantau ujian aktif dan distribusi kelasnya",
          )}
          style={sectionCardStyle}
          headStyle={tableCardHeadStyle}
          bodyStyle={{ paddingTop: 8, paddingInline: isMobile ? 12 : 24 }}
        >
          <Space direction='vertical' size={12} style={{ width: "100%" }}>
            {exams.length ? (
              exams.map((exam) => (
                <div key={exam.id} style={listItemStyle}>
                  <Space
                    direction='vertical'
                    size={10}
                    style={{ width: "100%" }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 15 }}>
                        {exam.name}
                      </Text>
                      <div
                        style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
                      >
                        {exam.subject_name || "Tanpa mapel"}
                      </div>
                    </div>
                    <Space wrap size={[8, 8]}>
                      <Tag color={exam.is_active ? "green" : "default"}>
                        {exam.is_active ? "Aktif" : "Nonaktif"}
                      </Tag>
                      <Tag color='blue'>{`${exam.duration_minutes || 0} mnt`}</Tag>
                      <Tag>{formatDate(exam.created_at)}</Tag>
                    </Space>
                    {renderTagList(exam.classes, "Belum ada kelas")}
                  </Space>
                </div>
              ))
            ) : (
              <Text type='secondary'>Belum ada jadwal ujian</Text>
            )}
          </Space>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default TeacherDash;
