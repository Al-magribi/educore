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
import { Building2, LayoutDashboard, RefreshCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

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

  const createTabLabel = (label, icon, caption) => (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148,163,184,0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <Flex vertical gap={0}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: "rgba(100,116,139,0.9)",
              lineHeight: 1.2,
            }}
          >
            {caption}
          </span>
        )}
      </Flex>
    </Flex>
  );

  return (
    <MotionDiv
      initial='hidden'
      animate='visible'
      variants={pageVariants}
      style={{ width: "100%" }}
    >
      <Space vertical size={20} style={{ width: "100%", display: "flex" }}>
        <MotionDiv variants={sectionVariants}>
          <FinanceDashboardHero
            meta={meta}
            summary={summary}
            spp={spp}
            others={others}
            isMobile={isMobile}
          />
        </MotionDiv>

        {showHomebaseFilter ? (
          <MotionDiv variants={sectionVariants}>
            <Card
              variant='borderless'
              style={{
                borderRadius: 24,
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
              }}
              styles={{ body: { padding: isMobile ? 16 : 18 } }}
            >
              <Flex
                justify='space-between'
                align={isMobile ? "stretch" : "center"}
                vertical={isMobile}
                gap={14}
              >
                <div>
                  <Flex align='center' gap={10} style={{ marginBottom: 6 }}>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 14,
                        background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                        color: "#2563eb",
                      }}
                    >
                      <Building2 size={18} />
                    </span>
                    <div>
                      <Text strong style={{ display: "block", color: "#0f172a" }}>
                        Filter Satuan Aktif
                      </Text>
                      <Text type='secondary'>
                        Fokuskan dashboard ke satuan tertentu bila diperlukan.
                      </Text>
                    </div>
                  </Flex>
                </div>
                <Select
                  allowClear
                  placeholder='Semua satuan'
                  size='large'
                  style={{ width: isMobile ? "100%" : 300 }}
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
              borderRadius: 28,
              border: "1px solid rgba(148,163,184,0.14)",
              boxShadow: "0 24px 60px rgba(15,23,42,0.07)",
            }}
            styles={{ body: { padding: isMobile ? 12 : 16 } }}
          >
            <Tabs
              size={isMobile ? "small" : "middle"}
              tabBarGutter={isMobile ? 12 : 18}
              tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
              items={[
                {
                  key: "overview",
                  label: createTabLabel(
                    "Ringkasan",
                    <LayoutDashboard size={16} />,
                    "Kinerja inti dashboard",
                  ),
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
                  label: createTabLabel(
                    `Satuan (${homebases.length})`,
                    <Building2 size={16} />,
                    "Performa per unit",
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
                    <Sparkles size={16} />,
                    "Transaksi terbaru",
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

        <MotionDiv variants={sectionVariants}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={10}
            style={{
              padding: isMobile ? "14px 16px" : "16px 18px",
              borderRadius: 20,
              background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
              border: "1px solid rgba(148,163,184,0.14)",
            }}
          >
            <Text type='secondary'>
              Data dashboard dibatasi pada periode aktif dan dipisah per tab
              agar lebih mudah dipantau oleh tim keuangan.
            </Text>
            <Button
              icon={<RefreshCcw size={16} />}
              onClick={refetch}
              style={{ width: isMobile ? "100%" : "auto" }}
            >
              Segarkan Data
            </Button>
          </Flex>
        </MotionDiv>
      </Space>
    </MotionDiv>
  );
};

export default FinanceDashPage;
