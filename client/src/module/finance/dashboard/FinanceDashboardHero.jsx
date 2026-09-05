import { Card, Flex, Space, Tag, Typography } from "antd";
import { Building2, CalendarRange } from "lucide-react";

import { cardBaseStyle } from "./constants";

const { Title, Paragraph, Text } = Typography;

const FinanceDashboardHero = ({ meta, spp, isMobile }) => {
  const activeScope = meta?.active_scope || [];
  const isMultiUnit = meta?.scope_type === "all_units";
  const periodeName =
    meta?.active_periode?.periode_name || meta?.active_periode?.name || "-";

  return (
    <Card
      variant='borderless'
      style={{
        ...cardBaseStyle,
        overflow: "hidden",
        position: "relative",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 36%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #0f766e 100%)",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
      }}
      styles={{ body: { padding: isMobile ? 16 : 20 } }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 45%)",
          pointerEvents: "none",
        }}
      />
      <Space
        vertical
        size={isMobile ? 10 : 12}
        style={{ width: "100%", position: "relative" }}
      >
        <Flex align='center' gap={8} wrap='wrap'>
          <Tag
            icon={<CalendarRange size={12} style={{ marginRight: 4 }} />}
            color='cyan'
            style={{ borderRadius: 999, fontWeight: 600, marginInlineEnd: 0 }}
          >
            {meta?.current_month_label || "-"}
          </Tag>
          <Tag
            color='geekblue'
            style={{ borderRadius: 999, fontWeight: 600, marginInlineEnd: 0 }}
          >
            SPP {spp?.collection_rate_current_month || 0}%
          </Tag>
          {isMultiUnit ? (
            <Tag
              icon={<Building2 size={12} style={{ marginRight: 4 }} />}
              color='purple'
              style={{ borderRadius: 999, fontWeight: 600, marginInlineEnd: 0 }}
            >
              {activeScope.length || 0} satuan
            </Tag>
          ) : (
            <Tag
              color='lime'
              style={{ borderRadius: 999, fontWeight: 600, marginInlineEnd: 0 }}
            >
              {periodeName}
            </Tag>
          )}
        </Flex>

        <div>
          <Title
            level={isMobile ? 4 : 3}
            style={{ color: "#fff", margin: 0, lineHeight: 1.2 }}
          >
            Ringkasan keuangan sekolah
          </Title>
          <Paragraph
            style={{
              color: "rgba(255,255,255,0.78)",
              margin: "6px 0 0",
              maxWidth: 640,
              fontSize: isMobile ? 13 : 14,
            }}
          >
            {isMultiUnit
              ? "KPI periode aktif antar satuan: pendapatan fee, pengeluaran, dan sisa tagihan."
              : "Pantau pendapatan fee, pengeluaran, saldo bersih, dan tagihan belum lunas."}
          </Paragraph>
        </div>

        {!isMobile && isMultiUnit && activeScope.length > 0 ? (
          <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
            {activeScope
              .slice(0, 4)
              .map((item) => item.homebase_name)
              .join(" · ")}
            {activeScope.length > 4 ? ` · +${activeScope.length - 4}` : ""}
          </Text>
        ) : null}
      </Space>
    </Card>
  );
};

export default FinanceDashboardHero;
