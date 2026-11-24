import { Alert, Flex, Grid, Tag } from "antd";
import { motion } from "framer-motion";

import { useGetStudentDashQuery } from "../../../service/main/ApiDash";
import PageHeader from "../../../components/ui/PageHeader";
import StudentOverview, { DashboardSkeleton } from "./components/StudentOverview";
import { buildClassSummary } from "./components/classSummary";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const StudentDash = () => {
  const { data, isLoading, isError, error } = useGetStudentDashQuery();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        title='Gagal memuat dashboard siswa'
        description={error?.data?.message || "Periksa koneksi lalu muat ulang halaman."}
      />
    );
  }

  const studentName = data?.student?.full_name || "Siswa";
  const activePeriode = data?.activePeriode;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ display: "grid", gap: isMobile ? 16 : 24, minWidth: 0 }}
    >
      <PageHeader
        title={`Halo, ${studentName}`}
        description='Ringkasan kelas, mata pelajaran, dan ujian yang sedang berlangsung.'
        meta={
          <Flex gap={8} wrap='wrap'>
            <Tag style={{ margin: 0 }}>NIS {data?.student?.nis || "-"}</Tag>
            <Tag style={{ margin: 0 }}>{buildClassSummary(data?.classInfo)}</Tag>
            <Tag color={activePeriode ? "green" : "volcano"} style={{ margin: 0 }}>
              {activePeriode ? `Periode aktif: ${activePeriode.name}` : "Belum ada periode aktif"}
            </Tag>
          </Flex>
        }
      />

      <StudentOverview data={data} examsEmptyText='Belum ada ujian aktif. Ujian baru akan muncul di sini.' />
    </MotionDiv>
  );
};

export default StudentDash;
