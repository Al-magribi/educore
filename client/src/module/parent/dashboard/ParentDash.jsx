import { Alert, Empty, Flex, Grid, Tag } from "antd";
import { motion } from "framer-motion";

import { useGetParentDashQuery } from "../../../service/main/ApiDash";
import PageHeader from "../../../components/ui/PageHeader";
import { MuseCard } from "../../../components/ui/muse";
import StudentOverview, { DashboardSkeleton } from "../../student/dashboard/components/StudentOverview";
import { buildClassSummary } from "../../student/dashboard/components/classSummary";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const ParentDash = () => {
  const { data, isLoading, isError, error } = useGetParentDashQuery();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (isLoading) return <DashboardSkeleton />;

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

  const parentName = data?.parent?.full_name || "Orang Tua";
  const child = data?.child;
  const activePeriode = child?.activePeriode;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ display: "grid", gap: isMobile ? 16 : 24, minWidth: 0 }}
    >
      <PageHeader
        title={`Halo, ${parentName}`}
        description={
          child
            ? `Pantau kelas, mata pelajaran, ujian, dan kehadiran ${child.student?.full_name || "anak"}.`
            : "Pantau perkembangan anak di sekolah."
        }
        meta={
          child ? (
            <Flex gap={8} wrap='wrap'>
              <Tag color='blue' style={{ margin: 0 }}>
                Anak: {child.student?.full_name || "-"}
              </Tag>
              <Tag style={{ margin: 0 }}>NIS {child.student?.nis || "-"}</Tag>
              <Tag style={{ margin: 0 }}>{buildClassSummary(child.classInfo)}</Tag>
              <Tag color={activePeriode ? "green" : "volcano"} style={{ margin: 0 }}>
                {activePeriode ? `Periode aktif: ${activePeriode.name}` : "Belum ada periode aktif"}
              </Tag>
            </Flex>
          ) : null
        }
      />

      {child ? (
        <StudentOverview data={child} examsEmptyText='Belum ada ujian aktif untuk kelas anak.' />
      ) : (
        <MuseCard>
          <Empty
            style={{ padding: 24 }}
            description='Akun ini belum terhubung dengan data siswa. Hubungi admin sekolah untuk menautkan akun anak.'
          />
        </MuseCard>
      )}
    </MotionDiv>
  );
};

export default ParentDash;
