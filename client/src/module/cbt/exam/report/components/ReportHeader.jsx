import { Button, Card, Flex, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  LockOpen,
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
        <Card
          variant='borderless'
          style={{
            borderRadius: isMobile ? 20 : 28,
            overflow: "hidden",
            background:
              "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.1), transparent 20%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)",
            boxShadow: "0 24px 52px rgba(15, 23, 42, 0.18)",
          }}
          styles={{ body: { padding: isMobile ? 16 : 28 } }}
        >
          <Flex vertical gap={isMobile ? 14 : 18}>
            <Flex
              justify='space-between'
              align={isMobile ? "stretch" : "flex-start"}
              gap={12}
              wrap='wrap'
              style={{ flexDirection: isMobile ? "column" : "row" }}
            >
              <Space
                direction='vertical'
                size={isMobile ? 10 : 12}
                style={{ minWidth: 0, flex: 1 }}
              >
                <Flex align='center' gap={8} wrap='wrap'>
                  <Button
                    icon={<ArrowLeft size={16} />}
                    onClick={() =>
                      navigate("/computer-based-test/jadwal-ujian")
                    }
                    style={{
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.12)",
                      borderColor: "rgba(255,255,255,0.16)",
                      color: "#fff",
                    }}
                  >
                    Kembali
                  </Button>
                  <Tag
                    style={{
                      margin: 0,
                      borderRadius: 999,
                      paddingInline: 12,
                      background: "rgba(255,255,255,0.12)",
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.16)",
                    }}
                    icon={<ShieldCheck size={12} />}
                  >
                    Laporan Ujian
                  </Tag>
                  {!!stats?.duration && (
                    <Tag
                      style={{
                        margin: 0,
                        borderRadius: 999,
                        paddingInline: 12,
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.16)",
                      }}
                      icon={<Timer size={12} />}
                    >
                      {stats.duration} menit
                    </Tag>
                  )}
                </Flex>

                <Title
                  level={isMobile ? 4 : 2}
                  style={{
                    margin: 0,
                    color: "#fff",
                    lineHeight: 1.2,
                    wordBreak: "break-word",
                  }}
                >
                  {examName || "Ujian CBT"}
                </Title>
              </Space>

              <div
                style={{
                  width: isMobile ? "100%" : "auto",
                  minWidth: isMobile ? 0 : 220,
                  maxWidth: isMobile ? "100%" : 320,
                  padding: isMobile ? "12px 14px" : "14px 16px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Flex align='center' gap={8} style={{ marginBottom: 6 }}>
                  <LockOpen size={14} color='rgba(255,255,255,0.85)' />
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.75)",
                      fontSize: 12,
                      margin: 0,
                    }}
                  >
                    Token Ujian
                  </Text>
                </Flex>
                <Text
                  copyable={
                    examToken
                      ? {
                          text: examToken,
                          icon: [
                            <Copy
                              key='copy'
                              size={14}
                              color='rgba(255,255,255,0.85)'
                            />,
                            <Copy key='copied' size={14} color='#86efac' />,
                          ],
                        }
                      : false
                  }
                  style={{
                    color: "#fff",
                    fontSize: isMobile ? 18 : 22,
                    fontWeight: 700,
                    letterSpacing: 1,
                    margin: 0,
                    wordBreak: "break-all",
                    display: "block",
                  }}
                >
                  {examToken || "-"}
                </Text>
              </div>
            </Flex>
          </Flex>
        </Card>

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
