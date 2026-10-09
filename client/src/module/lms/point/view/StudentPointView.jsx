import React, { useState } from "react";
import { Card, Empty, Flex, Grid, Space, Tabs, Typography } from "antd";
import { motion } from "framer-motion";
import { Scale, UserRound } from "lucide-react";
import LoadApp from "../../../../components/loader/LoadApp";
import PointCatalogPanel from "../components/PointCatalogPanel";
import PointRecordPanel from "../components/PointRecordPanel";
import { useGetStudentPointOverviewQuery } from "../../../../service/lms/ApiPoint";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const StudentPointView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [activeTab, setActiveTab] = useState("record");
  const { data, isLoading, isError, error } = useGetStudentPointOverviewQuery();

  const payload = data?.data;
  const student = payload?.student || null;
  const entries = payload?.entries || [];
  const catalog = payload?.catalog || { reward: [], punishment: [] };
  const showBalance = Boolean(payload?.point_config?.show_balance);

  if (isLoading) return <LoadApp />;

  if (isError) {
    return (
      <Card styles={{ body: { padding: 28 } }}>
        <Empty
          description={
            error?.data?.message || "Gagal memuat poin siswa."
          }
        />
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <Card
        styles={{ body: { padding: isMobile ? 18 : 24 } }}
        style={{
          borderRadius: 24,
          border: "1px solid #e5edf6",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #0ea5e9 100%)",
        }}
      >
        <Flex vertical gap={8}>
          <Text style={{ color: "rgba(255,255,255,0.75)" }}>
            {payload?.active_periode?.name || "Periode aktif"}
          </Text>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: "#fff" }}>
            Poin Siswa
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.82)" }}>
            Lihat akumulasi poin Anda beserta bobot penghargaan dan pelanggaran.
          </Text>
        </Flex>
      </Card>

      <Card
        style={{
          borderRadius: 24,
          border: "1px solid #e5edf6",
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "record",
              label: (
                <Space>
                  <UserRound size={15} />
                  Poin Siswa
                </Space>
              ),
              children: (
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
              label: (
                <Space>
                  <Scale size={15} />
                  Bobot Poin
                </Space>
              ),
              children: (
                <PointCatalogPanel catalog={catalog} isMobile={isMobile} />
              ),
            },
          ]}
        />
      </Card>
    </motion.div>
  );
};

export default StudentPointView;
