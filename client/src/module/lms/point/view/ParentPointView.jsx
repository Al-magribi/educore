import React, { useMemo, useState } from "react";
import {
  Card,
  Empty,
  Flex,
  Grid,
  Select,
  Space,
  Tabs,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { Scale, UserRound } from "lucide-react";
import LoadApp from "../../../../components/loader/LoadApp";
import PointCatalogPanel from "../components/PointCatalogPanel";
import PointRecordPanel from "../components/PointRecordPanel";
import { useGetParentPointOverviewQuery } from "../../../../service/lms/ApiPoint";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const ParentPointView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [activeTab, setActiveTab] = useState("record");
  const [studentId, setStudentId] = useState(null);

  const { data, isLoading, isError, error } = useGetParentPointOverviewQuery({
    studentId,
  });

  const payload = data?.data;
  const students = payload?.students || [];
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

  if (!students.length) {
    return (
      <Card styles={{ body: { padding: 28 } }}>
        <Empty description='Belum ada siswa yang terhubung dengan akun orang tua ini.' />
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
            "linear-gradient(135deg, #0f172a 0%, #0f766e 55%, #14b8a6 100%)",
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
            Pantau poin anak beserta bobot penghargaan dan pelanggaran sekolah.
          </Text>
        </Flex>
      </Card>

      {studentOptions.length > 1 ? (
        <Card styles={{ body: { padding: 16 } }} style={{ borderRadius: 20 }}>
          <Flex
            vertical={isMobile}
            align={isMobile ? "stretch" : "center"}
            gap={12}
          >
            <Text strong>Anak</Text>
            <Select
              value={studentId || student?.student_id}
              options={studentOptions}
              onChange={setStudentId}
              style={{ minWidth: isMobile ? "100%" : 280 }}
            />
          </Flex>
        </Card>
      ) : null}

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

export default ParentPointView;
