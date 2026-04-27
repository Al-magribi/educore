import { motion } from "framer-motion";
import {
  Card,
  Button,
  Flex,
  Typography,
  Grid,
  Tag,
  Statistic,
} from "antd";
import {
  ArrowLeft,
  Download,
  FileUp,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const QuestionHeader = ({
  bankName,
  totalCount,
  totalScore,
  onBack,
  onDownload,
  isDownloading,
  onImport,
  onAdd,
  onDeleteAll,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isOverScore = totalScore > 100;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <Card
        variant="borderless"
        style={{
          borderRadius: 24,
          overflow: "hidden",
          position: "relative",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.24), transparent 28%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
          boxShadow: "0 22px 46px rgba(15, 23, 42, 0.16)",
        }}
        styles={{ body: { padding: isMobile ? 18 : 22 } }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
            pointerEvents: "none",
          }}
        />

        <Flex
          justify="space-between"
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          gap={18}
          style={{ position: "relative" }}
        >
          <Flex gap={14} align="flex-start" style={{ flex: 1 }}>
            <Button
              icon={<ArrowLeft size={18} />}
              type="text"
              shape="circle"
              onClick={onBack}
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
                flexShrink: 0,
              }}
            />

            <div style={{ minWidth: 0, flex: 1 }}>
              <Flex align="center" gap={10} wrap="wrap" style={{ marginBottom: 8 }}>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.82)",
                    fontWeight: 700,
                    letterSpacing: 0.4,
                  }}
                >
                  WORKSPACE SOAL
                </Text>
                <Flex
                  align="center"
                  gap={6}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    color: "#e0f2fe",
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={14} />
                  <span>Kelola isi bank soal</span>
                </Flex>
              </Flex>

              <Title
                level={isMobile ? 4 : 3}
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "clamp(18px, 4vw, 24px)",
                  lineHeight: 1.2,
                }}
              >
                {bankName?.replaceAll("-", " ")}
              </Title>

              <Text
                style={{
                  display: "block",
                  marginTop: 6,
                  color: "rgba(241,245,249,0.84)",
                  maxWidth: 640,
                }}
              >
                Susun, review, dan optimalkan pertanyaan dalam bank soal ini
                dari panel yang lebih fokus dan siap digunakan untuk operasional CBT.
              </Text>
            </div>
          </Flex>

          <Flex
            gap={12}
            wrap="wrap"
            style={{ minWidth: isMobile ? "100%" : 280 }}
          >
            <Card
              size="small"
              style={{
                flex: 1,
                minWidth: 120,
                borderRadius: 18,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
              styles={{ body: { padding: "12px 14px" } }}
            >
              <Statistic
                title={<span style={{ color: "rgba(255,255,255,0.72)" }}>Jumlah Soal</span>}
                value={totalCount}
                styles={{ content: { color: "#fff" } }}
              />
            </Card>

            <Card
              size="small"
              style={{
                flex: 1,
                minWidth: 120,
                borderRadius: 18,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
              styles={{ body: { padding: "12px 14px" } }}
            >
              <Statistic
                title={<span style={{ color: "rgba(255,255,255,0.72)" }}>Bobot Total</span>}
                value={totalScore}
                suffix="/100"
                styles={{
                  content: { color: isOverScore ? "#fecaca" : "#fff" },
                }}
              />
            </Card>
          </Flex>
        </Flex>

        <Flex
          gap={10}
          wrap="wrap"
          justify={isMobile ? "stretch" : "flex-end"}
          style={{ position: "relative", marginTop: 18 }}
        >
          {isOverScore && (
            <Tag
              bordered={false}
              style={{
                marginInlineEnd: 0,
                borderRadius: 999,
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.14)",
                color: "#fee2e2",
                fontWeight: 600,
              }}
            >
              <Flex align="center" gap={8}>
                <AlertCircle size={14} />
                <span>Total bobot melebihi 100 poin</span>
              </Flex>
            </Tag>
          )}

          <Button
            icon={<Download size={16} />}
            onClick={onDownload}
            loading={isDownloading}
            disabled={totalCount === 0}
            className="res-btn-full"
            style={{
              borderRadius: 14,
              minHeight: 42,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.24)",
            }}
          >
            Download Soal
          </Button>
          <Button
            danger
            icon={<Trash2 size={16} />}
            onClick={onDeleteAll}
            disabled={totalCount === 0}
            className="res-btn-full"
            style={{
              borderRadius: 14,
              minHeight: 42,
            }}
          >
            Kosongkan
          </Button>
          <Button
            icon={<FileUp size={16} />}
            onClick={onImport}
            className="res-btn-full"
            style={{
              borderRadius: 14,
              minHeight: 42,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.24)",
            }}
          >
            Import
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={onAdd}
            className="res-btn-full"
            style={{
              borderRadius: 14,
              minHeight: 42,
              background: "#fff",
              color: "#0f172a",
              border: "none",
              fontWeight: 600,
              boxShadow: "0 12px 24px rgba(255,255,255,0.18)",
            }}
          >
            Tambah Soal
          </Button>
        </Flex>

        <style>{`
          @media (max-width: 576px) {
            .res-btn-full {
              flex: 1;
              justify-content: center;
            }
          }
        `}</style>
      </Card>
    </MotionDiv>
  );
};

export default QuestionHeader;
