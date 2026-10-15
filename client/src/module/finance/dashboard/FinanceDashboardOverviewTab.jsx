import { Card, Col, Flex, Grid, Row, Space, Tooltip, Typography } from "antd";
import { motion } from "framer-motion";
import { Info, ReceiptText, Users } from "lucide-react";

import {
  cardBaseStyle,
  currency,
  summaryIconMap,
  summaryToneMap,
} from "./constants";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const getKpiColumns = (screens) => {
  if (!screens.sm) return "1fr";
  if (!screens.md) return "repeat(2, minmax(0, 1fr))";
  if (!screens.xl) return "repeat(3, minmax(0, 1fr))";
  return "repeat(5, minmax(0, 1fr))";
};

const FinanceDashboardOverviewTab = ({
  summaryCards,
  summary,
  meta,
  spp,
  expense,
}) => {
  const screens = useBreakpoint();
  const isCompact = !screens.md;

  return (
    <Space vertical size={isCompact ? 12 : 16} style={{ width: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: getKpiColumns(screens),
          gap: isCompact ? 12 : 16,
        }}
      >
        {summaryCards.map((item, index) => {
          const tone = summaryToneMap[item.key];
          const Icon = summaryIconMap[item.key];
          const isCount = item.isCount;
          const valueColor =
            item.signColored && Number(item.value) < 0 ? "#b91c1c" : "#0f172a";

          return (
            <MotionDiv
              key={item.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.24 }}
              whileHover={screens.md ? { y: -3 } : undefined}
              style={{ minWidth: 0 }}
            >
              <Card
                variant='borderless'
                style={{
                  ...cardBaseStyle,
                  borderRadius: 20,
                  height: "100%",
                }}
                styles={{ body: { padding: isCompact ? 14 : 16 } }}
              >
                <Flex align='flex-start' gap={12}>
                  <Flex
                    align='center'
                    justify='center'
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: tone?.bg,
                      color: tone?.color,
                      flexShrink: 0,
                    }}
                  >
                    {Icon ? <Icon size={18} /> : null}
                  </Flex>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Flex align='center' gap={6} wrap='nowrap'>
                      <Text
                        type='secondary'
                        style={{
                          fontSize: 12,
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.title}
                      </Text>
                      {item.note ? (
                        <Tooltip title={item.note}>
                          <Info
                            size={13}
                            color='#94a3b8'
                            style={{ cursor: "help", flexShrink: 0 }}
                          />
                        </Tooltip>
                      ) : null}
                    </Flex>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: isCount ? (isCompact ? 26 : 28) : isCompact ? 16 : 18,
                        fontWeight: 700,
                        color: valueColor,
                        lineHeight: 1.25,
                        wordBreak: "break-word",
                      }}
                    >
                      {isCount
                        ? Number(item.value || 0).toLocaleString("id-ID")
                        : currency(item.value)}
                    </div>
                  </div>
                </Flex>
              </Card>
            </MotionDiv>
          );
        })}
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10} xl={8}>
          <Card
            variant='borderless'
            style={{ ...cardBaseStyle, borderRadius: 20, height: "100%" }}
            styles={{ body: { padding: isCompact ? 16 : 18 } }}
          >
            <Space vertical size={12} style={{ width: "100%" }}>
              <Flex align='center' gap={10}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                    color: "#1d4ed8",
                    flexShrink: 0,
                  }}
                >
                  <Users size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: "block", color: "#0f172a" }}>
                    Cakupan Data
                  </Text>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Entitas aktif pada periode berjalan
                  </Text>
                </div>
              </Flex>
              <Title
                level={isCompact ? 3 : 2}
                style={{ margin: 0, color: "#0f172a" }}
              >
                {Number(summary?.total_students || 0).toLocaleString("id-ID")}
              </Title>
              <Text type='secondary' style={{ fontSize: 13 }}>
                Siswa aktif pada periode aktif · {summary?.total_classes || 0}{" "}
                kelas · {summary?.total_grades || 0} tingkat ·{" "}
                {summary?.homebase_count || 0} satuan
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={14} xl={16}>
          <Card
            variant='borderless'
            style={{ ...cardBaseStyle, borderRadius: 20, height: "100%" }}
            styles={{ body: { padding: isCompact ? 16 : 18 } }}
          >
            <Space vertical size={12} style={{ width: "100%" }}>
              <Flex align='center' gap={10}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #dcfce7, #ecfdf5)",
                    color: "#15803d",
                    flexShrink: 0,
                  }}
                >
                  <ReceiptText size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: "block", color: "#0f172a" }}>
                    Rincian Periode Aktif
                  </Text>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Breakdown pendapatan, pengeluaran, dan tagihan
                  </Text>
                </div>
              </Flex>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: screens.md
                    ? "repeat(2, minmax(0, 1fr))"
                    : "1fr",
                  gap: 10,
                }}
              >
                {[
                  {
                    label: "SPP terkumpul (periode)",
                    value: currency(summary?.spp_collected),
                  },
                  {
                    label: "Pembayaran lainnya",
                    value: currency(summary?.other_collected),
                  },
                  {
                    label: "Pengeluaran operasional",
                    value: currency(
                      expense?.operational_total ?? summary?.expense_operational,
                    ),
                  },
                  {
                    label: "Honorarium terkunci",
                    value: currency(
                      expense?.honorarium_locked ?? summary?.honorarium_locked,
                    ),
                  },
                  {
                    label: `Outstanding SPP ${meta?.current_month_label || "-"}`,
                    value: currency(spp?.outstanding_current_month),
                  },
                  {
                    label: "Draft honorarium",
                    value: currency(
                      expense?.honorarium_draft ?? summary?.honorarium_draft,
                    ),
                  },
                ].map((item) => (
                  <Flex
                    key={item.label}
                    justify='space-between'
                    align='center'
                    gap={12}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: "#f8fafc",
                      border: "1px solid rgba(148,163,184,0.14)",
                      minWidth: 0,
                    }}
                  >
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, lineHeight: 1.35 }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      strong
                      style={{
                        color: "#0f172a",
                        fontSize: 13,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.value}
                    </Text>
                  </Flex>
                ))}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default FinanceDashboardOverviewTab;
