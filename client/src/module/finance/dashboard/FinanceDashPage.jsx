import {
  Alert,
  Button,
  Card,
  Flex,
  Grid,
  Select,
  Space,
  Tabs,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { Building2, LayoutDashboard, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LoadApp } from "../../../components";
import { useGetFinanceDashboardQuery } from "../../../service/finance/ApiDash";
import FinanceDashboardActivityTab from "./FinanceDashboardActivityTab";
import FinanceDashboardHero from "./FinanceDashboardHero";
import FinanceDashboardOverviewTab from "./FinanceDashboardOverviewTab";
import FinanceDashboardUnitsTab from "./FinanceDashboardUnitsTab";

const { useBreakpoint } = Grid;
const { Text } = Typography;
const MotionDiv = motion.div;

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.35,
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const tabsVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const FinanceDashPage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedHomebaseId, setSelectedHomebaseId] = useState();
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
    return <LoadApp />;
  }

  if (error && !data) {
    return (
      <Alert
        type='error'
        showIcon
        title='Dashboard keuangan gagal dimuat'
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

  const createTabLabel = (label, icon) => (
    <Flex align='center' gap={isMobile ? 8 : 10}>
      <span
        style={{
          width: isMobile ? 28 : 32,
          height: isMobile ? 28 : 32,
          display: "grid",
          placeItems: "center",
          borderRadius: 10,
          background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148,163,184,0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap" }}>
        {label}
      </span>
    </Flex>
  );

  return (
    <MotionDiv
      initial='hidden'
      animate='visible'
      variants={pageVariants}
      style={{ width: "100%" }}
    >
      <Space
        vertical
        size={isMobile ? 12 : 16}
        style={{ width: "100%", display: "flex" }}
      >
        <MotionDiv variants={sectionVariants}>
          <FinanceDashboardHero meta={meta} spp={spp} isMobile={isMobile} />
        </MotionDiv>

        {showHomebaseFilter ? (
          <MotionDiv variants={sectionVariants}>
            <Card
              variant='borderless'
              style={{
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
              }}
              styles={{ body: { padding: isMobile ? 12 : 14 } }}
            >
              <Flex
                justify='space-between'
                align={isMobile ? "stretch" : "center"}
                vertical={isMobile}
                gap={12}
              >
                <Flex align='center' gap={10}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                      color: "#2563eb",
                      flexShrink: 0,
                    }}
                  >
                    <Building2 size={16} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ display: "block", color: "#0f172a" }}>
                      Filter satuan
                    </Text>
                    {!isMobile ? (
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        Fokuskan dashboard ke satuan tertentu.
                      </Text>
                    ) : null}
                  </div>
                </Flex>
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
              </Flex>
            </Card>
          </MotionDiv>
        ) : null}

        <MotionDiv variants={tabsVariants}>
          <Card
            variant='borderless'
            style={{
              borderRadius: isMobile ? 18 : 22,
              border: "1px solid rgba(148,163,184,0.14)",
              boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
            }}
            styles={{ body: { padding: isMobile ? 10 : 14 } }}
          >
            <Tabs
              size={isMobile ? "small" : "middle"}
              tabBarGutter={isMobile ? 8 : 16}
              tabBarStyle={{
                marginBottom: isMobile ? 12 : 16,
                paddingBottom: 4,
              }}
              items={[
                {
                  key: "overview",
                  label: createTabLabel(
                    "Ringkasan",
                    <LayoutDashboard size={isMobile ? 14 : 15} />,
                  ),
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
                  label: createTabLabel(
                    `Satuan (${homebases.length})`,
                    <Building2 size={isMobile ? 14 : 15} />,
                  ),
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
                  label: createTabLabel(
                    `Aktivitas (${recentTransactions.length})`,
                    <Sparkles size={isMobile ? 14 : 15} />,
                  ),
                  children: (
                    <FinanceDashboardActivityTab
                      recentTransactions={recentTransactions}
                      priorities={priorities}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </MotionDiv>
      </Space>
    </MotionDiv>
  );
};

export default FinanceDashPage;
