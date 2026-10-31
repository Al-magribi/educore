import { Space, Tag, Typography } from "antd";
import { Building2, CalendarRange } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";

const { Text } = Typography;
const tagStyle = { margin: 0 };

const FinanceDashboardHero = ({ meta, spp }) => {
  const activeScope = meta?.active_scope || [];
  const isMultiUnit = meta?.scope_type === "all_units";
  const periodeName =
    meta?.active_periode?.periode_name || meta?.active_periode?.name || "-";
  const scopeNames =
    isMultiUnit && activeScope.length > 0
      ? `${activeScope
          .slice(0, 4)
          .map((item) => item.homebase_name)
          .join(" · ")}${activeScope.length > 4 ? ` · +${activeScope.length - 4}` : ""}`
      : null;

  return (
    <PageHeader
      title='Ringkasan keuangan sekolah'
      description={
        isMultiUnit
          ? "KPI periode aktif antar satuan: pendapatan fee, pengeluaran, dan sisa tagihan."
          : "Pantau pendapatan fee, pengeluaran, saldo bersih, dan tagihan belum lunas."
      }
      meta={
        <Space wrap size={[8, 8]}>
          <Tag
            icon={<CalendarRange size={12} style={{ marginRight: 4 }} />}
            style={tagStyle}
          >
            {meta?.current_month_label || "-"}
          </Tag>
          <Tag color='blue' style={tagStyle}>
            SPP {spp?.collection_rate_current_month || 0}%
          </Tag>
          {isMultiUnit ? (
            <Tag
              icon={<Building2 size={12} style={{ marginRight: 4 }} />}
              style={tagStyle}
            >
              {activeScope.length || 0} satuan
            </Tag>
          ) : (
            <Tag style={tagStyle}>{periodeName}</Tag>
          )}
          {scopeNames ? (
            <Text type='secondary' style={{ fontSize: 12 }}>
              {scopeNames}
            </Text>
          ) : null}
        </Space>
      }
    />
  );
};

export default FinanceDashboardHero;
