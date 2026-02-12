import { Badge, Card, Flex, Space, Tag, Typography } from "antd";
import { CalendarCheck, GraduationCap, Info } from "lucide-react";

const { Title, Text } = Typography;

const GradingHeader = ({ subject, unit, period, semesterLabel }) => {
  const subjectLabel = subject?.name || "Mata Pelajaran";
  const periodLabel = period?.name || "Periode";

  return (
    <Card
      style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}
      styles={{ body: { padding: 20 } }}
    >
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Space align="center" size={14}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#f0f5ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2f54eb",
              }}
            >
              <GraduationCap size={22} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Penilaian {subjectLabel}
              </Title>
              <Text type="secondary">
                Rekap sikap, formatif, sumatif, dan ujian akhir per semester.
              </Text>
            </div>
          </Space>

          <Flex vertical gap={"middle"} align="end">
            <Space wrap size={[8, 8]}>
              <Tag
                color="blue"
                style={{ borderRadius: 999, padding: "2px 12px" }}
              >
                {unit?.name}
              </Tag>

              <Tag
                color={period?.isActive ? "green" : "default"}
                style={{ borderRadius: 999, padding: "2px 12px" }}
              >
                <Space size={6} align="center">
                  <CalendarCheck size={14} />
                  <span>{periodLabel}</span>
                </Space>
              </Tag>
              <Tag
                color="geekblue"
                style={{ borderRadius: 999, padding: "2px 12px" }}
              >
                {semesterLabel}
              </Tag>
              {subject?.kkm ? (
                <Tag color="gold" style={{ borderRadius: 999 }}>
                  KKM {subject.kkm}
                </Tag>
              ) : (
                <Tag color="default" style={{ borderRadius: 999 }}>
                  <Space size={6} align="center">
                    <Info size={12} />
                    <span>KKM belum ditetapkan</span>
                  </Space>
                </Tag>
              )}
            </Space>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
};

export default GradingHeader;
