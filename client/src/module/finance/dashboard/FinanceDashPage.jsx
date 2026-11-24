import { Alert, Button, Flex, Grid, Select, Skeleton, Tabs } from "antd";
import { Building2, LayoutDashboard, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { MuseCard } from "../../../components/ui/muse";
import { useGetFinanceDashboardQuery } from "../../../service/finance/ApiDash";
import FinanceDashboardActivityTab from "./FinanceDashboardActivityTab";
import FinanceDashboardHero from "./FinanceDashboardHero";
import FinanceDashboardOverviewTab from "./FinanceDashboardOverviewTab";
import FinanceDashboardUnitsTab from "./FinanceDashboardUnitsTab";

const { useBreakpoint } = Grid;
const TAB_KEYS = ["overview", "units", "activity"];

const FinanceDashPage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedHomebaseId, setSelectedHomebaseId] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = TAB_KEYS.includes(requestedTab) ? requestedTab : "overview";
  const handleTabChange = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next, { replace: true });
  };
  const queryParams = useMemo(
    () =>
      selectedHomebaseId ? { homebase_id: selectedHomebaseId } : undefined,
    [selectedHomebaseId],
  );
  const { data, isLoading, error, refetch } =
    useGetFinanceDashboardQuery(queryParams);

  const availableHomebases =
    data?.meta?.available_homebases || data?.homebases || [];

  useEffect(() => {
    const list = data?.meta?.available_homebases || [];
    if (list.length === 1) {
      const onlyId = Number(list[0].homebase_id);
      setSelectedHomebaseId((prev) =>
        Number(prev) === onlyId ? prev : onlyId,
      );
      return;
    }

    if (list.length > 1 && selectedHomebaseId != null) {
      const stillValid = list.some(
        (item) => Number(item.homebase_id) === Number(selectedHomebaseId),
      );
      if (!stillValid) {
        setSelectedHomebaseId(undefined);
      }
    }
  }, [data?.meta?.available_homebases, selectedHomebaseId]);

  if (isLoading && !data) {
    return (
      <Flex vertical gap={24}>
        <Skeleton active title paragraph={{ rows: 1 }} />
        <MuseCard>
          <Skeleton active paragraph={{ rows: 6 }} />
        </MuseCard>
      </Flex>
    );
  }

  if (error && !data) {
    return (
      <MuseCard>
        <Alert
          type='error'
          showIcon
          title='Dashboard keuangan gagal dimuat'
          description={
            error?.data?.message ||
            "Data dashboard tidak dapat diambil dari server."
          }
          action={
            <Button size='small' onClick={refetch}>
              Muat ulang
            </Button>
          }
        />
      </MuseCard>
    );
  }

  const meta = data?.meta || {};
  const summary = data?.summary || {};
  const spp = data?.spp || {};
  const expense = data?.expense || {};
  const priorities = data?.priorities || [];
  const recentTransactions = data?.recent_transactions || [];
  const homebases = data?.homebases || [];
  const showHomebaseFilter = availableHomebases.length > 1;

  const feeIncome = Number(
    summary.fee_income_total ?? summary.school_revenue ?? 0,
  );
  const expenseGrand = Number(summary.expense_grand_total ?? 0);
  const netBalance = feeIncome - expenseGrand;

  const summaryCards = [
    {
      key: "fee_income_total",
      title: "Pendapatan Fee",
      value: feeIncome,
      note: "Kas masuk SPP + pembayaran lainnya (confirmed/paid) pada periode aktif.",
    },
    {
      key: "expense_grand_total",
      title: "Total Pengeluaran",
      value: expenseGrand,
      note: "Pengeluaran operasional + honorarium terkunci. Draft honorarium tidak termasuk.",
    },
    {
      key: "net_balance",
      title: "Saldo Bersih",
      value: netBalance,
      note: "Pendapatan fee dikurangi total pengeluaran. Draft honorarium tidak mengurangi saldo.",
      signColored: true,
    },
    {
      key: "fee_remaining_total",
      title: "Sisa Tagihan",
      value: summary.fee_remaining_total,
      note: `Outstanding SPP ${meta.current_month_label || "bulan ini"} + sisa pembayaran lainnya.`,
    },
    {
      key: "unpaid_student_count",
      title: "Siswa Belum Lunas",
      value: summary.unpaid_student_count ?? spp.unpaid_students_current_month,
      note: `Jumlah siswa yang belum lunas SPP ${meta.current_month_label || "bulan ini"}.`,
      isCount: true,
    },
  ];

  const tabLabel = (label, icon) => (
    <Flex align='center' gap={6} style={{ whiteSpace: "nowrap" }}>
      {icon}
      <span>{label}</span>
    </Flex>
  );

  const homebaseFilter = showHomebaseFilter ? (
    <Select
      allowClear
      aria-label='Filter satuan'
      placeholder='Semua satuan'
      suffixIcon={<Building2 size={14} />}
      style={{ width: isMobile ? "100%" : 260 }}
      value={selectedHomebaseId}
      onChange={setSelectedHomebaseId}
      options={availableHomebases.map((item) => ({
        value: item.homebase_id,
        label: item.homebase_name,
      }))}
    />
  ) : null;

  return (
    <Flex vertical gap={isMobile ? 16 : 24} style={{ width: "100%", minWidth: 0 }}>
      <FinanceDashboardHero meta={meta} spp={spp} extra={homebaseFilter} />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        size={isMobile ? "small" : "middle"}
        items={[
          {
            key: "overview",
            label: tabLabel("Ringkasan", <LayoutDashboard size={14} />),
            children: (
              <FinanceDashboardOverviewTab
                summaryCards={summaryCards}
                summary={summary}
                meta={meta}
                spp={spp}
                expense={expense}
              />
            ),
          },
          {
            key: "units",
            label: tabLabel(`Satuan (${homebases.length})`, <Building2 size={14} />),
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
            label: tabLabel(`Aktivitas (${recentTransactions.length})`, <Sparkles size={14} />),
            children: (
              <FinanceDashboardActivityTab
                recentTransactions={recentTransactions}
                priorities={priorities}
              />
            ),
          },
        ]}
      />
    </Flex>
  );
};

export default FinanceDashPage;
