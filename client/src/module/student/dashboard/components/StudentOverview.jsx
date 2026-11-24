import { useState } from "react";
import { Col, Empty, Flex, Grid, Pagination, Progress, Row, Skeleton, Tag, Typography } from "antd";
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Timer,
} from "lucide-react";

import { CardTitle, MuseCard, StatCard } from "../../../../components/ui/muse";
import { DataRow } from "../../../../components/ui/muse/DataSection";
import { museColors } from "../../../../config/theme";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const SUBJECT_PAGE_SIZE = 6;

const ATTENDANCE_STATUS = [
  { key: "Hadir", label: "Hadir", color: museColors.success },
  { key: "Izin", label: "Izin", color: museColors.primary },
  { key: "Sakit", label: "Sakit", color: museColors.warning },
  { key: "Alpa", label: "Alpa", color: museColors.danger, aliases: ["Alpha"] },
];

const statGridStyle = (isMobile) => ({
  display: "grid",
  gap: isMobile ? 16 : 24,
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
});

const summarizeAttendance = (rows) => {
  if (!rows) return null;
  const counts = ATTENDANCE_STATUS.map((status) => ({
    ...status,
    count: rows
      .filter((row) => row.status === status.key || status.aliases?.includes(row.status))
      .reduce((total, row) => total + (row.count || 0), 0),
  }));
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const present = counts.find((item) => item.key === "Hadir")?.count || 0;
  return { counts, total, present, rate: total ? Math.round((present / total) * 100) : null };
};

const AttendanceCard = ({ attendance }) => (
  <MuseCard
    title={
      <CardTitle
        icon={<CalendarCheck size={16} />}
        title='Kehadiran Bulan Ini'
        description='Rekap harian dari presensi guru.'
      />
    }
  >
    {attendance.total ? (
      <Flex vertical gap={14}>
        {attendance.counts.map((item) => (
          <div key={item.key}>
            <Flex justify='space-between' style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: 600 }}>{item.label}</Text>
              <Text strong>{item.count} hari</Text>
            </Flex>
            <Progress
              percent={Math.round((item.count / attendance.total) * 100)}
              showInfo={false}
              size={{ height: 3 }}
              strokeColor={item.color}
            />
          </div>
        ))}
      </Flex>
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Belum ada catatan presensi bulan ini.' />
    )}
  </MuseCard>
);

const SubjectsCard = ({ subjects }) => {
  const [page, setPage] = useState(1);
  const lastPage = Math.max(1, Math.ceil(subjects.length / SUBJECT_PAGE_SIZE));
  const current = Math.min(page, lastPage);
  const items = subjects.slice((current - 1) * SUBJECT_PAGE_SIZE, current * SUBJECT_PAGE_SIZE);

  return (
    <MuseCard
      flush
      style={{ height: "100%" }}
      title={
        <CardTitle
          icon={<BookOpen size={16} />}
          title='Mata Pelajaran'
          description={`${subjects.length.toLocaleString("id-ID")} mapel di kelas ini`}
        />
      }
    >
      {subjects.length ? (
        <>
          {items.map((subject, index) => (
            <DataRow
              key={subject.id}
              icon={<BookOpen size={18} />}
              title={subject.name}
              subtitle={subject.code || "Tanpa kode"}
              last={index === items.length - 1 && subjects.length <= SUBJECT_PAGE_SIZE}
            />
          ))}
          {subjects.length > SUBJECT_PAGE_SIZE ? (
            <Flex justify='center' style={{ padding: "12px 16px" }}>
              <Pagination
                size='small'
                current={current}
                pageSize={SUBJECT_PAGE_SIZE}
                total={subjects.length}
                onChange={setPage}
                showSizeChanger={false}
              />
            </Flex>
          ) : null}
        </>
      ) : (
        <Empty
          style={{ padding: 24 }}
          description='Belum ada mata pelajaran. Mapel muncul setelah admin memasang jadwal kelas.'
        />
      )}
    </MuseCard>
  );
};

const ExamsCard = ({ exams, emptyText }) => (
  <MuseCard
    flush
    title={
      <CardTitle
        icon={<ClipboardList size={16} />}
        title='Ujian Aktif'
        description='Ujian yang sedang dibuka untuk kelas ini.'
      />
    }
  >
    {exams.length ? (
      exams.map((exam, index) => (
        <DataRow
          key={exam.id}
          icon={<ClipboardList size={18} />}
          tone='accentSoft'
          title={exam.name}
          subtitle={exam.subject_name || "Mata pelajaran belum tersedia"}
          tags={
            <Tag icon={<Timer size={12} />} style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
              {exam.duration_minutes || 0} menit
            </Tag>
          }
          last={index === exams.length - 1}
        />
      ))
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} description={emptyText} />
    )}
  </MuseCard>
);

/**
 * Isi dashboard satu siswa (stat + mapel + ujian + kehadiran).
 * Dipakai dashboard siswa dan dashboard orang tua.
 */
const StudentOverview = ({ data, examsEmptyText = "Belum ada ujian aktif." }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const gutter = isMobile ? 16 : 24;
  const subjects = data?.subjects || [];
  const exams = data?.exams || [];
  const attendance = summarizeAttendance(data?.attendance);

  const stats = [
    {
      key: "class",
      title: "Kelas",
      value: data?.classInfo?.name && data.classInfo.name !== "-" ? data.classInfo.name : "-",
      note: data?.homebase?.name,
      icon: <GraduationCap size={24} />,
      tone: "navy",
    },
    { key: "subjects", title: "Mata Pelajaran", value: subjects.length, suffix: "mapel", icon: <BookOpen size={24} />, tone: "primary" },
    { key: "exams", title: "Ujian Aktif", value: exams.length, suffix: "ujian", icon: <ClipboardList size={24} />, tone: "accent" },
    attendance
      ? {
          key: "attendance",
          title: "Kehadiran Bulan Ini",
          value: attendance.rate === null ? "-" : `${attendance.rate}%`,
          note: attendance.total ? `${attendance.present} dari ${attendance.total} hari` : "Belum ada presensi",
          icon: <CalendarCheck size={24} />,
          tone: "success",
        }
      : null,
  ].filter(Boolean);

  return (
    <>
      <div style={statGridStyle(isMobile)}>
        {stats.map(({ key, ...item }) => (
          <StatCard key={key} {...item} />
        ))}
      </div>

      <Row gutter={[gutter, gutter]}>
        <Col xs={24} lg={14}>
          <SubjectsCard subjects={subjects} />
        </Col>
        <Col xs={24} lg={10}>
          <Flex vertical gap={gutter}>
            <ExamsCard exams={exams} emptyText={examsEmptyText} />
            {attendance ? <AttendanceCard attendance={attendance} /> : null}
          </Flex>
        </Col>
      </Row>
    </>
  );
};

/** Skeleton dashboard: judul, grid stat, dua kolom card. */
export const DashboardSkeleton = ({ statCount = 4 }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const gutter = isMobile ? 16 : 24;

  return (
    <Flex vertical gap={gutter}>
      <Skeleton active title paragraph={{ rows: 1 }} />
      <div style={statGridStyle(isMobile)}>
        {Array.from({ length: statCount }, (_, index) => (
          <MuseCard key={index}>
            <Skeleton active paragraph={{ rows: 1 }} />
          </MuseCard>
        ))}
      </div>
      <Row gutter={[gutter, gutter]}>
        <Col xs={24} lg={14}>
          <MuseCard>
            <Skeleton active paragraph={{ rows: 6 }} />
          </MuseCard>
        </Col>
        <Col xs={24} lg={10}>
          <MuseCard>
            <Skeleton active paragraph={{ rows: 4 }} />
          </MuseCard>
        </Col>
      </Row>
    </Flex>
  );
};

export default StudentOverview;
