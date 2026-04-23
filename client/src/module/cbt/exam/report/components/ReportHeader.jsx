import { Badge, Button, Card, Col, Flex, Row, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Timer, TriangleAlert, UserRoundCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const infoCardStyle = {
  borderRadius: 22,
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 16px 36px rgba(15, 23, 42, 0.08)",
};

const ReportHeader = ({ examName, stats, isMobile = false, examToken }) => {
  const navigate = useNavigate();

  const summaryCards = [
    {
      key: "ongoing",
      label: "Sedang Mengerjakan",
      value: stats?.ongoing || 0,
      icon: <UserRoundCheck size={18} />,
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      color: "#1d4ed8",
    },
    {
      key: "violations",
      label: "Pelanggaran",
      value: stats?.violations || 0,
      icon: <TriangleAlert size={18} />,
      background: "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)",
      color: "#dc2626",
    },
    {
      key: "waiting",
      label: "Belum Masuk",
      value: stats?.waiting || 0,
      icon: <Users size={18} />,
      background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
      color: "#475569",
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Badge.Ribbon text={examToken || "CBT"} color='blue'>
          <Card
            variant='borderless'
            style={{
              borderRadius: 28,
              overflow: "hidden",
              background:
                "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)",
              boxShadow: "0 24px 52px rgba(15, 23, 42, 0.18)",
            }}
            styles={{ body: { padding: isMobile ? 20 : 28 } }}
          >
            <Flex
              justify='space-between'
              align={isMobile ? "flex-start" : "center"}
              gap={18}
              wrap='wrap'
            >
              <Space orientation='vertical' size={10} style={{ maxWidth: 760 }}>
                <Space align='center' size={10} wrap>
                  <Button
                    icon={<ArrowLeft size={16} />}
                    onClick={() => navigate("/computer-based-test/jadwal-ujian")}
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
                </Space>

                <Title
                  level={isMobile ? 4 : 2}
                  style={{ margin: 0, color: "#fff", lineHeight: 1.12 }}
                >
                  {examName || "Ujian CBT"}
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.82)", maxWidth: 760 }}>
                  Pantau kehadiran peserta, pelanggaran, dan hasil ujian dalam satu
                  workspace yang rapi untuk pengawasan CBT yang lebih presisi.
                </Text>
              </Space>

              <Card
                variant='borderless'
                style={{
                  width: 320,
                  maxWidth: "100%",
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  backdropFilter: "blur(10px)",
                }}
                styles={{ body: { padding: 22 } }}
              >
                <Space orientation='vertical' size={10} style={{ width: "100%" }}>
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>Ringkasan ujian</Text>
                  <Title level={4} style={{ margin: 0, color: "#fff" }}>
                    {stats?.total || 0} peserta
                  </Title>
                  <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                    Durasi: {stats?.duration || "-"} menit
                  </Text>
                  <Flex
                    align='center'
                    gap={8}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 18,
                      background: "rgba(15,23,42,0.16)",
                    }}
                  >
                    <Timer size={16} color='#bfdbfe' />
                    <Text style={{ color: "#e2e8f0" }}>
                      {stats?.ongoing || 0} aktif, {stats?.violations || 0} pelanggaran,
                      {stats?.waiting || 0} belum masuk
                    </Text>
                  </Flex>
                </Space>
              </Card>
            </Flex>
          </Card>
        </Badge.Ribbon>

        <Row gutter={[16, 16]}>
          {summaryCards.map((item) => (
            <Col key={item.key} xs={24} sm={8}>
              <Card variant='borderless' style={infoCardStyle} styles={{ body: { padding: 18 } }}>
                <Flex align='center' justify='space-between' gap={16}>
                  <Space orientation='vertical' size={4}>
                    <Text type='secondary'>{item.label}</Text>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                      {item.value}
                    </Title>
                  </Space>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: item.background,
                      color: item.color,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </MotionDiv>
  );
};

export default ReportHeader;
