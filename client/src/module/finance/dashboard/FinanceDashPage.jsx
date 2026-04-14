import { Alert, Button, Grid, Select, Space, Tabs, Typography } from "antd";
import { useMemo, useState } from "react";

import { LoadApp } from "../../../components";
import { useGetFinanceDashboardQuery } from "../../../service/finance/ApiDash";
import FinanceDashboardActivityTab from "./FinanceDashboardActivityTab";
import FinanceDashboardHero from "./FinanceDashboardHero";
import FinanceDashboardOverviewTab from "./FinanceDashboardOverviewTab";
import FinanceDashboardUnitsTab from "./FinanceDashboardUnitsTab";

const { useBreakpoint } = Grid;
const { Text } = Typography;

const FinanceDashPage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedHomebaseId, setSelectedHomebaseId] = useState();
  const queryParams = useMemo(
    () =>
      selectedHomebaseId ? { homebase_id: selectedHomebaseId } : undefined,
    [selectedHomebaseId],
  );
  const { data, isLoading, error, refetch } = useGetFinanceDashboardQuery(queryParams);

  if (isLoading && !data) {
    return <LoadApp />;
  }

  if (error && !data) {
    return (
      <Alert
        type='error'
        showIcon
        message='Dashboard keuangan gagal dimuat'
        description='Data dashboard tidak dapat diambil dari server.'
        action={
          <Button size='small' onClick={refetch}>
            Muat ulang
          </Button>
        }
      />
    );
  }

  const meta = data?.meta || {};
  const summary = data?.summary || {};
  const spp = data?.spp || {};
  const others = data?.others || {};
  const savings = data?.savings || {};
  const classCash = data?.class_cash || {};
  const channels = data?.channels || [];
  const priorities = data?.priorities || [];
  const recentTransactions = data?.recent_transactions || [];
  const homebases = data?.homebases || [];
  const availableHomebases = meta?.available_homebases || homebases;
  const showHomebaseFilter = availableHomebases.length > 1;

  const summaryCards = [
    {
      key: "revenue",
      title: "Pendapatan Sekolah",
      value: summary.school_revenue,
      note: "SPP dan pembayaran lainnya pada periode aktif.",
    },
    {
      key: "spp",
      title: "SPP Terkumpul",
      value: summary.spp_collected,
      note: `${spp.paid_students_current_month || 0} siswa lunas ${meta.current_month_label || "bulan ini"}.`,
    },
    {
      key: "savings",
      title: "Saldo Tabungan",
      value: summary.savings_balance,
      note: `${savings.transaction_count || 0} transaksi tabungan.`,
    },
    {
      key: "cash",
      title: "Saldo Kas Kelas",
      value: summary.class_cash_balance,
      note: `${classCash.transaction_count || 0} transaksi kas kelas.`,
    },
  ];

  return (
    <Space vertical size={18} style={{ width: "100%" }}>
      <FinanceDashboardHero
        meta={meta}
        summary={summary}
        spp={spp}
        others={others}
        isMobile={isMobile}
      />

      {showHomebaseFilter ? (
        <Space
          wrap
          align='center'
          size={12}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Text type='secondary'>
            Filter dashboard berdasarkan satuan aktif.
          </Text>
          <Select
            allowClear
            placeholder='Semua satuan'
            style={{ width: isMobile ? "100%" : 280 }}
            value={selectedHomebaseId}
            onChange={setSelectedHomebaseId}
            options={availableHomebases.map((item) => ({
              value: item.homebase_id,
              label: item.homebase_name,
            }))}
          />
        </Space>
      ) : null}

      <Tabs
        size={isMobile ? "small" : "middle"}
        tabBarGutter={isMobile ? 16 : 24}
        items={[
          {
            key: "overview",
            label: "Ringkasan",
            children: (
              <FinanceDashboardOverviewTab
                summaryCards={summaryCards}
                summary={summary}
                meta={meta}
                spp={spp}
              />
            ),
          },
          {
            key: "units",
            label: `Satuan (${homebases.length})`,
            children: (
              <FinanceDashboardUnitsTab
                meta={meta}
                homebases={homebases}
                availableHomebases={availableHomebases}
              />
            ),
          },
          {
            key: "activity",
            label: `Aktivitas (${recentTransactions.length})`,
            children: (
              <FinanceDashboardActivityTab
                recentTransactions={recentTransactions}
                priorities={priorities}
              />
            ),
          },
        ]}
      />

      <Text type='secondary'>
        Data dashboard dibatasi pada periode aktif dan dipisah per tab agar lebih
        mudah dikelola.
      </Text>
    </Space>
  );
};

export default FinanceDashPage;
