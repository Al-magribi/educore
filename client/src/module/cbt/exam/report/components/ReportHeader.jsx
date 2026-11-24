import { Button, Flex, Tag, Typography } from "antd";
import PageHeader from "../../../../../components/ui/PageHeader";
import { StatCard } from "../../../../../components/ui/muse";
import { museColors } from "../../../../../config/theme";
import {
  ArrowLeft,
  Copy,
  KeyRound,
  Timer,
  TriangleAlert,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const ReportHeader = ({ examName, stats, isMobile = false, examToken }) => {
  const navigate = useNavigate();

  const statItems = [
    {
      key: "total",
      title: "Total Peserta",
      value: stats?.total ?? 0,
      icon: <Users size={isMobile ? 18 : 24} />,
      tone: "primary",
    },
    {
      key: "ongoing",
      title: "Mengerjakan",
      value: stats?.ongoing ?? 0,
      icon: <UserRoundCheck size={isMobile ? 18 : 24} />,
      tone: "cyan",
    },
    {
      key: "waiting",
      title: "Belum Masuk",
      value: stats?.waiting ?? 0,
      icon: <Timer size={isMobile ? 18 : 24} />,
      tone: "warning",
    },
    {
      key: "violations",
      title: "Pelanggaran",
      value: stats?.violations ?? 0,
      icon: <TriangleAlert size={isMobile ? 18 : 24} />,
      tone: "danger",
    },
  ];

  return (
    <Flex vertical gap={isMobile ? 16 : 24}>
      <Flex vertical gap={4}>
        <Button
          type='link'
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate("/computer-based-test/jadwal-ujian")}
          style={{ width: "fit-content", paddingInline: 0, color: museColors.muted }}
        >
          Jadwal Ujian
        </Button>
        <PageHeader
          title={examName || "Laporan Ujian"}
          description='Pantau kehadiran, koreksi jawaban, dan analisis hasil ujian.'
          meta={
            stats?.duration ? (
              <Tag icon={<Timer size={12} />} style={{ margin: 0 }}>
                {stats.duration} menit
              </Tag>
            ) : null
          }
          extra={
            <Flex
              align='center'
              gap={10}
              style={{
                padding: "8px 14px",
                background: "#fff",
                borderRadius: 8,
                border: `1px solid ${museColors.divider}`,
              }}
            >
              <KeyRound size={16} color={museColors.muted} />
              <div>
                <Text type='secondary' style={{ fontSize: 12, display: "block", lineHeight: 1.2 }}>
                  Token Ujian
                </Text>
                <Text
                  copyable={
                    examToken
                      ? {
                          text: examToken,
                          icon: [
                            <Copy key='copy' size={14} />,
                            <Copy key='copied' size={14} />,
                          ],
                          tooltips: ["Salin token", "Token disalin"],
                        }
                      : false
                  }
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: 1,
                    fontFamily: "monospace",
                  }}
                >
                  {examToken || "-"}
                </Text>
              </div>
            </Flex>
          }
        />
      </Flex>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(auto-fit, minmax(200px, 1fr))",
          gap: isMobile ? 12 : 24,
        }}
      >
        {statItems.map(({ key, ...item }) => (
          <StatCard key={key} {...item} compact={isMobile} />
        ))}
      </div>
    </Flex>
  );
};

export default ReportHeader;
