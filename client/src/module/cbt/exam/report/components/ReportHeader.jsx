import {
  Badge,
  Button,
  Card,
  Col,
  Flex,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  ArrowLeft,
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

const infoCardStyle = {
  borderRadius: 22,
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 16px 36px rgba(15, 23, 42, 0.08)",
};

const ReportHeader = ({ examName, stats, isMobile = false, examToken }) => {
  const navigate = useNavigate();

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                <Tag
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    paddingInline: 12,
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.16)",
                  }}
                  icon={<LockOpen size={12} />}
                >
                  <Text
                    copyable
                    style={{ color: "white", fontSize: 11, marginLeft: 5 }}
                  >
                    {examToken}
                  </Text>
                </Tag>
              </Space>

              <Title
                level={isMobile ? 4 : 2}
                style={{ margin: 0, color: "#fff", lineHeight: 1.12 }}
              >
                {examName || "Ujian CBT"}
              </Title>
              <Text style={{ color: "rgba(255,255,255,0.82)", maxWidth: 760 }}>
                Pantau kehadiran peserta, pelanggaran, dan hasil ujian dalam
                satu workspace yang rapi untuk pengawasan CBT yang lebih
                presisi.
              </Text>
            </Space>
          </Flex>
        </Card>
      </div>
    </MotionDiv>
  );
};

export default ReportHeader;
