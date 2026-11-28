import React, { useMemo, useState } from "react";
import { Alert, Empty, Flex, Grid, Select, Skeleton, Tag } from "antd";
import { Scale, UserRound } from "lucide-react";
import PointCatalogPanel from "../components/PointCatalogPanel";
import PointRecordPanel from "../components/PointRecordPanel";
import { useGetParentPointOverviewQuery } from "../../../../service/lms/ApiPoint";
import PageHeader from "../../../../components/ui/PageHeader";
import { MuseCard, PageTabs } from "../../../../components/ui/muse";

const { useBreakpoint } = Grid;

const PAGE_TITLE = "Poin Siswa";
const PAGE_DESCRIPTION =
  "Pantau poin anak beserta bobot penghargaan dan pelanggaran sekolah.";

const ParentPointView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [studentId, setStudentId] = useState(null);

  const { data, isLoading, isError, error } = useGetParentPointOverviewQuery({
    studentId,
  });

  const payload = data?.data;
  const students = useMemo(() => payload?.students || [], [payload]);
  const student = payload?.selected_student || null;
  const entries = payload?.entries || [];
  const catalog = payload?.catalog || { reward: [], punishment: [] };
  const showBalance = Boolean(payload?.point_config?.show_balance);

  const studentOptions = useMemo(
    () =>
      students.map((item) => ({
        value: item.student_id,
        label: `${item.student_name}${item.class_name ? ` · ${item.class_name}` : ""}`,
      })),
    [students],
  );

  if (isLoading || isError || !students.length) {
    return (
      <Flex vertical gap={24}>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <MuseCard>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : isError ? (
            <Alert
              type='error'
              showIcon
              title='Poin siswa gagal dimuat'
              description={error?.data?.message || "Coba muat ulang halaman."}
            />
          ) : (
            <Empty description='Belum ada siswa yang terhubung dengan akun ini. Hubungi wali kelas atau admin sekolah untuk menautkan data anak.' />
          )}
        </MuseCard>
      </Flex>
    );
  }

  return (
    <PageTabs
      title={PAGE_TITLE}
      description={PAGE_DESCRIPTION}
      extra={
        <>
          <Tag>{payload?.active_periode?.name || "Periode aktif"}</Tag>
          {studentOptions.length > 1 ? (
            <Select
              aria-label='Pilih anak'
              value={studentId || student?.student_id}
              options={studentOptions}
              onChange={setStudentId}
              style={{ minWidth: isMobile ? "100%" : 280 }}
            />
          ) : null}
        </>
      }
      items={[
        {
          key: "record",
          label: "Poin Anak",
          icon: <UserRound />,
          render: () => (
            <PointRecordPanel
              student={student}
              entries={entries}
              showBalance={showBalance}
              isMobile={isMobile}
            />
          ),
        },
        {
          key: "catalog",
          label: "Bobot Poin",
          icon: <Scale />,
          render: () => <PointCatalogPanel catalog={catalog} isMobile={isMobile} />,
        },
      ]}
    />
  );
};

export default ParentPointView;
