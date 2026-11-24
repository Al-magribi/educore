import React from "react";
import { Alert, Flex, Grid, Skeleton, Tag } from "antd";
import { Scale, UserRound } from "lucide-react";
import PointCatalogPanel from "../components/PointCatalogPanel";
import PointRecordPanel from "../components/PointRecordPanel";
import { useGetStudentPointOverviewQuery } from "../../../../service/lms/ApiPoint";
import PageHeader from "../../../../components/ui/PageHeader";
import { MuseCard, PageTabs } from "../../../../components/ui/muse";

const { useBreakpoint } = Grid;

const PAGE_TITLE = "Poin Siswa";
const PAGE_DESCRIPTION =
  "Lihat akumulasi poin Anda beserta bobot penghargaan dan pelanggaran.";

const StudentPointView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data, isLoading, isError, error } = useGetStudentPointOverviewQuery();

  const payload = data?.data;
  const student = payload?.student || null;
  const entries = payload?.entries || [];
  const catalog = payload?.catalog || { reward: [], punishment: [] };
  const showBalance = Boolean(payload?.point_config?.show_balance);

  if (isLoading || isError) {
    return (
      <Flex vertical gap={24}>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <MuseCard>
          {isError ? (
            <Alert
              type='error'
              showIcon
              title='Poin siswa gagal dimuat'
              description={error?.data?.message || "Coba muat ulang halaman."}
            />
          ) : (
            <Skeleton active paragraph={{ rows: 6 }} />
          )}
        </MuseCard>
      </Flex>
    );
  }

  return (
    <PageTabs
      title={PAGE_TITLE}
      description={PAGE_DESCRIPTION}
      extra={<Tag>{payload?.active_periode?.name || "Periode aktif"}</Tag>}
      items={[
        {
          key: "record",
          label: "Poin Saya",
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

export default StudentPointView;
