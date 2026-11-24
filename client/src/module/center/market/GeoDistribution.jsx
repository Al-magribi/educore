import React from "react";
import { Alert, Col, Empty, Grid, Row, Skeleton } from "antd";
import { Calculator, MapPin, MapPinned, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useGetGeoDistributionQuery } from "../../../service/center/ApiAnalysis";
import { CardTitle, MuseCard, StatCard } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";
import RankingList from "./RankingList";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const GeoDistribution = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data: apiData, isLoading } = useGetGeoDistributionQuery();
  const distributionData = apiData?.data || [];
  const totalStudents = distributionData.reduce(
    (sum, item) => sum + (Number(item.student_count) || 0),
    0,
  );
  const topCity = distributionData[0];
  const averagePerCity = distributionData.length
    ? Math.round(totalStudents / distributionData.length)
    : 0;

  if (isLoading) {
    return (
      <MuseCard>
        <Skeleton active paragraph={{ rows: 8 }} />
      </MuseCard>
    );
  }

  if (distributionData.length === 0) {
    return (
      <MuseCard>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Belum ada data geografis. Lengkapi alamat siswa untuk melihat sebarannya."
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
            title="Total Wilayah"
            value={distributionData.length}
            note="Kota/kabupaten asal siswa aktif"
            icon={<MapPinned size={24} />}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard
            title="Kota Dominan"
            value={topCity?.city_name || "-"}
            note={`${topCity?.student_count || 0} siswa`}
            icon={<Trophy size={24} />}
            tone="success"
          />
        </Col>
        <Col xs={24} lg={8}>
          <StatCard
            title="Rata-rata"
            value={averagePerCity}
            suffix="siswa"
            note="Per wilayah"
            icon={<Calculator size={24} />}
            tone="warning"
          />
        </Col>
      </Row>

      <MuseCard
        title={
          <CardTitle
            title="Sebaran Wilayah Asal Siswa"
            description={`${totalStudents.toLocaleString("id-ID")} siswa terpetakan, diurutkan dari kontribusi terbesar.`}
          />
        }
      >
        <RankingList
          items={distributionData.map((item, index) => ({
            key: `${item.city_name}-${index}`,
            label: item.city_name || "Wilayah tidak diketahui",
            value: Number(item.student_count) || 0,
          }))}
          total={totalStudents}
          unit="siswa"
          icon={<MapPin size={14} color={museColors.muted} style={{ flexShrink: 0 }} />}
        />
      </MuseCard>

      <Alert
        type="info"
        showIcon
        title="Fokus akuisisi wilayah"
        description="Prioritaskan wilayah dengan kontribusi tertinggi untuk strategi promosi yang lebih presisi."
      />
    </MotionDiv>
  );
};

export default GeoDistribution;
