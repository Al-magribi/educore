import { Col, Flex, Grid, Row, Tooltip, Typography } from "antd";
import { Info, ReceiptText, Users } from "lucide-react";

import { CardTitle, MuseCard, StatCard } from "../../../components/ui/muse";
import { museColors, museRadius } from "../../../config/theme";
import { currency, summaryIconMap, summaryToneMap } from "./constants";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const StatTitle = ({ title, note }) => (
  <Flex align='center' gap={6} component='span'>
    <span>{title}</span>
    {note ? (
      <Tooltip title={note}>
        <Info
          size={13}
          aria-label={`Keterangan ${title}`}
          color={museColors.muted}
          style={{ cursor: "help", flexShrink: 0 }}
        />
      </Tooltip>
    ) : null}
  </Flex>
);

const FinanceDashboardOverviewTab = ({
  summaryCards,
  summary,
  meta,
  spp,
  expense,
}) => {
  const screens = useBreakpoint();
  const isCompact = !screens.md;
  const gutter = isCompact ? 16 : 24;

  const breakdown = [
    { label: "SPP terkumpul (periode)", value: summary?.spp_collected },
    { label: "Pembayaran lainnya", value: summary?.other_collected },
    {
      label: "Pengeluaran operasional",
      value: expense?.operational_total ?? summary?.expense_operational,
    },
    {
      label: "Honorarium terkunci",
      value: expense?.honorarium_locked ?? summary?.honorarium_locked,
    },
    {
      label: `Outstanding SPP ${meta?.current_month_label || "-"}`,
      value: spp?.outstanding_current_month,
    },
    {
      label: "Draft honorarium",
      value: expense?.honorarium_draft ?? summary?.honorarium_draft,
    },
  ];

  return (
    <Flex vertical gap={gutter} style={{ width: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: gutter,
        }}
      >
        {summaryCards.map((item) => {
          const Icon = summaryIconMap[item.key];
          const isNegative = item.signColored && Number(item.value) < 0;
          const formatted = item.isCount
            ? Number(item.value || 0).toLocaleString("id-ID")
            : currency(item.value);

          return (
            <StatCard
              key={item.key}
              compact
              title={<StatTitle title={item.title} note={item.note} />}
              value={
                isNegative ? (
                  <span style={{ color: museColors.danger }}>{formatted}</span>
                ) : (
                  formatted
                )
              }
              icon={Icon ? <Icon size={18} /> : null}
              tone={summaryToneMap[item.key] || "primary"}
            />
          );
        })}
      </div>

      <Row gutter={[gutter, gutter]}>
        <Col xs={24} lg={10} xl={8}>
          <MuseCard
            style={{ height: "100%" }}
            title={
              <CardTitle
                icon={<Users size={16} />}
                title='Cakupan Data'
                description='Entitas aktif pada periode berjalan'
              />
            }
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: museColors.text,
                lineHeight: 1.25,
              }}
            >
              {Number(summary?.total_students || 0).toLocaleString("id-ID")}
            </div>
            <Text type='secondary'>
              Siswa aktif pada periode aktif · {summary?.total_classes || 0}{" "}
              kelas · {summary?.total_grades || 0} tingkat ·{" "}
              {summary?.homebase_count || 0} satuan
            </Text>
          </MuseCard>
        </Col>

        <Col xs={24} lg={14} xl={16}>
          <MuseCard
            style={{ height: "100%" }}
            title={
              <CardTitle
                icon={<ReceiptText size={16} />}
                title='Rincian Periode Aktif'
                description='Pendapatan, pengeluaran, dan tagihan'
              />
            }
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: screens.md
                  ? "repeat(2, minmax(0, 1fr))"
                  : "1fr",
                gap: 8,
              }}
            >
              {breakdown.map((item) => (
                <Flex
                  key={item.label}
                  justify='space-between'
                  align='center'
                  gap={12}
                  style={{
                    padding: "10px 12px",
                    borderRadius: museRadius.item,
                    background: museColors.bgLayout,
                    minWidth: 0,
                  }}
                >
                  <Text type='secondary' style={{ fontSize: 12, lineHeight: 1.35 }}>
                    {item.label}
                  </Text>
                  <Text
                    strong
                    style={{ textAlign: "right", whiteSpace: "nowrap" }}
                  >
                    {currency(item.value)}
                  </Text>
                </Flex>
              ))}
            </div>
          </MuseCard>
        </Col>
      </Row>
    </Flex>
  );
};

export default FinanceDashboardOverviewTab;
