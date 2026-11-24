import { useState } from "react";
import {
  Alert,
  App,
  Empty,
  Flex,
  Form,
  Grid,
  List,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import { CheckCircle2, ListChecks, Target as TargetIcon } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { MuseCard, StatCard } from "../../../components/ui/muse";
import { DataListCard, EditDeleteActions } from "../../../components/ui/muse/DataSection";
import { museRadius } from "../../../config/theme";
import {
  useCreateTargetPlanMutation,
  useDeleteTargetPlanMutation,
  useGetTargetOptionsQuery,
  useGetTargetPlansQuery,
  useUpdateTargetPlanMutation,
} from "../../../service/tahfiz/ApiTarget";
import TargetPlanDrawer from "./TargetPlanDrawer";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const normalizeToNull = (value) =>
  value === undefined || value === null || value === "" ? null : value;

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
  if (value === null || value === undefined || value === "") return [];
  return [value];
};

const Target = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [form] = Form.useForm();
  const formHomebaseId = Form.useWatch("homebase_id", form);

  const [homebaseId, setHomebaseId] = useState();
  const [periodeId, setPeriodeId] = useState();
  const [gradeId, setGradeId] = useState();
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const optionsQuery = useGetTargetOptionsQuery({ homebase_id: homebaseId });
  const selectedHomebaseId = homebaseId;
  const formOptionsQuery = useGetTargetOptionsQuery(
    { homebase_id: formHomebaseId ?? selectedHomebaseId },
    { skip: !drawerOpen },
  );
  const plansQuery = useGetTargetPlansQuery({
    homebase_id: selectedHomebaseId,
    periode_id: periodeId,
    grade_id: gradeId,
    search: searchValue,
  });

  const [createPlan, { isLoading: creating }] = useCreateTargetPlanMutation();
  const [updatePlan, { isLoading: updating }] = useUpdateTargetPlanMutation();
  const [deletePlan, { isLoading: deleting }] = useDeleteTargetPlanMutation();

  const homebaseOptions = (optionsQuery.data?.homebases || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const periodeOptions = (optionsQuery.data?.periodes || []).map((item) => ({
    value: item.id,
    label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
  }));
  const gradeOptions = (optionsQuery.data?.grades || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const juzOptions = (optionsQuery.data?.juz || []).map((item) => ({
    value: item.id,
    label:
      item.line_count != null
        ? `Juz ${item.number} (${item.line_count} baris)`
        : `Juz ${item.number}`,
  }));
  const surahOptions = (optionsQuery.data?.surah || []).map((item) => ({
    value: item.id,
    label: `${item.number}. ${item.name_latin}`,
    total_ayat: item.total_ayat,
  }));

  const formPeriodeOptions = (formOptionsQuery.data?.periodes || []).map(
    (item) => ({
      value: item.id,
      label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
    }),
  );
  const formGradeOptions = (formOptionsQuery.data?.grades || []).map(
    (item) => ({
      value: item.id,
      label: item.name,
    }),
  );

  const itemLabel = (item) => {
    if (item.target_type === "juz") {
      const suffix =
        item.juz_line_count != null ? ` (${item.juz_line_count} baris)` : "";
      return `Juz ${item.juz_number || "-"}${suffix}`;
    }

    const surahName = item.surah_name_latin || "Surah";
    const surahNumber = item.surah_number || "-";
    if (item.start_ayat && item.end_ayat) {
      return `${surahNumber}. ${surahName} (${item.start_ayat}-${item.end_ayat})`;
    }
    return `${surahNumber}. ${surahName}`;
  };

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue({
      homebase_id: selectedHomebaseId ?? null,
      is_active: true,
      items: [{ target_type: "juz", is_mandatory: true }],
    });
  };

  const openCreate = () => {
    setEditingPlan(null);
    resetForm();
    setDrawerOpen(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    form.setFieldsValue({
      homebase_id: plan.homebase_id ?? null,
      periode_id: plan.periode_id,
      grade_id: plan.grade_id,
      title: plan.title,
      notes: plan.notes,
      is_active: plan.is_active,
      items: (plan.items || []).map((item) => ({
        target_type: item.target_type,
        juz_ids: item.target_type === "juz" ? toArray(item.juz_id) : [],
        surah_ids: item.target_type === "surah" ? toArray(item.surah_id) : [],
        is_mandatory: item.is_mandatory !== false,
        notes: item.notes,
      })),
    });
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deletePlan(id).unwrap();
      message.success("Target plan berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus target plan.");
    }
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = async (values) => {
    if (!values.items || !values.items.length) {
      message.warning("Minimal 1 item target wajib ditambahkan.");
      return;
    }

    const normalizedItems = (values.items || []).flatMap((item) => {
      const selectedIds =
        item.target_type === "juz" ? toArray(item.juz_ids) : toArray(item.surah_ids);

      return selectedIds.map((id) => ({
        target_type: item.target_type,
        juz_id: item.target_type === "juz" ? normalizeToNull(id) : null,
        surah_id: item.target_type === "surah" ? normalizeToNull(id) : null,
        start_ayat: null,
        end_ayat: null,
        is_mandatory: item.is_mandatory !== false,
        notes: item.notes?.trim() || null,
      }));
    });

    if (!normalizedItems.length) {
      message.warning("Pilih minimal 1 juz atau surah.");
      return;
    }

    const payload = {
      homebase_id: normalizeToNull(values.homebase_id),
      periode_id: values.periode_id,
      grade_id: values.grade_id,
      title: values.title?.trim() || null,
      notes: values.notes?.trim() || null,
      is_active: values.is_active !== false,
      items: normalizedItems.map((item, index) => ({
        ...item,
        order_no: index + 1,
      })),
    };

    try {
      if (editingPlan) {
        await updatePlan({ id: editingPlan.id, ...payload }).unwrap();
        message.success("Target plan berhasil diperbarui.");
      } else {
        await createPlan(payload).unwrap();
        message.success("Target plan berhasil dibuat.");
      }
      setDrawerOpen(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan target plan.");
    }
  };

  const renderItemTags = (items, withMandatory = false) => (
    <Flex gap={6} wrap>
      {items.map((item) => (
        <Tag
          key={item.id}
          color={item.target_type === "juz" ? "gold" : "blue"}
          style={{ marginInlineEnd: 0 }}
        >
          {itemLabel(item)}
          {withMandatory ? (item.is_mandatory ? " · Wajib" : " · Opsional") : ""}
        </Tag>
      ))}
    </Flex>
  );

  const renderStatus = (active) => (
    <Tag color={active ? "success" : "default"} style={{ marginInlineEnd: 0 }}>
      {active ? "Aktif" : "Nonaktif"}
    </Tag>
  );

  const renderActions = (record) => (
    <EditDeleteActions
      onEdit={() => openEdit(record)}
      onDelete={() => handleDelete(record.id)}
      deleteTitle={`Hapus ${record.title || "target plan"}?`}
      deleteDescription='Target beserta semua item di dalamnya akan terhapus permanen.'
      deleting={deleting}
    />
  );

  const columns = [
    {
      title: "TARGET PLAN",
      key: "target_plan",
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.title || "Tanpa judul"}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {[record.homebase_name || "Semua satuan", record.periode_name, record.grade_name]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </div>
      ),
    },
    {
      title: "ITEM TARGET",
      key: "items",
      render: (_, record) => {
        const items = record.items || [];
        if (!items.length) return <Text type='secondary'>Belum ada item</Text>;
        return (
          <Flex gap={6} wrap style={{ whiteSpace: "normal", maxWidth: 420 }}>
            {renderItemTags(items.slice(0, 3))}
            {items.length > 3 ? (
              <Tag style={{ marginInlineEnd: 0 }}>+{items.length - 3} item</Tag>
            ) : null}
          </Flex>
        );
      },
    },
    {
      title: "STATUS",
      dataIndex: "is_active",
      width: 120,
      render: renderStatus,
    },
    {
      title: "AKSI",
      key: "action",
      width: 110,
      align: "right",
      render: (_, record) => <Flex justify='flex-end'>{renderActions(record)}</Flex>,
    },
  ];

  const summary = plansQuery.data?.summary || {};
  const summaryCards = [
    { title: "Total Plan", value: summary.total_plans || 0, icon: <TargetIcon size={24} />, tone: "primary" },
    { title: "Plan Aktif", value: summary.active_plans || 0, icon: <CheckCircle2 size={24} />, tone: "success" },
    { title: "Total Item Target", value: summary.total_items || 0, icon: <ListChecks size={24} />, tone: "accent" },
  ];

  const plans = plansQuery.data?.plans || [];
  const isListLoading = plansQuery.isLoading || plansQuery.isFetching;
  const hasFilter = Boolean(selectedHomebaseId || periodeId || gradeId || searchValue);
  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        hasFilter
          ? "Tidak ada target plan yang cocok dengan filter."
          : "Belum ada target plan. Buat target pertama untuk tingkat dan periode tertentu."
      }
    />
  );

  const filterControls = (
    <>
      <Select
        aria-label='Filter satuan'
        allowClear
        value={selectedHomebaseId}
        placeholder='Semua satuan'
        options={homebaseOptions}
        virtual={false}
        style={{ width: isMobile ? "100%" : 170 }}
        onChange={(value) => {
          setHomebaseId(value);
          setPeriodeId(undefined);
          setGradeId(undefined);
        }}
        loading={optionsQuery.isFetching}
      />
      <Select
        aria-label='Filter periode'
        allowClear
        value={periodeId}
        placeholder='Semua periode'
        options={periodeOptions}
        virtual={false}
        style={{ width: isMobile ? "100%" : 170 }}
        onChange={setPeriodeId}
        loading={optionsQuery.isFetching}
      />
      <Select
        aria-label='Filter tingkat'
        allowClear
        value={gradeId}
        placeholder='Semua tingkat'
        options={gradeOptions}
        virtual={false}
        style={{ width: isMobile ? "100%" : 150 }}
        onChange={setGradeId}
        loading={optionsQuery.isFetching}
      />
    </>
  );

  return (
    <Flex vertical gap={isMobile ? 16 : 24} style={{ minWidth: 0 }}>
      <PageHeader
        title='Target Tahfiz'
        description='Atur target hafalan per periode, tingkat, dan satuan dengan kombinasi item juz maupun surah.'
      />

      {optionsQuery.isError || plansQuery.isError ? (
        <Alert
          type='error'
          showIcon
          title='Gagal memuat data target tahfiz'
          description={
            plansQuery.error?.data?.message ||
            optionsQuery.error?.data?.message ||
            "Muat ulang halaman atau periksa koneksi server."
          }
        />
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: isMobile ? 16 : 24,
        }}
      >
        {summaryCards.map((item) =>
          plansQuery.isLoading ? (
            <MuseCard key={item.title}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </MuseCard>
          ) : (
            <StatCard key={item.title} {...item} />
          ),
        )}
      </div>

      <DataListCard
        title='Daftar Target Plan'
        icon={<TargetIcon size={18} />}
        count={plans.length}
        unit='plan'
        searchProps={{
          placeholder: "Cari judul target",
          value: searchInput,
          onChange: (event) => {
            const { value } = event.target;
            setSearchInput(value);
            if (!value) setSearchValue("");
          },
          onSearch: (value) => setSearchValue(value.trim()),
        }}
        extra={filterControls}
        onAdd={openCreate}
        addLabel='Buat Target'
      >
        {isMobile ? (
          <List
            loading={isListLoading}
            dataSource={plans}
            locale={{ emptyText: emptyNode }}
            pagination={plans.length > 8 ? { pageSize: 8, size: "small", align: "center" } : false}
            style={{ padding: 12 }}
            renderItem={(record) => (
              <div
                style={{
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: museRadius.item,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <Flex justify='space-between' align='flex-start' gap={8}>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ display: "block" }}>
                      {record.title || "Tanpa judul"}
                    </Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {[record.periode_name, record.grade_name].filter(Boolean).join(" · ")}
                    </Text>
                  </div>
                  <Flex gap={4}>{renderActions(record)}</Flex>
                </Flex>
                <Flex gap={6} wrap style={{ marginTop: 8 }}>
                  {renderStatus(record.is_active)}
                  {renderItemTags((record.items || []).slice(0, 3))}
                  {(record.items || []).length > 3 ? (
                    <Tag style={{ marginInlineEnd: 0 }}>+{record.items.length - 3} item</Tag>
                  ) : null}
                </Flex>
              </div>
            )}
          />
        ) : (
          <Table
            rowKey='id'
            loading={isListLoading}
            dataSource={plans}
            columns={columns}
            pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
            locale={{ emptyText: emptyNode }}
            scroll={{ x: true }}
            expandable={{
              expandedRowRender: (record) => renderItemTags(record.items || [], true),
              rowExpandable: (record) => (record.items || []).length > 0,
            }}
          />
        )}
      </DataListCard>

      <TargetPlanDrawer
        isMobile={isMobile}
        drawerOpen={drawerOpen}
        closeDrawer={closeDrawer}
        editingPlan={editingPlan}
        form={form}
        handleSubmit={handleSubmit}
        homebaseOptions={homebaseOptions}
        formPeriodeOptions={formPeriodeOptions}
        formGradeOptions={formGradeOptions}
        formOptionsQuery={formOptionsQuery}
        juzOptions={juzOptions}
        surahOptions={surahOptions}
        saving={creating || updating}
      />
    </Flex>
  );
};

export default Target;
