import React, { useMemo, useState } from "react";
import {
  Card,
  Empty,
  Flex,
  Grid,
  Skeleton,
  Space,
  Switch,
  Tabs,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import { FileText, ListOrdered, SlidersHorizontal } from "lucide-react";
import PointAdminHero from "../components/PointAdminHero";
import PointRuleStats from "../components/PointRuleStats";
import PointRuleToolbar from "../components/PointRuleToolbar";
import PointRuleFormDrawer from "../components/PointRuleFormDrawer";
import PointRuleTable from "../components/PointRuleTable";
import PointStudentLeaderboard from "../components/PointStudentLeaderboard";
import {
  useCreateAdminPointRuleMutation,
  useDeleteAdminPointRuleMutation,
  useGetAdminPointMetaQuery,
  useGetAdminPointRulesQuery,
  useGetAdminPointStudentsSummaryQuery,
  useUpdateAdminPointConfigMutation,
  useUpdateAdminPointRuleMutation,
} from "../../../../service/lms/ApiPoint";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const emptyCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const tabsCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const settingCardStyle = {
  borderRadius: 20,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
};

const AdminPointView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [activeTab, setActiveTab] = useState("rules");
  const [search, setSearch] = useState("");
  const [pointType, setPointType] = useState("");
  const [isActive, setIsActive] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);

  const { data: metaRes, isLoading: isMetaLoading } =
    useGetAdminPointMetaQuery();
  const activePeriode = metaRes?.data?.active_periode || null;
  const pointConfig = metaRes?.data?.point_config || null;

  const {
    data: rulesRes,
    isLoading: isRulesLoading,
    isFetching: isRulesFetching,
  } = useGetAdminPointRulesQuery({
    periodeId: activePeriode?.id,
    search,
    pointType,
    isActive,
  });
  const {
    data: studentSummaryRes,
    isLoading: isStudentsLoading,
    isFetching: isStudentsFetching,
  } = useGetAdminPointStudentsSummaryQuery(
    {
      periodeId: activePeriode?.id,
    },
    { skip: !activePeriode?.id },
  );

  const [createRule, { isLoading: isCreating }] =
    useCreateAdminPointRuleMutation();
  const [updateRule, { isLoading: isUpdating }] =
    useUpdateAdminPointRuleMutation();
  const [updatePointConfig, { isLoading: isUpdatingConfig }] =
    useUpdateAdminPointConfigMutation();
  const [deleteRule] = useDeleteAdminPointRuleMutation();

  const ruleStats = useMemo(
    () => rulesRes?.meta?.stats || metaRes?.data?.stats || {},
    [metaRes?.data?.stats, rulesRes?.meta?.stats],
  );

  const rules = useMemo(() => rulesRes?.data || [], [rulesRes?.data]);
  const studentSummary = useMemo(
    () => studentSummaryRes?.data || [],
    [studentSummaryRes?.data],
  );
  const showBalance =
    studentSummaryRes?.meta?.point_config?.show_balance ??
    pointConfig?.show_balance ??
    false;
  const allowHomeroomManage =
    studentSummaryRes?.meta?.point_config?.allow_homeroom_manage ??
    pointConfig?.allow_homeroom_manage ??
    true;

  const handleCreate = () => {
    setSelectedRule(null);
    setDrawerOpen(true);
  };

  const handleEdit = (rule) => {
    setSelectedRule(rule);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedRule(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (values?.id) {
        const res = await updateRule({
          id: values.id,
          name: values.name,
          point_type: values.point_type,
          point_value: values.point_value,
          description: values.description,
          is_active: values.is_active,
        }).unwrap();
        message.success(res?.message || "Rule poin berhasil diperbarui.");
      } else {
        const res = await createRule({
          periode_id: activePeriode?.id,
          name: values.name,
          point_type: values.point_type,
          point_value: values.point_value,
          description: values.description,
          is_active: values.is_active,
        }).unwrap();
        message.success(res?.message || "Rule poin berhasil ditambahkan.");
      }

      handleCloseDrawer();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan rule poin.");
    }
  };

  const handleDelete = async (rule) => {
    try {
      const res = await deleteRule(rule.id).unwrap();
      message.success(res?.message || "Rule poin berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus rule poin.");
    }
  };

  const handleToggleShowBalance = async (checked) => {
    try {
      const res = await updatePointConfig({
        periode_id: activePeriode?.id,
        show_balance: checked,
        allow_homeroom_manage: allowHomeroomManage,
      }).unwrap();
      message.success(
        res?.message ||
          `Tampilan poin bersih ${checked ? "diaktifkan" : "dinonaktifkan"}.`,
      );
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal memperbarui pengaturan poin.",
      );
    }
  };

  const isBusy = isMetaLoading || isRulesLoading;
  const submitting = isCreating || isUpdating;
  const tabSummary = {
    rules: {
      title: "Peraturan Poin",
      description:
        "Kelola daftar rule prestasi dan pelanggaran yang akan dipakai wali kelas saat mencatat poin siswa.",
    },
    summary: {
      title: "Rangkuman Poin Siswa",
      description:
        "Pantau urutan siswa berdasarkan poin tertinggi dengan tie-break tingkat dan kelas yang konsisten.",
    },
  };

  const tabItems = [
    {
      key: "rules",
      label: (
        <Space size={8}>
          <FileText size={15} />
          Peraturan
        </Space>
      ),
      children: (
        <motion.div
          key='admin-point-rules'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {isBusy ? (
            <Card style={emptyCardStyle}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ) : (
            <PointRuleStats stats={ruleStats} isMobile={isMobile} />
          )}

          <PointRuleToolbar
            search={search}
            pointType={pointType}
            isActive={isActive}
            onSearchChange={setSearch}
            onPointTypeChange={setPointType}
            onStatusChange={setIsActive}
            onCreate={handleCreate}
            isMobile={isMobile}
          />

          {!activePeriode && !isBusy ? (
            <Card style={emptyCardStyle} styles={{ body: { padding: 28 } }}>
              <Flex vertical align='center' gap={12}>
                <Title level={4} style={{ margin: 0 }}>
                  Periode aktif belum tersedia
                </Title>
                <Text style={{ color: "#64748b", textAlign: "center" }}>
                  Aktifkan periode sekolah terlebih dahulu sebelum membuat rule
                  poin reward dan punishment.
                </Text>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </Flex>
            </Card>
          ) : (
            <PointRuleTable
              dataSource={rules}
              loading={isRulesLoading || isRulesFetching}
              isMobile={isMobile}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </motion.div>
      ),
    },
    {
      key: "summary",
      label: (
        <Space size={8}>
          <ListOrdered size={15} />
          Rangkuman
        </Space>
      ),
      children: (
        <motion.div
          key='admin-point-summary'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <Card style={settingCardStyle} styles={{ body: { padding: 18 } }}>
            <Flex
              vertical={isMobile}
              justify='space-between'
              align={isMobile ? "flex-start" : "center"}
              gap={14}
            >
              <Space align='start' size={12}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <SlidersHorizontal size={18} />
                </span>
                <div>
                  <Text strong style={{ color: "#0f172a", display: "block" }}>
                    Tampilkan Akumulasi Poin
                  </Text>
                  <Text style={{ color: "#64748b" }}>
                    Saat aktif, Poin prestasi dikurangi pelanggaran. Saat
                    nonaktif, akumulasi prestasi dan pelanggaran.
                  </Text>
                </div>
              </Space>

              <Flex
                align='center'
                gap={10}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                <Text style={{ color: showBalance ? "#1d4ed8" : "#64748b" }}>
                  {showBalance ? "On" : "Off"}
                </Text>
                <Switch
                  checked={showBalance}
                  loading={isUpdatingConfig}
                  onChange={handleToggleShowBalance}
                  disabled={!activePeriode}
                />
              </Flex>
            </Flex>
          </Card>

          <PointStudentLeaderboard
            dataSource={studentSummary}
            loading={isStudentsLoading || isStudentsFetching}
            isMobile={isMobile}
            showBalance={showBalance}
          />
        </motion.div>
      ),
    },
  ];

  return (
    <>
      <motion.div
        initial='hidden'
        animate='show'
        variants={containerVariants}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: isMobile ? 0 : "0 4px 12px",
        }}
      >
        <motion.div variants={itemVariants}>
          <PointAdminHero
            isMobile={isMobile}
            activePeriode={activePeriode}
            pointConfig={pointConfig}
            onCreate={handleCreate}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card
            style={tabsCardStyle}
            styles={{ body: { padding: isMobile ? 16 : 20 } }}
          >
            <Flex
              vertical={isMobile}
              justify='space-between'
              align={isMobile ? "flex-start" : "center"}
              gap={12}
              style={{ marginBottom: 14 }}
            >
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {tabSummary[activeTab].title}
                </Title>
                <Text style={{ color: "#64748b" }}>
                  {tabSummary[activeTab].description}
                </Text>
              </div>
            </Flex>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              size={isMobile ? "middle" : "large"}
              tabBarGutter={8}
              animated
            />
          </Card>
        </motion.div>
      </motion.div>

      <PointRuleFormDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        initialValues={selectedRule}
        submitting={submitting}
      />
    </>
  );
};

export default AdminPointView;
