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
  Award,
  BookOpen,
  ClipboardList,
  LayoutGrid,
  UserRound,
} from "lucide-react";

import { useGetStudentDashQuery } from "../../../service/main/ApiDash";
import { useGetStudentTelegramQuery } from "../../../service/lms/ApiAttendance";
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

const subjectRow = (subject, last) => (
  <DataRow
    key={subject.id}
    last={last}
    icon={<BookOpen size={18} />}
    title={subject.name}
    subtitle={subject.code || "Kode mapel belum tersedia"}
  />
);

const examRow = (exam, last) => (
  <DataRow
    key={exam.id}
    last={last}
    icon={<ClipboardList size={18} />}
    tone="accentSoft"
    title={exam.name}
    subtitle={exam.subject_name || "Mata pelajaran belum tersedia"}
    tags={
      <>
        <Tag color="green" style={{ margin: 0 }}>
          Aktif
        </Tag>
        <Tag style={{ margin: 0 }}>{exam.duration_minutes || 0} menit</Tag>
      </>
    }
  />
);

const subjectSearch = (item) => `${item.name} ${item.code || ""}`;
const examSearch = (item) => `${item.name} ${item.subject_name || ""}`;

const DashSkeleton = () => (
  <Flex vertical gap={24}>
    <Skeleton active title paragraph={{ rows: 1 }} />
    <Row gutter={[24, 24]}>
      {[0, 1].map((key) => (
        <Col key={key} xs={24} sm={12}>
          <MuseCard>
            <Skeleton active paragraph={{ rows: 1 }} />
          </MuseCard>
        </Col>
      ))}
    </Row>
    <MuseCard>
      <Skeleton active paragraph={{ rows: 4 }} />
    </MuseCard>
  </Flex>
);

const StudentDash = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const screens = useBreakpoint();
  const gutter = screens.md ? 24 : 16;
  const { data, isLoading, isError, error } = useGetStudentDashQuery();
  const { data: telegramRes } = useGetStudentTelegramQuery();
  const { data: scheduleRes, isLoading: scheduleLoading } =
    useGetScheduleBootstrapQuery(undefined, {
      skip: !isLmsEnabled,
    });
  const now = useNow();
  const classId = data?.classInfo?.id;
  const classEntries = useMemo(
    () =>
      classId
        ? (scheduleRes?.data?.entries || []).filter(
            (entry) => Number(entry.class_id) === Number(classId),
          )
        : [],
    [scheduleRes, classId],
  );

  const subjects = useMemo(() => data?.subjects || [], [data?.subjects]);
  const exams = useMemo(() => data?.exams || [], [data?.exams]);

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
        title="Gagal memuat dashboard siswa"
        description={
          error?.data?.message || "Periksa koneksi lalu muat ulang halaman."
        }
      />
    );
  }

  const classInfo = data?.classInfo;
  const classSummary = [
    classInfo?.name,
    classInfo?.grade,
    classInfo?.major && classInfo.major !== "-" ? classInfo.major : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const description = [
    classSummary || "Kelas belum tersedia",
    data?.homebase?.name,
  ]
    .filter(Boolean)
    .join(" · ");
  const examsButton = isCbtEnabled ? (
    <Button type="primary" onClick={() => navigate("/siswa/jadwal-ujian")}>
      Buka Jadwal Ujian
    </Button>
  ) : null;

  const quickLinks = [
    isLmsEnabled && {
      key: "subjects",
      label: "Materi & tugas",
      description: "Buka mata pelajaran",
      to: "/mata-pelajaran",
      icon: <BookOpen size={16} />,
    },
    isCbtEnabled && {
      key: "exams",
      label: "Jadwal ujian",
      description: "Ujian CBT yang tersedia",
      to: "/siswa/jadwal-ujian",
      icon: <ClipboardList size={16} />,
    },
    isLmsEnabled && {
      key: "points",
      label: "Poin saya",
      description: "Prestasi dan pelanggaran",
      to: "/poin-siswa",
      icon: <Award size={16} />,
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
          <Row gutter={[gutter, gutter]}>
            <Col xs={24} sm={12}>
              <StatCard
                title="Mata Pelajaran"
                value={subjects.length}
                suffix="mapel"
                icon={<BookOpen size={24} />}
                tone="primary"
              />
            </Col>
            <Col xs={24} sm={12}>
              <StatCard
                title="Ujian Aktif"
                value={exams.length}
                suffix="ujian"
                note={
                  exams.length ? "Kerjakan sebelum waktunya habis." : undefined
                }
                icon={<ClipboardList size={24} />}
                tone="accent"
              />
            </Col>
          </Row>
          <Row gutter={[gutter, gutter]}>
            <Col xs={24} lg={15}>
              <Flex vertical gap={gutter}>
                {isLmsEnabled ? (
                  <TodayScheduleCard
                    title="Jadwal Pelajaran Hari Ini"
                    entries={classEntries}
                    now={now}
                    loading={scheduleLoading}
                    getTitle={(entry) => entry.subject_name}
                    getSubtitle={(entry) =>
                      [
                        entry.teacher_name,
                        entry.slot_nos?.length
                          ? `Jam ke-${entry.slot_nos.join(", ")}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    }
                    emptyText={
                      classId
                        ? "Tidak ada jadwal pelajaran hari ini."
                        : "Kelasmu belum diatur, jadwal belum bisa ditampilkan."
                    }
                  />
                ) : null}
                <MuseCard
                  flush
                  title={
                    <CardTitle
                      icon={<ClipboardList size={16} />}
                      title="Ujian Aktif"
                      description="Ujian yang bisa kamu kerjakan sekarang."
                    />
                  }
                  extra={
                    exams.length > PREVIEW_LIMIT ? (
                      <Button
                        type="link"
                        onClick={() => goToTab("ujian")}
                        style={{ paddingInline: 0 }}
                      >
                        Lihat semua
                      </Button>
                    ) : exams.length && isCbtEnabled ? (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => navigate("/siswa/jadwal-ujian")}
                      >
                        Kerjakan
                      </Button>
                    ) : null
                  }
                >
                  {exams.length ? (
                    exams
                      .slice(0, PREVIEW_LIMIT)
                      .map((exam, index, list) =>
                        examRow(exam, index === list.length - 1),
                      )
                  ) : (
                    <Text
                      type="secondary"
                      style={{ display: "block", padding: "8px 24px 24px" }}
                    >
                      Belum ada ujian aktif. Ujian baru akan muncul di sini.
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
                  boundText="Telegram kamu sudah terhubung. Setiap tap datang/pulang di mesin RFID dikirim ke chat bot."
                  unboundText="Hubungkan Telegram agar menerima jam datang dan pulang saat tap di mesin absensi."
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
          searchPlaceholder="Cari mapel"
          renderRow={subjectRow}
          emptyText="Daftar mapel belum tersedia. Hubungi wali kelas bila kelasmu belum diatur."
          extra={
            isLmsEnabled ? (
              <Button onClick={() => navigate("/mata-pelajaran")}>
                Buka Materi
              </Button>
            ) : null
          }
        />
      ),
    },
    {
      key: "ujian",
      label: "Ujian",
      icon: <ClipboardList />,
      render: () => (
        <SearchableListCard
          title="Ujian Aktif"
          icon={<ClipboardList size={16} />}
          unit="ujian"
          items={exams}
          getSearchText={examSearch}
          searchPlaceholder="Cari ujian atau mapel"
          renderRow={examRow}
          emptyText="Belum ada ujian aktif."
          extra={examsButton}
        />
      ),
    },
  ];

  return (
    <PageTabs
      title={`${getGreeting(now)}, ${data?.student?.full_name || "Siswa"}`}
      description={description}
      extra={
        <Flex gap={8} wrap>
          <Tag style={{ margin: 0 }}>NIS {data?.student?.nis || "-"}</Tag>
          <Tag
            color={data?.activePeriode ? "green" : "volcano"}
            style={{ margin: 0 }}
          >
            {data?.activePeriode?.name
              ? `Periode aktif: ${data.activePeriode.name}`
              : "Periode belum aktif"}
          </Tag>
        </Flex>
      }
      items={items}
    />
  );
};

export default StudentDash;
