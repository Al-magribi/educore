import { Card, Col, Flex, Row, Space, Typography } from "antd";
import { motion } from "framer-motion";
import { ReceiptText, Users } from "lucide-react";

import {
  cardBaseStyle,
  currency,
  summaryIconMap,
  summaryToneMap,
} from "./constants";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const FinanceDashboardOverviewTab = ({ summaryCards, summary, meta, spp }) => (
  <Space vertical size={16} style={{ width: "100%" }}>
    <Row gutter={[16, 16]}>
      {summaryCards.map((item, index) => {
        const tone = summaryToneMap[item.key];
        const Icon = summaryIconMap[item.key];
        return (
          <Col xs={24} sm={12} xl={12} xxl={6} key={item.key}>
            <MotionDiv
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.28 }}
              whileHover={{ y: -4 }}
            >
              <Card variant='borderless' style={cardBaseStyle}>
                <Space vertical size={14} style={{ width: "100%" }}>
                  <Flex justify='space-between' align='start' gap={16}>
                    <div>
                      <Text type='secondary'>{item.title}</Text>
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 28,
                          fontWeight: 700,
                          color: "#0f172a",
                          lineHeight: 1.2,
                        }}
                      >
                        {currency(item.value)}
                      </div>
                    </div>
                    <Flex
                      align='center'
                      justify='center'
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 18,
                        background: tone.bg,
                        color: tone.color,
                        flexShrink: 0,
                      }}
                    >
                      {Icon ? <Icon size={20} /> : null}
                    </Flex>
                  </Flex>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>{item.note}</Text>
                </Space>
              </Card>
            </MotionDiv>
          </Col>
        );
      })}
    </Row>

    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <Card variant='borderless' style={cardBaseStyle}>
          <Space vertical size={14} style={{ width: "100%" }}>
            <Flex align='center' gap={10}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 15,
                  background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                  color: "#1d4ed8",
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <Text strong style={{ display: "block", color: "#0f172a" }}>
                  Cakupan Data
                </Text>
                <Text type='secondary'>
                  Ringkasan jumlah entitas aktif dalam dashboard.
                </Text>
              </div>
            </Flex>
            <Title level={2} style={{ margin: 0, color: "#0f172a" }}>
              {summary?.total_students || 0}
            </Title>
            <Text type='secondary'>
              {summary?.total_classes || 0} kelas, {summary?.total_grades || 0}{" "}
              tingkat, {summary?.homebase_count || 0} satuan aktif.
            </Text>
          </Space>
        </Card>
      </Col>

      <Col xs={24} xl={12}>
        <Card variant='borderless' style={cardBaseStyle}>
          <Space vertical size={14} style={{ width: "100%" }}>
            <Flex align='center' gap={10}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 15,
                  background: "linear-gradient(135deg, #dcfce7, #ecfdf5)",
                  color: "#15803d",
                }}
              >
                <ReceiptText size={18} />
              </div>
              <div>
                <Text strong style={{ display: "block", color: "#0f172a" }}>
                  Master Aktif
                </Text>
                <Text type='secondary'>
                  Parameter finansial yang sedang dipakai saat ini.
                </Text>
              </div>
            </Flex>
            <Flex vertical gap={10}>
              {[
                {
                  label: "Tarif SPP aktif",
                  value: `${summary?.active_spp_tariffs || 0} tarif`,
                },
                {
                  label: "Jenis pembayaran lain",
                  value: `${summary?.active_other_types || 0} jenis`,
                },
                {
                  label: `Target SPP ${meta?.current_month_label || "-"}`,
                  value: currency(spp?.expected_current_month),
                },
              ].map((item) => (
                <Flex
                  key={item.label}
                  justify='space-between'
                  align='center'
                  style={{
                    padding: "12px 14px",
                    borderRadius: 16,
                    background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
                    border: "1px solid rgba(148,163,184,0.14)",
                  }}
                >
                  <Text type='secondary'>{item.label}</Text>
                  <Text strong style={{ color: "#0f172a" }}>
                    {item.value}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Space>
        </Card>
      </Col>
    </Row>
  </Space>
);

export default FinanceDashboardOverviewTab;
