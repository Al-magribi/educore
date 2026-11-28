import { useCallback, useMemo } from "react";
import {
  Alert,
  Button,
  Col,
  Flex,
  Grid,
  Row,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutGrid,
  Layers,
  UserRound,
} from "lucide-react";

import { useGetTeacherDashQuery } from "../../../service/main/ApiDash";
import { useGetTeacherTelegramQuery } from "../../../service/lms/ApiAttendance";
import { useGetScheduleBootstrapQuery } from "../../../service/lms/ApiSchedule";
import {
  CardTitle,
  MuseCard,
  PageTabs,
  StatCard,
} from "../../../components/ui/muse";
import { DataRow } from "../../../components/ui/muse/DataSection";
import { FEATURES, hasFeature } from "../../../config/productFeatures";
import QuickLinksCard from "../../lms/dashboard/QuickLinksCard";
import SearchableListCard from "../../lms/dashboard/SearchableListCard";
import TelegramBindCard from "../../lms/dashboard/TelegramBindCard";
import TodayScheduleCard from "../../lms/dashboard/TodayScheduleCard";
import useNow, { getGreeting } from "../../lms/dashboard/useNow";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const isLmsEnabled = hasFeature(FEATURES.LMS);
const isCbtEnabled = hasFeature(FEATURES.CBT);
const PREVIEW_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : null),
  });
};

const joinNames = (items = [], emptyText = "Belum ada kelas") =>
  items.length ? items.map((item) => item.name).join(", ") : emptyText;

const deadlineTag = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  if (Number.isNaN(time)) return <Tag style={{ margin: 0 }}>Tanpa tenggat</Tag>;
  const diff = time - Date.now();
  if (diff < 0)
    return <Tag style={{ margin: 0 }}>Ditutup {formatDate(value)}</Tag>;
  return (
    <Tag
      color={diff < DAY_MS ? "red" : diff < 3 * DAY_MS ? "orange" : "blue"}
      style={{ margin: 0 }}
    >
      Tenggat {formatDate(value, true)}
    </Tag>
  );
};

const subjectRow = (subject, last) => (
  <DataRow
    key={subject.id}
    last={last}
    icon={<BookOpen size={18} />}
    title={subject.name}
    subtitle={`${subject.code || "Tanpa kode"} · ${joinNames(subject.classes)}`}
    tags={<Tag style={{ margin: 0 }}>{subject.class_count || 0} kelas</Tag>}
  />
);

const taskRow = (task, last) => (
  <DataRow
    key={task.id}
    last={last}
    icon={<FileText size={18} />}
    tone="accentSoft"
    title={task.title}
    subtitle={[
      task.subject_name || "Tanpa mapel",
      task.chapter_title,
      joinNames(task.classes),
    ]
      .filter(Boolean)
      .join(" · ")}
    tags={
      <>
        {deadlineTag(task.deadline_at)}
        <Tag color="green" style={{ margin: 0 }}>
          {task.submission_count || 0} terkumpul
        </Tag>
      </>
    }
  />
);

const bankRow = (bank, last) => (
  <DataRow
    key={bank.id}
    last={last}
    icon={<Layers size={18} />}
    tone="bgSoft"
    title={bank.title}
    subtitle={`${bank.subject_name || "Tanpa mapel"} · Dibuat ${formatDate(bank.created_at)}`}
    tags={
      <>
        {bank.type ? <Tag style={{ margin: 0 }}>{bank.type}</Tag> : null}
        <Tag color="geekblue" style={{ margin: 0 }}>
          {bank.question_count || 0} soal
        </Tag>
      </>
    }
  />
);

const examRow = (exam, last) => (
  <DataRow
    key={exam.id}
    last={last}
    icon={<CalendarCheck size={18} />}
    tone={exam.is_active ? "primarySoft" : "bgSoft"}
    title={exam.name}
    subtitle={`${exam.subject_name || "Tanpa mapel"} · ${joinNames(exam.classes)}`}
    tags={
      <>
        <Tag color={exam.is_active ? "green" : "default"} style={{ margin: 0 }}>
          {exam.is_active ? "Aktif" : "Nonaktif"}
        </Tag>
        <Tag style={{ margin: 0 }}>{exam.duration_minutes || 0} menit</Tag>
      </>
    }
  />
);

/** Card ringkas berisi beberapa baris pertama + tautan ke tab lengkapnya. */
const PreviewCard = ({
  icon,
  title,
  description,
  items,
  renderRow,
  emptyText,
  onSeeAll,
}) => (
  <MuseCard
    flush
    title={<CardTitle icon={icon} title={title} description={description} />}
    extra={
      onSeeAll ? (
        <Button type="link" onClick={onSeeAll} style={{ paddingInline: 0 }}>
          Lihat semua
        </Button>
      ) : null
    }
  >
    {items.length ? (
      items.map((item, index) => renderRow(item, index === items.length - 1))
    ) : (
      <Text
        type="secondary"
        style={{ display: "block", padding: "8px 24px 24px" }}
      >
        {emptyText}
      </Text>
    )}
  </MuseCard>
);

const DashSkeleton = () => (
  <Flex vertical gap={24}>
    <Skeleton active title paragraph={{ rows: 1 }} />
    <div
      style={{
        display: "grid",
        gap: 24,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      }}
    >
      {[0, 1, 2, 3].map((key) => (
        <MuseCard key={key}>
          <Skeleton active paragraph={{ rows: 1 }} />
        </MuseCard>
      ))}
    </div>
    <MuseCard>
      <Skeleton active paragraph={{ rows: 5 }} />
    </MuseCard>
  </Flex>
);

const subjectSearch = (item) =>
  `${item.name} ${item.code || ""} ${joinNames(item.classes, "")}`;
const taskSearch = (item) =>
  `${item.title} ${item.subject_name || ""} ${item.chapter_title || ""}`;
const bankSearch = (item) =>
  `${item.title} ${item.subject_name || ""} ${item.type || ""}`;
const examSearch = (item) =>
  `${item.name} ${item.subject_name || ""} ${joinNames(item.classes, "")}`;

const TeacherDash = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const screens = useBreakpoint();
  const gutter = screens.md ? 24 : 16;
  const { data, isLoading, isError, error, fulfilledTimeStamp } =
    useGetTeacherDashQuery();
  const { data: telegramRes } = useGetTeacherTelegramQuery();
  // Server sudah memfilter entri jadwal milik guru yang login (semua grup jadwal).
  const { data: scheduleRes, isLoading: scheduleLoading } =
    useGetScheduleBootstrapQuery(undefined, {
      skip: !isLmsEnabled,
    });
  const now = useNow();
  const scheduleEntries = useMemo(
    () => scheduleRes?.data?.entries || [],
    [scheduleRes],
  );

  const subjects = useMemo(() => data?.subjects || [], [data?.subjects]);
  const tasks = useMemo(() => data?.tasks || [], [data?.tasks]);
  const banks = useMemo(() => data?.banks || [], [data?.banks]);
  const exams = useMemo(() => data?.exams || [], [data?.exams]);

  // Acuan "sekarang" = waktu data terakhir diambil, agar render tetap murni.
  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.deadline_at &&
            new Date(task.deadline_at).getTime() >= (fulfilledTimeStamp || 0),
        )
        .sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at))
        .slice(0, PREVIEW_LIMIT),
    [tasks, fulfilledTimeStamp],
  );
  const activeExams = useMemo(
    () => exams.filter((exam) => exam.is_active).slice(0, PREVIEW_LIMIT),
    [exams],
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
        type="error"
        showIcon
        title="Gagal memuat dashboard guru"
        description={
          error?.data?.message || "Periksa koneksi lalu muat ulang halaman."
        }
      />
    );
  }

  const homebaseSummary = [data?.homebase?.name, data?.homebase?.level]
    .filter(Boolean)
    .join(" · ");
  const manageButton = (label, to) => (
    <Button onClick={() => navigate(to)}>{label}</Button>
  );

  const stats = [
    {
      key: "subjects",
      title: "Mata Pelajaran",
      value: data?.stats?.subjects || 0,
      icon: <BookOpen size={24} />,
      tone: "primary",
    },
    {
      key: "tasks",
      title: "Penugasan",
      value: data?.stats?.tasks || 0,
      icon: <ClipboardList size={24} />,
      tone: "accent",
    },
    {
      key: "banks",
      title: "Bank Soal",
      value: data?.stats?.banks || 0,
      icon: <Layers size={24} />,
      tone: "navy",
    },
    {
      key: "exams",
      title: "Jadwal Ujian",
      value: data?.stats?.examsTotal || 0,
      icon: <CalendarCheck size={24} />,
      tone: "warning",
    },
  ];

  const quickLinks = [
    isLmsEnabled && {
      key: "subjects",
      label: "Mata pelajaran & tugas",
      description: "Materi, bab, dan penugasan",
      to: "/manajemen-mata-pelajaran",
      icon: <BookOpen size={16} />,
    },
    isLmsEnabled && {
      key: "attendance",
      label: "Presensi kelas",
      description: "Catat kehadiran per pertemuan",
      to: "/presensi-kelas",
      icon: <ClipboardCheck size={16} />,
    },
    isLmsEnabled && {
      key: "schedule",
      label: "Jadwal mengajar",
      description: "Jadwal sepekan",
      to: "/jadwal-guru",
      icon: <CalendarRange size={16} />,
    },
    isCbtEnabled && {
      key: "exams",
      label: "Jadwal ujian",
      description: "Kelola ujian CBT",
      to: "/computer-based-test/jadwal-ujian",
      icon: <CalendarCheck size={16} />,
    },
    {
      key: "profile",
      label: "Profil saya",
      description: "Data diri dan password",
      to: "/profile",
      icon: <UserRound size={16} />,
    },
  ];

  const items = [
    {
      key: "ringkasan",
      label: "Ringkasan",
      icon: <LayoutGrid />,
      render: () => (
        <Flex vertical gap={gutter}>
          <div
            style={{
              display: "grid",
              gap: gutter,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            {stats.map(({ key, ...item }) => (
              <StatCard key={key} {...item} />
            ))}
          </div>
          <Row gutter={[gutter, gutter]}>
            <Col xs={24} lg={15}>
              <Flex vertical gap={gutter}>
                {isLmsEnabled ? (
                  <TodayScheduleCard
                    title="Jadwal Mengajar Hari Ini"
                    entries={scheduleEntries}
                    now={now}
                    loading={scheduleLoading}
                    getTitle={(entry) => entry.subject_name}
                    getSubtitle={(entry) =>
                      [
                        entry.class_name,
                        entry.slot_nos?.length
                          ? `Jam ke-${entry.slot_nos.join(", ")}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    }
                    emptyText="Tidak ada jadwal mengajar hari ini."
                    onSeeAll={() => navigate("/jadwal-guru")}
                  />
                ) : null}
                <PreviewCard
                  icon={<ClipboardList size={16} />}
                  title="Tenggat Terdekat"
                  description="Penugasan yang tenggatnya belum lewat."
                  items={upcomingTasks}
                  renderRow={taskRow}
                  emptyText="Tidak ada penugasan dengan tenggat mendatang."
                  onSeeAll={
                    tasks.length ? () => goToTab("penugasan") : undefined
                  }
                />
                <PreviewCard
                  icon={<CalendarCheck size={16} />}
                  title="Ujian Aktif"
                  description="Ujian yang sedang bisa dikerjakan siswa."
                  items={activeExams}
                  renderRow={examRow}
                  emptyText="Tidak ada ujian yang sedang aktif."
                  onSeeAll={exams.length ? () => goToTab("ujian") : undefined}
                />
              </Flex>
            </Col>
            <Col xs={24} lg={9}>
              <Flex vertical gap={gutter}>
                <QuickLinksCard links={quickLinks} />
                <TelegramBindCard
                  telegram={telegramRes?.data}
                  boundText="Tap datang/pulang Anda dikirim ke chat bot. Jika chat ini sama dengan akun orang tua, notifikasi anak juga masuk ke sini."
                  unboundText="Hubungkan Telegram untuk menerima jam datang dan pulang saat tap di mesin absensi. Pakai Telegram yang sama dengan akun orang tua jika Anda juga orang tua siswa."
                />
              </Flex>
            </Col>
          </Row>
        </Flex>
      ),
    },
    {
      key: "mapel",
      label: "Mapel",
      icon: <BookOpen />,
      render: () => (
        <SearchableListCard
          title="Mata Pelajaran"
          icon={<BookOpen size={16} />}
          unit="mapel"
          items={subjects}
          getSearchText={subjectSearch}
          searchPlaceholder="Cari mapel atau kelas"
          renderRow={subjectRow}
          emptyText="Belum ada mapel yang Anda ampu. Hubungi admin satuan untuk pembagian mengajar."
          extra={
            isLmsEnabled
              ? manageButton("Kelola Mapel", "/manajemen-mata-pelajaran")
              : null
          }
        />
      ),
    },
    {
      key: "penugasan",
      label: "Penugasan",
      icon: <ClipboardList />,
      render: () => (
        <SearchableListCard
          title="Penugasan"
          icon={<FileText size={16} />}
          unit="tugas"
          items={tasks}
          getSearchText={taskSearch}
          searchPlaceholder="Cari judul tugas atau mapel"
          renderRow={taskRow}
          emptyText="Belum ada penugasan. Buat tugas dari halaman mata pelajaran."
          extra={
            isLmsEnabled
              ? manageButton("Buat Tugas", "/manajemen-mata-pelajaran")
              : null
          }
        />
      ),
    },
    {
      key: "bank-soal",
      label: "Bank Soal",
      icon: <Layers />,
      render: () => (
        <SearchableListCard
          title="Bank Soal"
          icon={<Layers size={16} />}
          unit="bank soal"
          items={banks}
          getSearchText={bankSearch}
          searchPlaceholder="Cari bank soal"
          renderRow={bankRow}
          emptyText="Belum ada bank soal."
          extra={
            isCbtEnabled
              ? manageButton("Kelola Bank Soal", "/computer-based-test/bank")
              : null
          }
        />
      ),
    },
    {
      key: "ujian",
      label: "Ujian",
      icon: <CalendarCheck />,
      render: () => (
        <SearchableListCard
          title="Jadwal Ujian"
          icon={<CalendarCheck size={16} />}
          unit="ujian"
          items={exams}
          getSearchText={examSearch}
          searchPlaceholder="Cari ujian, mapel, atau kelas"
          renderRow={examRow}
          emptyText="Belum ada jadwal ujian."
          extra={
            isCbtEnabled
              ? manageButton(
                  "Kelola Jadwal",
                  "/computer-based-test/jadwal-ujian",
                )
              : null
          }
        />
      ),
    },
  ];

  return (
    <PageTabs
      title={`${getGreeting(now)}, ${data?.teacher?.full_name || "Guru"}`}
      description={
        homebaseSummary || "Ringkasan mengajar, penugasan, dan ujian Anda."
      }
      extra={
        <Flex gap={8} wrap>
          <Tag style={{ margin: 0 }}>NIP: {data?.teacher?.nip || "-"}</Tag>
          <Tag
            color={data?.activePeriode ? "green" : "volcano"}
            style={{ margin: 0 }}
          >
            {data?.activePeriode
              ? `Periode aktif: ${data.activePeriode.name}`
              : "Belum ada periode aktif"}
          </Tag>
        </Flex>
      }
      items={items}
    />
  );
};

export default TeacherDash;
