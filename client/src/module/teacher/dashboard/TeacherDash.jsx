import { useState } from "react";
import { Alert, Col, Empty, Flex, Grid, Pagination, Row, Tag } from "antd";
import { motion } from "framer-motion";
import { BookOpen, CalendarCheck, ClipboardList, Layers } from "lucide-react";

import { useGetTeacherDashQuery } from "../../../service/main/ApiDash";
import PageHeader from "../../../components/ui/PageHeader";
import { CardTitle, MuseCard, StatCard } from "../../../components/ui/muse";
import { DataRow } from "../../../components/ui/muse/DataSection";
import { DashboardSkeleton } from "../../student/dashboard/components/StudentOverview";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const PAGE_SIZE = 5;

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

const classNames = (classes = []) =>
  classes.length ? classes.map((item) => item.name).join(", ") : "Belum ada kelas";

/** Card daftar dengan paginasi lokal, berisi DataRow. */
const ListCard = ({ icon, title, description, items, emptyText, renderRow }) => {
  const [page, setPage] = useState(1);
  const lastPage = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, lastPage);
  const visible = items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const paged = items.length > PAGE_SIZE;

  return (
    <MuseCard
      flush
      style={{ height: "100%" }}
      title={
        <CardTitle
          icon={icon}
          title={title}
          description={`${items.length.toLocaleString("id-ID")} data · ${description}`}
        />
      }
    >
      {items.length ? (
        <>
          {visible.map((item, index) => renderRow(item, !paged && index === visible.length - 1))}
          {paged ? (
            <Flex justify='center' style={{ padding: "12px 16px" }}>
              <Pagination
                size='small'
                current={current}
                pageSize={PAGE_SIZE}
                total={items.length}
                onChange={setPage}
                showSizeChanger={false}
              />
            </Flex>
          ) : null}
        </>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} description={emptyText} />
      )}
    </MuseCard>
  );
};

const TeacherDash = () => {
  const { data, isLoading, isError, error } = useGetTeacherDashQuery();
  const [now] = useState(() => Date.now());
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const gutter = isMobile ? 16 : 24;

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        title='Gagal memuat dashboard guru'
        description={error?.data?.message || "Periksa koneksi lalu muat ulang halaman."}
      />
    );
  }

  const teacherName = data?.teacher?.full_name || "Guru";
  const activePeriode = data?.activePeriode;
  const subjects = data?.subjects || [];
  const tasks = data?.tasks || [];
  const banks = data?.banks || [];
  const exams = data?.exams || [];

  const stats = [
    { key: "subjects", title: "Mata Pelajaran", value: data?.stats?.subjects || 0, icon: <BookOpen size={24} />, tone: "primary" },
    { key: "tasks", title: "Penugasan", value: data?.stats?.tasks || 0, note: "Periode aktif", icon: <ClipboardList size={24} />, tone: "accent" },
    { key: "banks", title: "Bank Soal", value: data?.stats?.banks || 0, icon: <Layers size={24} />, tone: "navy" },
    {
      key: "exams",
      title: "Jadwal Ujian",
      value: data?.stats?.examsTotal || 0,
      note: `${(data?.stats?.examsActive || 0).toLocaleString("id-ID")} sedang aktif`,
      icon: <CalendarCheck size={24} />,
      tone: "warning",
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ display: "grid", gap: gutter, minWidth: 0 }}
    >
      <PageHeader
        title={`Halo, ${teacherName}`}
        description={`Ringkasan mengajar di ${data?.homebase?.name || "satuan"}: mapel, penugasan, bank soal, dan ujian.`}
        meta={
          <Flex gap={8} wrap='wrap'>
            <Tag style={{ margin: 0 }}>NIP {data?.teacher?.nip || "-"}</Tag>
            <Tag style={{ margin: 0 }}>Jenjang: {data?.homebase?.level || "Satuan"}</Tag>
            <Tag color={activePeriode ? "green" : "volcano"} style={{ margin: 0 }}>
              {activePeriode ? `Periode aktif: ${activePeriode.name}` : "Belum ada periode aktif"}
            </Tag>
          </Flex>
        }
      />

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
        <Col xs={24} xl={12}>
          <ListCard
            icon={<ClipboardList size={16} />}
            title='Penugasan'
            description='urut tenggat terdekat'
            items={tasks}
            emptyText='Belum ada penugasan di periode aktif.'
            renderRow={(task, last) => {
              const deadline = task.deadline_at ? new Date(task.deadline_at).getTime() : null;
              const overdue = deadline !== null && deadline < now;
              return (
                <DataRow
                  key={task.id}
                  icon={<ClipboardList size={18} />}
                  tone='accentSoft'
                  title={task.title}
                  subtitle={`${task.subject_name || "Tanpa mapel"} · ${classNames(task.classes)}`}
                  tags={
                    <>
                      <Tag color={overdue ? "red" : "gold"} style={{ margin: 0 }}>
                        {overdue ? "Lewat" : "Tenggat"} {formatDate(task.deadline_at, true)}
                      </Tag>
                      <Tag color='green' style={{ margin: 0 }}>
                        {Number(task.submission_count || 0)} terkumpul
                      </Tag>
                    </>
                  }
                  last={last}
                />
              );
            }}
          />
        </Col>

        <Col xs={24} xl={12}>
          <ListCard
            icon={<CalendarCheck size={16} />}
            title='Jadwal Ujian'
            description='terbaru lebih dulu'
            items={exams}
            emptyText='Belum ada jadwal ujian.'
            renderRow={(exam, last) => (
              <DataRow
                key={exam.id}
                icon={<CalendarCheck size={18} />}
                title={exam.name}
                subtitle={`${exam.subject_name || "Tanpa mapel"} · ${classNames(exam.classes)}`}
                tags={
                  <>
                    <Tag color={exam.is_active ? "green" : "default"} style={{ margin: 0 }}>
                      {exam.is_active ? "Aktif" : "Nonaktif"}
                    </Tag>
                    <Tag style={{ margin: 0 }}>{exam.duration_minutes || 0} menit</Tag>
                  </>
                }
                last={last}
              />
            )}
          />
        </Col>

        <Col xs={24} xl={12}>
          <ListCard
            icon={<BookOpen size={16} />}
            title='Mata Pelajaran'
            description='mapel dan kelas yang diampu'
            items={subjects}
            emptyText='Belum ada mapel. Admin satuan perlu menugaskan mapel ke akun ini.'
            renderRow={(subject, last) => (
              <DataRow
                key={subject.id}
                icon={<BookOpen size={18} />}
                title={subject.name}
                subtitle={`${subject.code || "Tanpa kode"} · ${classNames(subject.classes)}`}
                tags={
                  <Tag color='blue' style={{ margin: 0 }}>
                    {Number(subject.class_count || 0)} kelas
                  </Tag>
                }
                last={last}
              />
            )}
          />
        </Col>

        <Col xs={24} xl={12}>
          <ListCard
            icon={<Layers size={16} />}
            title='Bank Soal'
            description='kumpulan soal per mapel'
            items={banks}
            emptyText='Belum ada bank soal.'
            renderRow={(bank, last) => (
              <DataRow
                key={bank.id}
                icon={<Layers size={18} />}
                tone='bgSoft'
                title={bank.title}
                subtitle={`${bank.subject_name || "Tanpa mapel"} · dibuat ${formatDate(bank.created_at)}`}
                tags={
                  <>
                    {bank.type ? (
                      <Tag color='geekblue' style={{ margin: 0 }}>
                        {bank.type}
                      </Tag>
                    ) : null}
                    <Tag color='cyan' style={{ margin: 0 }}>
                      {Number(bank.question_count || 0)} soal
                    </Tag>
                  </>
                }
                last={last}
              />
            )}
          />
        </Col>
      </Row>

    </MotionDiv>
  );
};

export default TeacherDash;
