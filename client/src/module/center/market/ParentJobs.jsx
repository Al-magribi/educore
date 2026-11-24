import React from "react";
import { Alert, Col, Empty, Grid, Row, Skeleton } from "antd";
import { Briefcase, Layers, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { useGetParentJobsQuery } from "../../../service/center/ApiAnalysis";
import { CardTitle, MuseCard, StatCard } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";
import RankingList from "./RankingList";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const ParentJobs = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data: apiData, isLoading } = useGetParentJobsQuery();
  const jobsData = apiData?.data || [];
  const totalParents = jobsData.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const topJob = jobsData[0];
  const topShare = totalParents
    ? Math.round(((Number(topJob?.total) || 0) / totalParents) * 100)
    : 0;

  if (isLoading) {
    return (
      <MuseCard>
        <Skeleton active paragraph={{ rows: 6 }} />
      </MuseCard>
    );
  }

  if (jobsData.length === 0) {
    return (
      <MuseCard>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Data pekerjaan orang tua belum tersedia."
          style={{ padding: "48px 0" }}
        />
      </MuseCard>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "grid", gap: isMobile ? 16 : 24, minWidth: 0 }}
    >
      <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]}>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Total Profesi"
            value={jobsData.length}
            note="Kategori pekerjaan orang tua"
            icon={<Layers size={24} />}
            tone="warning"
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Profesi Utama"
            value={topJob?.job || "-"}
            note={`${topJob?.total || 0} data orang tua`}
            icon={<Briefcase size={24} />}
          />
        </Col>
        <Col xs={24} lg={8}>
          <StatCard
            title="Pangsa Terbesar"
            value={`${topShare}%`}
            note="Kontribusi profesi dominan"
            icon={<PieChart size={24} />}
            tone="success"
          />
        </Col>
      </Row>

      <MuseCard
        title={
          <CardTitle
            title="Profil Pekerjaan Orang Tua"
            description={`${totalParents.toLocaleString("id-ID")} orang tua sudah masuk pemetaan profesi.`}
          />
        }
      >
        <RankingList
          items={jobsData.map((item, index) => ({
            key: `${item.job}-${index}`,
            label: item.job || "Profesi tidak diketahui",
            value: Number(item.total) || 0,
          }))}
          total={totalParents}
          unit="data"
          tone="warning"
          icon={<Briefcase size={14} color={museColors.muted} style={{ flexShrink: 0 }} />}
        />
      </MuseCard>

      <Alert
        type="info"
        showIcon
        title="Insight distribusi"
        description="Profesi dominan bisa dipakai sebagai dasar persona wali murid serta penyesuaian pesan promosi dan pendekatan komunikasi."
      />
    </MotionDiv>
  );
};

export default ParentJobs;
