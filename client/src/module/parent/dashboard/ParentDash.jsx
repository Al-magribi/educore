import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Col,
  Descriptions,
  Empty,
  Flex,
  Grid,
  Progress,
  Row,
  Select,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Award,
  BookOpen,
  CalendarCheck,
  FileBarChart,
  FileText,
  KeyRound,
  LayoutGrid,
  PiggyBank,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useGetParentDashboardQuery, useGetParentTelegramQuery } from "../../../service/lms/ApiParent";
import { CardTitle, MuseCard, PageTabs, StatCard } from "../../../components/ui/muse";
import { DataRow } from "../../../components/ui/muse/DataSection";
import { museColors } from "../../../config/theme";
import { FEATURES, hasFeature } from "../../../config/productFeatures";
import QuickLinksCard from "../../lms/dashboard/QuickLinksCard";
import TelegramBindCard from "../../lms/dashboard/TelegramBindCard";
import useNow, { getGreeting } from "../../lms/dashboard/useNow";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const isFinanceEnabled = hasFeature(FEATURES.FINANCE);
const MATERIAL_PREVIEW = 4;

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const getAttendance = (student) => {
  const total = Number(student?.lms?.attendance?.total_sessions || 0);
  const hadir = Number(student?.lms?.attendance?.hadir_sessions || 0);
  return { total, hadir, rate: total ? Math.round((hadir / total) * 100) : null };
};

const attendanceColor = (rate) =>
  rate == null ? museColors.border : rate >= 90 ? museColors.success : rate >= 75 ? museColors.warning : museColors.danger;

const descriptionStyles = {
  label: { color: museColors.muted, fontSize: 12, fontWeight: 600, paddingBottom: 2 },
  content: { color: museColors.text, fontWeight: 600 },
};

const AttendanceBar = ({ student }) => {
  const { total, hadir, rate } = getAttendance(student);
  return (
    <div style={{ minWidth: 0 }}>
      <Flex justify='space-between' gap={8}>
        <Text type='secondary' style={{ fontSize: 12 }}>
          Kehadiran di kelas
        </Text>
        <Text strong style={{ fontSize: 12 }}>
          {rate == null ? "Belum ada data" : `${rate}% · ${hadir}/${total} sesi`}
        </Text>
      </Flex>
      <Progress
        percent={rate ?? 0}
        showInfo={false}
        strokeColor={attendanceColor(rate)}
        size={["100%", 3]}
        style={{ margin: 0 }}
        aria-label={`Kehadiran ${student.student_name}`}
      />
    </div>
  );
};

/** Kartu lengkap satu anak (tab "Anak"). */
const ChildCard = ({ student, onNavigate }) => {
  const savings = student?.finance?.savings;
  const classCash = student?.finance?.class_cash;

  return (
    <MuseCard style={{ height: "100%" }}>
      <Flex vertical gap={16}>
        <Flex gap={12} align='center' style={{ minWidth: 0 }}>
          <Avatar size={48} style={{ background: museColors.primary, fontWeight: 700, flexShrink: 0 }}>
            {student.student_name?.trim()?.[0]?.toUpperCase() || "S"}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ display: "block", fontSize: 16, wordBreak: "break-word" }}>
              {student.student_name}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              NIS {student.nis || "-"}
            </Text>
          </div>
        </Flex>

        <Descriptions
          layout='vertical'
          colon={false}
          column={{ xs: 2, sm: 3 }}
          styles={descriptionStyles}
          items={[
            { key: "class", label: "Kelas", children: student.class_name || "-" },
            { key: "grade", label: "Tingkat", children: student.grade_name || "-" },
            { key: "homebase", label: "Satuan", children: student.homebase_name || "-" },
            { key: "subjects", label: "Mapel", children: student?.lms?.subjects_total || 0 },
            { key: "materials", label: "Materi", children: student?.lms?.materials_total || 0 },
            ...(isFinanceEnabled
              ? [
                  { key: "savings", label: "Tabungan", children: rupiah.format(savings?.balance || 0) },
                  { key: "cash", label: "Kas Kelas", children: rupiah.format(classCash?.balance || 0) },
                ]
              : []),
          ]}
        />

        <AttendanceBar student={student} />

        <Flex gap={8} wrap>
          <Button icon={<FileBarChart size={16} />} onClick={() => onNavigate("/laporan-akademik")}>
            Laporan Akademik
          </Button>
          <Button icon={<Award size={16} />} onClick={() => onNavigate("/poin-anak")}>
            Poin
          </Button>
        </Flex>
      </Flex>
    </MuseCard>
  );
};

const materialRow = (item, last) => (
  <DataRow
    key={item.id}
    last={last}
    icon={<FileText size={18} />}
    tone='primarySoft'
    title={item.title}
    subtitle={[item.subject_name, item.chapter_title].filter(Boolean).join(" · ")}
    tags={<Tag style={{ margin: 0 }}>{formatDate(item.created_at)}</Tag>}
  />
);

const DashSkeleton = () => (
  <Flex vertical gap={24}>
    <Skeleton active title paragraph={{ rows: 1 }} />
    <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      {[0, 1, 2].map((key) => (
        <MuseCard key={key}>
          <Skeleton active paragraph={{ rows: 1 }} />
        </MuseCard>
      ))}
    </div>
    <MuseCard>
      <Skeleton active avatar paragraph={{ rows: 4 }} />
    </MuseCard>
  </Flex>
);

const ParentDash = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const screens = useBreakpoint();
  const gutter = screens.md ? 24 : 16;
  const now = useNow();
  const { data, isLoading, isError, error } = useGetParentDashboardQuery();
  const { data: telegramRes } = useGetParentTelegramQuery();
  const [selectedId, setSelectedId] = useState("all");

  const payload = data?.data;
  const rawStudents = payload?.students;
  const rawMaterials = payload?.recent_lms;
  const students = useMemo(() => (Array.isArray(rawStudents) ? rawStudents.filter(Boolean) : []), [rawStudents]);
  const materials = useMemo(() => rawMaterials || [], [rawMaterials]);

  // Pilihan yang sudah tidak ada (mis. anak dipindah) kembali ke "Semua".
  const effectiveId = students.some((s) => String(s.student_id) === selectedId) ? selectedId : "all";
  const visible = useMemo(
    () => (effectiveId === "all" ? students : students.filter((s) => String(s.student_id) === effectiveId)),
    [students, effectiveId],
  );

  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, student) => {
          const { total, hadir } = getAttendance(student);
          acc.sessions += total;
          acc.hadir += hadir;
          acc.subjects += Number(student?.lms?.subjects_total || 0);
          acc.materials += Number(student?.lms?.materials_total || 0);
          acc.savings += Number(student?.finance?.savings?.balance || 0);
          return acc;
        },
        { sessions: 0, hadir: 0, subjects: 0, materials: 0, savings: 0 },
      ),
    [visible],
  );

  const goToTab = useCallback(
    (tab) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  if (isLoading) return <DashSkeleton />;

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        title='Gagal memuat dashboard orang tua'
        description={error?.data?.message || "Periksa koneksi lalu muat ulang halaman."}
      />
    );
  }

  const attendanceRate = totals.sessions ? Math.round((totals.hadir / totals.sessions) * 100) : null;

  const stats = [
    {
      key: "attendance",
      title: "Kehadiran di Kelas",
      value: attendanceRate == null ? "-" : `${attendanceRate}%`,
      note: totals.sessions ? `${totals.hadir} dari ${totals.sessions} sesi` : "Belum ada data presensi",
      icon: <CalendarCheck size={24} />,
      tone: "success",
    },
    { key: "subjects", title: "Mata Pelajaran", value: totals.subjects, icon: <BookOpen size={24} />, tone: "primary" },
    { key: "materials", title: "Materi Tersedia", value: totals.materials, icon: <FileText size={24} />, tone: "accent" },
    isFinanceEnabled && {
      key: "savings",
      title: "Saldo Tabungan",
      value: rupiah.format(totals.savings),
      icon: <PiggyBank size={24} />,
      tone: "warning",
    },
  ].filter(Boolean);

  const quickLinks = [
    { key: "report", label: "Laporan akademik", description: "Nilai dan capaian belajar", to: "/laporan-akademik", icon: <FileBarChart size={16} /> },
    { key: "points", label: "Poin anak", description: "Prestasi dan pelanggaran", to: "/poin-anak", icon: <Award size={16} /> },
    { key: "profile", label: "Profil saya", description: "Email dan nomor telepon", to: "/profile?tab=data-diri", icon: <UserRound size={16} /> },
    { key: "password", label: "Ganti password", to: "/profile?tab=keamanan", icon: <KeyRound size={16} /> },
  ];

  const noStudentAlert = (
    <Alert
      type='warning'
      showIcon
      title='Belum ada anak yang terhubung'
      description='Hubungi admin sekolah agar akun Anda ditautkan ke data siswa pada periode aktif.'
    />
  );

  const items = [
    {
      key: "ringkasan",
      label: "Ringkasan",
      icon: <LayoutGrid />,
      render: () => (
        <Flex vertical gap={gutter}>
          {students.length ? null : noStudentAlert}
          <div style={{ display: "grid", gap: gutter, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {stats.map(({ key, ...item }) => (
              <StatCard key={key} {...item} />
            ))}
          </div>
          <Row gutter={[gutter, gutter]}>
            <Col xs={24} lg={15}>
              <Flex vertical gap={gutter}>
                <MuseCard
                  flush
                  title={
                    <CardTitle
                      icon={<UsersRound size={16} />}
                      title='Anak Saya'
                      description={`${students.length} anak terhubung`}
                    />
                  }
                  extra={
                    students.length ? (
                      <Button type='link' onClick={() => goToTab("anak")} style={{ paddingInline: 0 }}>
                        Detail
                      </Button>
                    ) : null
                  }
                >
                  {visible.length ? (
                    visible.map((student, index) => (
                      <Flex
                        key={student.student_id}
                        vertical
                        gap={10}
                        style={{
                          padding: screens.md ? "14px 24px" : "12px 16px",
                          borderTop: index === 0 ? 0 : `1px solid ${museColors.divider}`,
                        }}
                      >
                        <Flex gap={12} align='center' style={{ minWidth: 0 }}>
                          <Avatar style={{ background: museColors.primary, fontWeight: 700, flexShrink: 0 }}>
                            {student.student_name?.trim()?.[0]?.toUpperCase() || "S"}
                          </Avatar>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Text strong ellipsis style={{ display: "block" }}>
                              {student.student_name}
                            </Text>
                            <Text type='secondary' ellipsis style={{ display: "block", fontSize: 12 }}>
                              {[student.class_name, student.homebase_name].filter(Boolean).join(" · ") || "Kelas belum diatur"}
                            </Text>
                          </div>
                        </Flex>
                        <AttendanceBar student={student} />
                      </Flex>
                    ))
                  ) : (
                    <Text type='secondary' style={{ display: "block", padding: "8px 24px 24px" }}>
                      Data anak akan tampil setelah akun ditautkan.
                    </Text>
                  )}
                </MuseCard>

                <MuseCard
                  flush
                  title={
                    <CardTitle
                      icon={<FileText size={16} />}
                      title='Materi Terbaru'
                      description='Materi yang baru diunggah guru di kelas anak.'
                    />
                  }
                  extra={
                    materials.length > MATERIAL_PREVIEW ? (
                      <Button type='link' onClick={() => goToTab("materi")} style={{ paddingInline: 0 }}>
                        Lihat semua
                      </Button>
                    ) : null
                  }
                >
                  {materials.length ? (
                    materials
                      .slice(0, MATERIAL_PREVIEW)
                      .map((item, index, list) => materialRow(item, index === list.length - 1))
                  ) : (
                    <Text type='secondary' style={{ display: "block", padding: "8px 24px 24px" }}>
                      Belum ada materi baru.
                    </Text>
                  )}
                </MuseCard>
              </Flex>
            </Col>
            <Col xs={24} lg={9}>
              <Flex vertical gap={gutter}>
                <QuickLinksCard links={quickLinks} />
                <TelegramBindCard
                  telegram={telegramRes?.data}
                  boundText='Notifikasi datang/pulang anak dikirim ke chat bot sekolah setiap kali anak tap kartu.'
                  unboundText='Hubungkan Telegram agar menerima kabar saat anak tap kartu datang dan pulang di mesin absensi.'
                />
              </Flex>
            </Col>
          </Row>
        </Flex>
      ),
    },
    {
      key: "anak",
      label: "Anak",
      icon: <UsersRound />,
      render: () =>
        visible.length ? (
          <Row gutter={[gutter, gutter]}>
            {visible.map((student) => (
              <Col key={student.student_id} xs={24} xl={visible.length > 1 ? 12 : 24}>
                <ChildCard student={student} onNavigate={navigate} />
              </Col>
            ))}
          </Row>
        ) : (
          <MuseCard>
            <Empty description='Belum ada anak yang terhubung. Hubungi admin sekolah untuk menautkan akun.' />
          </MuseCard>
        ),
    },
    {
      key: "materi",
      label: "Materi",
      icon: <FileText />,
      render: () => (
        <MuseCard
          flush
          title={
            <CardTitle
              icon={<FileText size={16} />}
              title='Materi Terbaru'
              description={`${materials.length} materi terakhir di kelas anak`}
            />
          }
        >
          {materials.length ? (
            materials.map((item, index) => materialRow(item, index === materials.length - 1))
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='Belum ada materi baru.'
              style={{ padding: "16px 24px 24px" }}
            />
          )}
        </MuseCard>
      ),
    },
  ];

  const studentOptions = [
    { value: "all", label: "Semua anak" },
    ...students.map((s) => ({
      value: String(s.student_id),
      label: `${s.student_name}${s.class_name ? ` · ${s.class_name}` : ""}`,
    })),
  ];

  return (
    <PageTabs
      title={`${getGreeting(now)}, ${payload?.parent?.full_name || "Orang Tua"}`}
      description='Pantau kehadiran, belajar, dan tabungan anak Anda.'
      extra={
        <Flex gap={8} wrap align='center' style={{ width: screens.md ? "auto" : "100%" }}>
          <Tag color={payload?.active_periode ? "green" : "volcano"} style={{ margin: 0 }}>
            {payload?.active_periode?.name ? `Periode: ${payload.active_periode.name}` : "Periode belum aktif"}
          </Tag>
          {students.length > 1 ? (
            <Select
              aria-label='Pilih anak'
              value={effectiveId}
              onChange={setSelectedId}
              options={studentOptions}
              prefix={<UsersRound size={16} color={museColors.muted} />}
              style={{ width: screens.md ? 260 : "100%" }}
            />
          ) : null}
        </Flex>
      }
      items={items}
    />
  );
};

export default ParentDash;
