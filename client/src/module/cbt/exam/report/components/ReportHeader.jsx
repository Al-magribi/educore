import { Button, Card, Flex, Tag, Typography } from "antd";
import PageHeader from "../../../../../components/ui/PageHeader";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  ShieldCheck,
  Timer,
  TriangleAlert,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const ReportHeader = ({ examName, stats, isMobile = false, examToken }) => {
  const navigate = useNavigate();

  const statItems = [
    {
      key: "total",
      label: "Total Peserta",
      value: stats?.total ?? 0,
      icon: <Users size={16} />,
      color: "#2563eb",
      soft: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
    },
    {
      key: "ongoing",
      label: "Mengerjakan",
      value: stats?.ongoing ?? 0,
      icon: <UserRoundCheck size={16} />,
      color: "#0891b2",
      soft: "linear-gradient(135deg, #cffafe 0%, #e0f2fe 100%)",
    },
    {
      key: "waiting",
      label: "Belum Masuk",
      value: stats?.waiting ?? 0,
      icon: <Timer size={16} />,
      color: "#64748b",
      soft: "linear-gradient(135deg, #e2e8f0 0%, #f8fafc 100%)",
    },
    {
      key: "violations",
      label: "Pelanggaran",
      value: stats?.violations ?? 0,
      icon: <TriangleAlert size={16} />,
      color: "#dc2626",
      soft: "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)",
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Flex vertical gap={isMobile ? 12 : 16}>
        <Flex vertical gap={8}>
          <Button
            type='link'
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate("/computer-based-test/jadwal-ujian")}
            style={{ width: "fit-content", paddingInline: 0 }}
          >
            Kembali
          </Button>
          <PageHeader
            title={examName || "Ujian CBT"}
            description='Laporan ujian'
            meta={
              <Flex gap={8} wrap='wrap' align='center'>
                <Tag icon={<ShieldCheck size={12} />}>Laporan Ujian</Tag>
                {!!stats?.duration && (
                  <Tag icon={<Timer size={12} />}>{stats.duration} menit</Tag>
                )}
              </Flex>
            }
            extra={
              <Flex vertical gap={2}>
                <Text type='secondary' style={{ fontSize: 12 }}>
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
                        }
                      : false
                  }
                  style={{
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  {examToken || "-"}
                </Text>
              </Flex>
            }
          />
        </Flex>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: isMobile ? 10 : 12,
          }}
        >
          {statItems.map((item) => (
            <Card
              key={item.key}
              variant='borderless'
              style={{
                borderRadius: isMobile ? 16 : 20,
                height: "100%",
                border: "1px solid rgba(148, 163, 184, 0.14)",
                boxShadow: "0 14px 28px rgba(15, 23, 42, 0.05)",
                background: "#fff",
              }}
              styles={{ body: { padding: isMobile ? 12 : 16 } }}
            >
              <Flex align='center' gap={isMobile ? 10 : 12}>
                <div
                  style={{
                    width: isMobile ? 36 : 42,
                    height: isMobile ? 36 : 42,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: item.soft,
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text
                    type='secondary'
                    style={{
                      fontSize: isMobile ? 11 : 12,
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.label}
                  </Text>
                  <Title
                    level={isMobile ? 4 : 3}
                    style={{
                      margin: "2px 0 0",
                      color: item.color,
                      lineHeight: 1.1,
                    }}
                  >
                    {item.value}
                  </Title>
                </div>
              </Flex>
            </Card>
          ))}
        </div>
      </Flex>
    </MotionDiv>
  );
};

export default ReportHeader;
