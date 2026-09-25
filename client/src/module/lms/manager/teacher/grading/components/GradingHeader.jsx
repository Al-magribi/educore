import { Card, Flex, Grid, Space, Tag, Typography } from "antd";
import { CalendarCheck, GraduationCap, Info } from "lucide-react";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const GradingHeader = ({ subject, unit, period, semesterLabel }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const subjectLabel = subject?.name || "Mata Pelajaran";
  const periodLabel = period?.name || "Periode";

  return (
    <Card
      style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}
      styles={{ body: { padding: isMobile ? 14 : 20 } }}
    >
      <Flex vertical gap={16}>
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          wrap='wrap'
          gap={16}
          vertical={isMobile}
        >
          <Space align='start' size={14} style={{ minWidth: 0 }}>
            <div
              style={{
                width: isMobile ? 40 : 46,
                height: isMobile ? 40 : 46,
                borderRadius: 12,
                background: "#f0f5ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2f54eb",
                flexShrink: 0,
              }}
            >
              <GraduationCap size={isMobile ? 20 : 22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <Title
                level={isMobile ? 5 : 4}
                style={{ margin: 0, overflowWrap: "anywhere" }}
              >
                Penilaian {subjectLabel}
              </Title>
              <Text type='secondary'>
                Rekap sikap, formatif, sumatif, dan ujian akhir per semester.
              </Text>
            </div>
          </Space>

          <Space wrap size={[8, 8]}>
            <Tag
              color='blue'
              style={{ borderRadius: 999, padding: "2px 12px" }}
            >
              {unit?.name}
            </Tag>

            <Tag
              color={period?.isActive ? "green" : "default"}
              style={{ borderRadius: 999, padding: "2px 12px" }}
            >
              <Space size={6} align='center'>
                <CalendarCheck size={14} />
                <span>{periodLabel}</span>
              </Space>
            </Tag>
            <Tag
              color='geekblue'
              style={{ borderRadius: 999, padding: "2px 12px" }}
            >
              {semesterLabel}
            </Tag>
            {subject?.kkm ? (
              <Tag color='gold' style={{ borderRadius: 999 }}>
                KKM {subject.kkm}
              </Tag>
            ) : (
              <Tag color='default' style={{ borderRadius: 999 }}>
                <Space size={6} align='center'>
                  <Info size={12} />
                  <span>KKM belum ditetapkan</span>
                </Space>
              </Tag>
            )}
          </Space>
        </Flex>
      </Flex>
    </Card>
  );
};

export default GradingHeader;
