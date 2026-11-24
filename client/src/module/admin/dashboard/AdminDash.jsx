import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Alert,
  Col,
  Flex,
  Grid,
  List,
  Row,
  Skeleton,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Folders,
  GraduationCap,
  History,
  School,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useGetDashboardSummaryQuery } from "../../../service/main/ApiDash";
import PageHeader from "../../../components/ui/PageHeader";
import { CardTitle, IconBox, MuseCard, StatCard } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const actionTagColor = (action = "") => {
  const value = action.toLowerCase();
  if (value.includes("login")) return "green";
  if (value.includes("logout")) return "volcano";
  if (value.includes("update")) return "blue";
  if (value.includes("hapus") || value.includes("delete")) return "red";
  return "geekblue";
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const QUICK_LINKS = [
  { key: "periode", label: "Atur periode ajaran", to: "/admin-data-pokok?tab=periode", icon: <CalendarDays size={16} /> },
  { key: "class", label: "Kelola kelas & siswa", to: "/admin-data-pokok?tab=class", icon: <Folders size={16} /> },
  { key: "teacher", label: "Data guru", to: "/admin-data-akademik?tab=teacher", icon: <UserCheck size={16} /> },
  { key: "subject", label: "Mata pelajaran", to: "/admin-data-akademik?tab=subject", icon: <BookOpen size={16} /> },
];

const AdminDash = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useGetDashboardSummaryQuery();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const stats = [
    { key: "students", title: "Siswa Aktif", value: data?.stats?.students || 0, icon: <UsersRound size={24} />, tone: "primary" },
    { key: "teachers", title: "Guru Aktif", value: data?.stats?.teachers || 0, icon: <UserCheck size={24} />, tone: "accent" },
    { key: "classes", title: "Rombel", value: data?.stats?.classes || 0, icon: <GraduationCap size={24} />, tone: "navy" },
    { key: "subjects", title: "Mapel", value: data?.stats?.subjects || 0, icon: <BookOpen size={24} />, tone: "warning" },
    { key: "exams", title: "Ujian Aktif", value: data?.stats?.activeExams || 0, icon: <ClipboardList size={24} />, tone: "success" },
  ];

  const logColumns = [
    {
      title: "WAKTU",
      dataIndex: "created_at",
      key: "created_at",
      render: formatDateTime,
      width: 190,
      ellipsis: true,
    },
    {
      title: "USER",
      dataIndex: "full_name",
      key: "full_name",
      render: (text) => <Text strong>{text}</Text>,
      ellipsis: true,
    },
    {
      title: "AKTIVITAS",
      dataIndex: "action",
      key: "action",
      render: (text) => (
        <Tag color={actionTagColor(text)} style={{ margin: 0 }}>
          {text}
        </Tag>
      ),
      width: 150,
    },
  ];

  if (isLoading) {
    return (
      <Flex vertical gap={24}>
        <Skeleton active title paragraph={{ rows: 1 }} />
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {stats.map((item) => (
            <MuseCard key={item.key}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </MuseCard>
          ))}
        </div>
      </Flex>
    );
  }

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        title='Gagal memuat data dashboard'
        description={error?.data?.message || "Periksa koneksi lalu muat ulang halaman."}
      />
    );
  }

  const activePeriode = data?.activePeriode;
  const summaryRows = [
    { key: "level", title: "Jenjang", value: data?.homebase?.level || "-", icon: <School size={16} /> },
    { key: "periode", title: "Periode Aktif", value: activePeriode?.name || "Belum diatur", icon: <CalendarDays size={16} /> },
    { key: "majors", title: "Jurusan", value: (data?.stats?.majors || 0).toLocaleString("id-ID"), icon: <Building2 size={16} /> },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ display: "grid", gap: isMobile ? 16 : 24 }}
    >
      <PageHeader
        title={data?.homebase?.name || "Dashboard Satuan"}
        description='Ringkasan operasional satuan, statistik inti, dan aktivitas sistem terbaru.'
        meta={
          <Flex gap={8} wrap='wrap'>
            <Tag style={{ margin: 0 }}>Jenjang: {data?.homebase?.level || "Satuan"}</Tag>
            <Tag color={activePeriode ? "green" : "volcano"} style={{ margin: 0 }}>
              {activePeriode ? `Periode aktif: ${activePeriode.name}` : "Belum ada periode aktif"}
            </Tag>
          </Flex>
        }
      />

      {!activePeriode ? (
        <Alert
          type='warning'
          showIcon
          title='Belum ada periode aktif'
          description='Sebagian data (kelas, jadwal, ujian) bergantung pada periode aktif.'
          action={
            <a href='/admin-data-pokok?tab=periode' onClick={(e) => { e.preventDefault(); navigate("/admin-data-pokok?tab=periode"); }}>
              Atur periode
            </a>
          }
        />
      ) : null}

      <div
        style={{
          display: "grid",
          gap: isMobile ? 16 : 24,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        {stats.map(({ key, ...item }) => (
          <StatCard key={key} {...item} />
        ))}
      </div>

      <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]}>
        <Col xs={24} lg={9}>
          <Flex vertical gap={isMobile ? 16 : 24}>
            <MuseCard
              title={<CardTitle title='Ringkasan Satuan' description='Kondisi dasar yang memengaruhi data akademik.' />}
            >
              <Flex vertical gap={16}>
                {summaryRows.map((item) => (
                  <Flex key={item.key} align='center' justify='space-between' gap={12}>
                    <Flex align='center' gap={12} style={{ minWidth: 0 }}>
                      <IconBox icon={item.icon} size={32} tone='primarySoft' />
                      <Text style={{ fontWeight: 600 }}>{item.title}</Text>
                    </Flex>
                    <Text
                      strong
                      style={{ color: museColors.navy, textAlign: "right", minWidth: 0, wordBreak: "break-word" }}
                    >
                      {item.value}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </MuseCard>

            <MuseCard flush title={<CardTitle title='Akses Cepat' />}>
              <List
                dataSource={QUICK_LINKS}
                renderItem={(item) => (
                  <List.Item
                    style={{ padding: "12px 24px", cursor: "pointer" }}
                    onClick={() => navigate(item.to)}
                  >
                    <a
                      href={item.to}
                      onClick={(e) => e.preventDefault()}
                      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", color: museColors.text }}
                    >
                      <span style={{ color: museColors.primary, display: "inline-flex" }}>{item.icon}</span>
                      <span style={{ flex: 1, fontWeight: 600 }}>{item.label}</span>
                      <ChevronRight size={16} color={museColors.muted} />
                    </a>
                  </List.Item>
                )}
              />
            </MuseCard>
          </Flex>
        </Col>

        <Col xs={24} lg={15}>
          <MuseCard
            flush
            style={{ height: "100%" }}
            title={
              <CardTitle
                icon={<History size={16} />}
                title='Aktivitas Sistem Terakhir'
                description='Log login dan perubahan data terbaru.'
              />
            }
          >
            {isMobile ? (
              <List
                dataSource={data?.logs || []}
                locale={{ emptyText: "Belum ada aktivitas terbaru" }}
                renderItem={(item) => (
                  <List.Item style={{ padding: "12px 16px" }}>
                    <Flex vertical gap={4} style={{ width: "100%" }}>
                      <Flex align='center' justify='space-between' gap={8} wrap='wrap'>
                        <Text strong>{item.full_name}</Text>
                        <Tag color={actionTagColor(item.action)} style={{ margin: 0 }}>
                          {item.action}
                        </Tag>
                      </Flex>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        {formatDateTime(item.created_at)}
                      </Text>
                    </Flex>
                  </List.Item>
                )}
              />
            ) : (
              <Table
                dataSource={data?.logs || []}
                columns={logColumns}
                pagination={false}
                rowKey={(record) => `${record.created_at}-${record.full_name}-${record.action}`}
                locale={{ emptyText: "Belum ada aktivitas terbaru" }}
                scroll={{ x: 520 }}
              />
            )}
          </MuseCard>
        </Col>
      </Row>
    </MotionDiv>
  );
};

export default AdminDash;
