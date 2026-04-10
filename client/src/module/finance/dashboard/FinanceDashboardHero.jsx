import { Card, Col, Flex, Row, Space, Statistic, Tag, Typography } from "antd";

import { cardBaseStyle, currency, heroIcon as Landmark } from "./constants";

const { Title, Text, Paragraph } = Typography;

const FinanceDashboardHero = ({
  meta,
  summary,
  spp,
  others,
  isMobile,
}) => {
  const activeScope = meta?.active_scope || [];
  const isMultiUnit = meta?.scope_type === "all_units";

  return (
    <Card
      variant='borderless'
      style={{
        ...cardBaseStyle,
        background:
          "linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #0f766e 100%)",
      }}
      styles={{ body: { padding: isMobile ? 22 : 28 } }}
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={15}>
          <Space vertical size={14}>
            <Tag color='cyan'>Dashboard Admin Keuangan</Tag>
            <Title level={2} style={{ color: "#fff", margin: 0, lineHeight: 1.15 }}>
              Ringkasan keuangan sekolah dalam satu tampilan.
            </Title>
            <Paragraph style={{ color: "rgba(255,255,255,.8)", margin: 0 }}>
              {isMultiUnit
                ? `Menampilkan seluruh satuan dengan periode aktif masing-masing. Total satuan aktif: ${activeScope.length || 0}.`
                : `Periode aktif: ${meta?.active_periode?.periode_name || meta?.active_periode?.name || "-"}. Pantau pemasukan SPP, pembayaran lainnya, tabungan siswa, dan kas kelas secara terpisah agar kondisi keuangan sekolah lebih jelas.`}
            </Paragraph>
            <Flex wrap='wrap' gap={10}>
              <Tag color='gold'>
                Bulan berjalan: {meta?.current_month_label || "-"}
              </Tag>
              <Tag color='lime'>
                Collection rate SPP: {spp?.collection_rate_current_month || 0}%
              </Tag>
              <Tag color='geekblue'>
                Piutang pembayaran lain: {currency(others?.total_remaining)}
              </Tag>
              {isMultiUnit ? (
                <Tag color='purple'>Satuan aktif: {activeScope.length || 0}</Tag>
              ) : null}
            </Flex>
          </Space>
        </Col>
        <Col xs={24} xl={9}>
          <Card
            variant='borderless'
            style={{
              borderRadius: 24,
              background: "rgba(255,255,255,0.14)",
            }}
            styles={{ body: { padding: 20 } }}
          >
            <Space vertical size={14} style={{ width: "100%" }}>
              <Statistic
                title={
                  <span style={{ color: "rgba(255,255,255,.72)" }}>
                    Pendapatan sekolah
                  </span>
                }
                value={summary?.school_revenue || 0}
                formatter={(value) => (
                  <span style={{ color: "#fff" }}>{currency(value)}</span>
                )}
                prefix={<Landmark size={20} color='#fff' />}
              />
              <Flex justify='space-between'>
                <Text style={{ color: "#fff" }}>Dana terkelola</Text>
                <Text strong style={{ color: "#fff" }}>
                  {currency(summary?.managed_funds)}
                </Text>
              </Flex>
              <Flex justify='space-between'>
                <Text style={{ color: "#fff" }}>Outstanding aktif</Text>
                <Text strong style={{ color: "#fff" }}>
                  {currency(
                    Number(spp?.outstanding_current_month || 0) +
                      Number(others?.total_remaining || 0),
                  )}
                </Text>
              </Flex>
            </Space>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default FinanceDashboardHero;
