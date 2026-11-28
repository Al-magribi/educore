import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  FileText,
  FolderTree,
  ListOrdered,
  NotebookPen,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import PointRuleStats from "../components/PointRuleStats";
import PointRuleToolbar from "../components/PointRuleToolbar";
import PointRuleFormDrawer from "../components/PointRuleFormDrawer";
import PointRuleTable from "../components/PointRuleTable";
import PointStudentLeaderboard from "../components/PointStudentLeaderboard";
import AdminPointEntryPanel from "../components/AdminPointEntryPanel";
import PointCategoryPanel from "../components/PointCategoryPanel";
import {
  useCreateAdminPointRuleMutation,
  useDeleteAdminPointRuleMutation,
  useGetAdminPointCategoriesQuery,
  useGetAdminPointMetaQuery,
  useGetAdminPointRulesQuery,
  useGetAdminPointStudentsSummaryQuery,
  useUpdateAdminPointConfigMutation,
  useUpdateAdminPointRuleMutation,
} from "../../../../service/lms/ApiPoint";

import { museColors, museRadius, museShadow } from "../../../../config/theme";
import { IconBox, PageTabs } from "../../../../components/ui/muse";
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;



const emptyCardStyle = {
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
};


const settingCardStyle = {
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
};

const AdminPointView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [search, setSearch] = useState("");
  const [pointType, setPointType] = useState("");
  const [isActive, setIsActive] = useState("");
  const [categoryId, setCategoryId] = useState("");
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
    categoryId,
  });
  const { data: categoriesRes } = useGetAdminPointCategoriesQuery(
    { periodeId: activePeriode?.id },
    { skip: !activePeriode?.id },
  );
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
  const categories = useMemo(
    () => categoriesRes?.data || rulesRes?.meta?.categories || [],
    [categoriesRes?.data, rulesRes?.meta?.categories],
  );
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
          category_id: values.category_id,
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
          category_id: values.category_id,
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
        "Kelola daftar rule penghargaan dan pelanggaran yang dipakai admin dan kesiswaan saat mencatat poin siswa.",
    },
    categories: {
      title: "Kategori Poin",
      description:
        "Kelompokkan rule seperti Kehadiran atau Kepribadian untuk penghargaan dan pelanggaran.",
    },
    entries: {
      title: "Input Poin Siswa",
      description:
        "Berikan, ubah, atau hapus poin siswa. Hanya admin dan kesiswaan yang memiliki wewenang ini.",
    },
    summary: {
      title: "Rangkuman Poin Siswa",
      description:
        "Pantau urutan siswa berdasarkan poin tertinggi dengan tie-break tingkat dan kelas yang konsisten.",
    },
  };

  const tabItems = [
    {
      key: "categories",
      description: tabSummary.categories.description,
      label: "Kategori",
      icon: <FolderTree />,
      render: () => (
        <motion.div
          key='admin-point-categories'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          {!activePeriode && !isBusy ? (
            <Card style={emptyCardStyle} styles={{ body: { padding: 28 } }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description='Aktifkan periode sekolah terlebih dahulu sebelum membuat kategori poin.'
              />
            </Card>
          ) : (
            <PointCategoryPanel
              categories={categories}
              periodeId={activePeriode?.id}
              isMobile={isMobile}
            />
          )}
        </motion.div>
      ),
    },
    {
      key: "rules",
      description: tabSummary.rules.description,
      label: "Peraturan",
      icon: <FileText />,
      render: () => (
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
            categoryId={categoryId}
            categories={categories}
            onSearchChange={setSearch}
            onPointTypeChange={setPointType}
            onStatusChange={setIsActive}
            onCategoryChange={setCategoryId}
            onCreate={handleCreate}
            isMobile={isMobile}
          />

          {!activePeriode && !isBusy ? (
            <Card style={emptyCardStyle} styles={{ body: { padding: 28 } }}>
              <Flex vertical align='center' gap={12}>
                <Title level={4} style={{ margin: 0 }}>
                  Periode aktif belum tersedia
                </Title>
                <Text style={{ color: museColors.muted, textAlign: "center" }}>
                  Aktifkan periode sekolah terlebih dahulu sebelum membuat rule
                  poin penghargaan dan pelanggaran.
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
      key: "entries",
      description: tabSummary.entries.description,
      label: "Input Poin",
      icon: <NotebookPen />,
      render: () => (
        <AdminPointEntryPanel
          isMobile={isMobile}
          activePeriode={activePeriode}
        />
      ),
    },
    {
      key: "summary",
      description: tabSummary.summary.description,
      label: "Rangkuman",
      icon: <ListOrdered />,
      render: () => (
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
                <IconBox icon={<SlidersHorizontal size={20} />} size={40} tone="primarySoft" />
                <div>
                  <Text strong style={{ color: museColors.text, display: "block" }}>
                    Tampilkan Akumulasi Poin
                  </Text>
                  <Text style={{ color: museColors.muted }}>
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
                <Text style={{ color: showBalance ? museColors.primary : museColors.muted }}>
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
      <PageTabs
        title='Kelola Poin Peraturan'
        description='Susun rule poin, lalu berikan prestasi dan pelanggaran kepada siswa. Hanya admin dan kesiswaan yang dapat menambah atau mengubah poin.'
        items={tabItems}
        extra={
          <>
            <Tag>{activePeriode?.name || "Periode belum aktif"}</Tag>
            <Button type='primary' icon={<Plus size={16} />} onClick={handleCreate}>
              Tambah Rule Baru
            </Button>
          </>
        }
      />

      <PointRuleFormDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        initialValues={selectedRule}
        submitting={submitting}
        categories={categories}
      />
    </>
  );
};

export default AdminPointView;
