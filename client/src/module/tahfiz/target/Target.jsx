import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  BookOpen,
  CircleDot,
  Layers2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Pencil,
  Target as TargetIcon,
  X,
  ListChecks,
  CheckCircle2,
} from "lucide-react";
import {
  useCreateTargetPlanMutation,
  useDeleteTargetPlanMutation,
  useGetTargetOptionsQuery,
  useGetTargetPlansQuery,
  useUpdateTargetPlanMutation,
} from "../../../service/tahfiz/ApiTarget";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

const normalizeToNull = (value) =>
  value === undefined || value === null || value === "" ? null : value;

const Target = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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

  useEffect(() => {
    const homebases = optionsQuery.data?.homebases || [];
    if (!homebases.length || homebaseId != null) return;

    const sorted = [...homebases].sort((a, b) => Number(a.id) - Number(b.id));
    setHomebaseId(sorted[0]?.id);
  }, [optionsQuery.data?.homebases, homebaseId]);

  useEffect(() => {
    const periodes = optionsQuery.data?.periodes || [];
    if (!periodes.length || periodeId != null) return;

    const activePeriode = periodes.find((item) => item.is_active);
    if (activePeriode) {
      setPeriodeId(activePeriode.id);
    }
  }, [optionsQuery.data?.periodes, periodeId]);

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

  const surahMap = useMemo(() => {
    const map = new Map();
    for (const item of optionsQuery.data?.surah || []) {
      map.set(item.id, item);
    }
    return map;
  }, [optionsQuery.data?.surah]);

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
        juz_id: item.juz_id,
        surah_id: item.surah_id,
        start_ayat: item.start_ayat,
        end_ayat: item.end_ayat,
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

    const payload = {
      homebase_id: normalizeToNull(values.homebase_id),
      periode_id: values.periode_id,
      grade_id: values.grade_id,
      title: values.title?.trim() || null,
      notes: values.notes?.trim() || null,
      is_active: values.is_active !== false,
      items: (values.items || []).map((item, index) => ({
        target_type: item.target_type,
        juz_id: normalizeToNull(item.juz_id),
        surah_id: normalizeToNull(item.surah_id),
        start_ayat: normalizeToNull(item.start_ayat),
        end_ayat: normalizeToNull(item.end_ayat),
        order_no: index + 1,
        is_mandatory: item.is_mandatory !== false,
        notes: item.notes?.trim() || null,
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

  const columns = [
    {
      title: "Target Plan",
      key: "target_plan",
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text strong>{record.title || "Tanpa Judul"}</Text>
          <Text type='secondary'>
            {record.homebase_name || "Semua Satuan"} | {record.periode_name} |{" "}
            {record.grade_name}
          </Text>
        </Space>
      ),
    },
    {
      title: "Item Target",
      key: "items",
      width: 360,
      render: (_, record) => {
        const items = record.items || [];
        if (!items.length) return <Text type='secondary'>Belum ada item</Text>;

        return (
          <Space wrap>
            {items.slice(0, 3).map((item) => (
              <Tag
                key={item.id}
                color={item.target_type === "juz" ? "gold" : "blue"}
              >
                {itemLabel(item)}
              </Tag>
            ))}
            {items.length > 3 ? <Tag>+{items.length - 3} item</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 120,
      render: (active) => (
        <Badge
          color={active ? "#22c55e" : "#94a3b8"}
          text={active ? "Aktif" : "Nonaktif"}
        />
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 140,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            icon={<Pencil size={14} />}
            onClick={() => openEdit(record)}
            size='small'
          >
            Edit
          </Button>
          <Popconfirm
            title='Hapus Target Plan'
            description='Data target beserta item akan terhapus permanen.'
            okText='Hapus'
            cancelText='Batal'
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger size='small' icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (optionsQuery.isError || plansQuery.isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat data target tahfiz.'
        description='Silakan refresh halaman atau cek koneksi server.'
      />
    );
  }

  const summaryCards = [
    {
      key: "total",
      title: "Total Plan",
      value: plansQuery.data?.summary?.total_plans || 0,
      icon: <TargetIcon size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
      color: "#1d4ed8",
    },
    {
      key: "active",
      title: "Plan Aktif",
      value: plansQuery.data?.summary?.active_plans || 0,
      icon: <CheckCircle2 size={18} />,
      bg: "linear-gradient(135deg, #bfdbfe, #dbeafe)",
      color: "#1e40af",
    },
    {
      key: "items",
      title: "Total Item Target",
      value: plansQuery.data?.summary?.total_items || 0,
      icon: <ListChecks size={18} />,
      bg: "linear-gradient(135deg, #e0f2fe, #dbeafe)",
      color: "#0369a1",
    },
  ];

  return (
    <MotionDiv variants={containerVariants} initial='hidden' animate='show'>
      <Space direction='vertical' size={18} style={{ width: "100%" }}>
        <MotionDiv variants={itemVariants}>
          <Card
            style={{
              borderRadius: 26,
              border: "none",
              overflow: "hidden",
              background:
                "radial-gradient(circle at top left, rgba(147,197,253,0.34), transparent 30%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
              boxShadow: "0 26px 54px rgba(15, 23, 42, 0.18)",
            }}
            styles={{ body: { padding: isMobile ? 18 : 24 } }}
          >
            <Space direction='vertical' size={8} style={{ color: "#fff" }}>
              <Space
                size={6}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <TargetIcon size={14} />
                <Text style={{ color: "#e0f2fe", fontWeight: 600 }}>
                  Target Management
                </Text>
              </Space>
              <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: "#fff" }}>
                Manajemen Target Tahfiz
              </Title>
              <Text style={{ color: "rgba(241,245,249,0.88)", maxWidth: 760 }}>
                Atur target hafalan per periode, tingkat, dan satuan dengan
                kombinasi item Juz maupun Surah.
              </Text>
            </Space>
          </Card>
        </MotionDiv>

        <Row gutter={[14, 14]}>
          {summaryCards.map((item) => (
            <Col xs={24} md={8} key={item.key}>
              <MotionDiv variants={itemVariants} style={{ height: "100%" }}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 20,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.07)",
                    height: "100%",
                  }}
                  styles={{ body: { padding: 18 } }}
                >
                  <Space
                    align='start'
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Space direction='vertical' size={4}>
                      <Text type='secondary'>{item.title}</Text>
                      <Title level={3} style={{ margin: 0 }}>
                        {item.value}
                      </Title>
                    </Space>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        background: item.bg,
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </div>
                  </Space>
                </Card>
              </MotionDiv>
            </Col>
          ))}
        </Row>

        <MotionDiv variants={itemVariants}>
          <Card
            style={{
              borderRadius: 24,
              border: "1px solid #e2e8f0",
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
            }}
            styles={{ body: { padding: isMobile ? 14 : 18 } }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} md={6}>
                <Select
                  allowClear
                  value={selectedHomebaseId}
                  placeholder='Filter Satuan'
                  options={homebaseOptions}
                  virtual={false}
                  style={{ width: "100%" }}
                  onChange={(value) => {
                    setHomebaseId(value);
                    setPeriodeId(undefined);
                    setGradeId(undefined);
                  }}
                  loading={optionsQuery.isFetching}
                />
              </Col>
              <Col xs={24} md={6}>
                <Select
                  allowClear
                  value={periodeId}
                  placeholder='Filter Periode'
                  options={periodeOptions}
                  virtual={false}
                  style={{ width: "100%" }}
                  onChange={setPeriodeId}
                  loading={optionsQuery.isFetching}
                />
              </Col>
              <Col xs={24} md={6}>
                <Select
                  allowClear
                  value={gradeId}
                  placeholder='Filter Tingkat'
                  options={gradeOptions}
                  virtual={false}
                  style={{ width: "100%" }}
                  onChange={setGradeId}
                  loading={optionsQuery.isFetching}
                />
              </Col>
              <Col xs={24} md={6}>
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearchInput(value);
                    if (!value) setSearchValue("");
                  }}
                  onPressEnter={() => setSearchValue(searchInput.trim())}
                  placeholder='Cari judul target...'
                  prefix={<Search size={14} color='#1d4ed8' />}
                  suffix={
                    <Button
                      type='text'
                      size='small'
                      icon={<Sparkles size={14} />}
                      onClick={() => setSearchValue(searchInput.trim())}
                    />
                  }
                  allowClear
                />
              </Col>
            </Row>

            <Divider />

            <Flex
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              vertical={isMobile}
              gap={10}
              style={{ marginBottom: 12 }}
            >
              <Text strong>Daftar Target Plan</Text>
              <Button
                type='primary'
                icon={<Plus size={16} />}
                onClick={openCreate}
                style={{ borderRadius: 10 }}
              >
                Buat Target Plan
              </Button>
            </Flex>

            <Table
              rowKey='id'
              loading={plansQuery.isLoading || plansQuery.isFetching}
              dataSource={plansQuery.data?.plans || []}
              columns={columns}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              locale={{ emptyText: <Empty description='Belum ada target plan' /> }}
              scroll={{ x: 920 }}
              expandable={{
                expandedRowRender: (record) => (
                  <Space wrap>
                    {(record.items || []).map((item) => (
                      <Tag
                        key={item.id}
                        color={item.target_type === "juz" ? "gold" : "blue"}
                      >
                        {itemLabel(item)}
                        {item.is_mandatory ? " | Wajib" : " | Opsional"}
                      </Tag>
                    ))}
                  </Space>
                ),
                rowExpandable: (record) => (record.items || []).length > 0,
              }}
            />
          </Card>
        </MotionDiv>
      </Space>

      <Drawer
        title={null}
        width={isMobile ? "100%" : 960}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnHidden
        closable={false}
        styles={{
          body: { padding: 0, background: "#f8fafc" },
          header: { display: "none" },
        }}
      >
        <MotionDiv
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              padding: isMobile ? 18 : 24,
              background:
                "linear-gradient(135deg, rgba(239,246,255,1), rgba(224,242,254,0.98))",
              borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
            }}
          >
            <Flex justify='space-between' align='flex-start' gap={16}>
              <Flex align='flex-start' gap={14}>
                <div
                  style={{
                    width: isMobile ? 50 : 56,
                    height: isMobile ? 50 : 56,
                    borderRadius: 18,
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)",
                    color: "#fff",
                    boxShadow: "0 18px 32px rgba(29, 78, 216, 0.24)",
                    flexShrink: 0,
                  }}
                >
                  <TargetIcon size={24} />
                </div>

                <div>
                  <Flex
                    align={isMobile ? "flex-start" : "center"}
                    vertical={isMobile}
                    gap={10}
                    style={{ marginBottom: 6 }}
                  >
                    <Title level={3} style={{ margin: 0 }}>
                      {editingPlan ? "Edit Target Plan" : "Buat Target Plan"}
                    </Title>
                    <Tag
                      style={{
                        marginInlineEnd: 0,
                        borderRadius: 999,
                        padding: "6px 12px",
                        background: "rgba(3, 105, 161, 0.10)",
                        color: "#0369a1",
                        border: "1px solid rgba(3, 105, 161, 0.16)",
                        fontWeight: 600,
                      }}
                    >
                      Tahfiz Targeting
                    </Tag>
                  </Flex>

                  <Text type='secondary' style={{ display: "block", maxWidth: 620 }}>
                    Susun target plan beserta item Juz atau Surah untuk setiap
                    satuan, periode, dan tingkat dalam satu panel kerja.
                  </Text>
                </div>
              </Flex>

              <Button onClick={closeDrawer} icon={<X size={16} />} style={{ borderRadius: 12 }}>
                Tutup
              </Button>
            </Flex>
          </div>

          <div style={{ padding: isMobile ? 14 : 20, flex: 1, overflow: "auto" }}>
            <Card
              bordered={false}
              style={{ borderRadius: 24, boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)" }}
              styles={{ body: { padding: isMobile ? 14 : 20 } }}
            >
              <Form form={form} layout='vertical' onFinish={handleSubmit}>
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label='Satuan'
                      name='homebase_id'
                      rules={[{ required: true, message: "Satuan wajib dipilih." }]}
                    >
                      <Select
                        placeholder='Pilih satuan'
                        options={homebaseOptions}
                        virtual={false}
                        onChange={() => {
                          form.setFieldsValue({ periode_id: undefined, grade_id: undefined });
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label='Periode'
                      name='periode_id'
                      rules={[{ required: true, message: "Periode wajib dipilih." }]}
                    >
                      <Select
                        options={formPeriodeOptions}
                        virtual={false}
                        placeholder='Pilih periode'
                        loading={formOptionsQuery.isFetching}
                        disabled={!formPeriodeOptions.length}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label='Tingkat'
                      name='grade_id'
                      rules={[{ required: true, message: "Tingkat wajib dipilih." }]}
                    >
                      <Select
                        options={formGradeOptions}
                        virtual={false}
                        placeholder='Pilih tingkat'
                        loading={formOptionsQuery.isFetching}
                        disabled={!formGradeOptions.length}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item label='Judul Plan' name='title'>
                      <Input placeholder='Contoh: Target Tahfiz Kelas 7 Semester Ganjil' />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label='Status Aktif' name='is_active' valuePropName='checked'>
                      <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label='Catatan Plan' name='notes'>
                      <Input.TextArea rows={2} placeholder='Catatan tambahan plan...' />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation='left'>Item Target</Divider>

                <Form.List name='items'>
                  {(fields, { add, remove }) => (
                    <Space direction='vertical' size={12} style={{ width: "100%" }}>
                      {fields.map(({ key, name }, index) => (
                        <Card
                          key={key}
                          style={{
                            borderRadius: 14,
                            border: "1px solid #dbeafe",
                            background:
                              "linear-gradient(180deg, #ffffff 0%, rgba(239,246,255,0.5) 100%)",
                          }}
                          styles={{ body: { padding: 14 } }}
                        >
                          <Row gutter={[12, 12]}>
                            <Col xs={24} md={4}>
                              <Form.Item
                                label={`Item #${index + 1}`}
                                name={[name, "target_type"]}
                                rules={[{ required: true, message: "Pilih tipe target." }]}
                              >
                                <Select
                                  virtual={false}
                                  options={[
                                    {
                                      value: "juz",
                                      label: (
                                        <Space size={6}>
                                          <Layers2 size={14} />
                                          Juz
                                        </Space>
                                      ),
                                    },
                                    {
                                      value: "surah",
                                      label: (
                                        <Space size={6}>
                                          <BookOpen size={14} />
                                          Surah
                                        </Space>
                                      ),
                                    },
                                  ]}
                                />
                              </Form.Item>
                            </Col>

                            <Form.Item shouldUpdate noStyle>
                              {({ getFieldValue }) => {
                                const type = getFieldValue(["items", name, "target_type"]);
                                const selectedSurahId = getFieldValue(["items", name, "surah_id"]);
                                const selectedSurah = surahMap.get(selectedSurahId);

                                return (
                                  <>
                                    {type === "juz" ? (
                                      <Col xs={24} md={8}>
                                        <Form.Item
                                          label='Pilih Juz'
                                          name={[name, "juz_id"]}
                                          rules={[{ required: true, message: "Juz wajib dipilih." }]}
                                        >
                                          <Select options={juzOptions} virtual={false} />
                                        </Form.Item>
                                      </Col>
                                    ) : null}

                                    {type === "surah" ? (
                                      <>
                                        <Col xs={24} md={8}>
                                          <Form.Item
                                            label='Pilih Surah'
                                            name={[name, "surah_id"]}
                                            rules={[{ required: true, message: "Surah wajib dipilih." }]}
                                          >
                                            <Select
                                              virtual={false}
                                              showSearch
                                              optionFilterProp='label'
                                              options={surahOptions}
                                            />
                                          </Form.Item>
                                        </Col>
                                        <Col xs={12} md={4}>
                                          <Form.Item label='Start Ayat' name={[name, "start_ayat"]}>
                                            <Input type='number' min={1} />
                                          </Form.Item>
                                        </Col>
                                        <Col xs={12} md={4}>
                                          <Form.Item label='End Ayat' name={[name, "end_ayat"]}>
                                            <Input
                                              type='number'
                                              min={1}
                                              max={selectedSurah?.total_ayat}
                                            />
                                          </Form.Item>
                                        </Col>
                                      </>
                                    ) : null}
                                  </>
                                );
                              }}
                            </Form.Item>

                            <Col xs={24} md={4}>
                              <Form.Item
                                label='Wajib'
                                name={[name, "is_mandatory"]}
                                valuePropName='checked'
                                initialValue
                              >
                                <Switch
                                  checkedChildren={<CircleDot size={12} />}
                                  unCheckedChildren={<CircleDot size={12} />}
                                />
                              </Form.Item>
                            </Col>

                            <Col xs={24} md={20}>
                              <Form.Item label='Catatan Item' name={[name, "notes"]}>
                                <Input placeholder='Opsional: target khusus, metode, dll.' />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={4}>
                              <Button
                                danger
                                icon={<Trash2 size={14} />}
                                style={{ marginTop: 30 }}
                                onClick={() => remove(name)}
                                block
                              >
                                Hapus
                              </Button>
                            </Col>
                          </Row>
                        </Card>
                      ))}

                      <Button
                        icon={<Plus size={15} />}
                        onClick={() => add({ target_type: "juz", is_mandatory: true })}
                      >
                        Tambah Item Target
                      </Button>
                    </Space>
                  )}
                </Form.List>

                <Divider />

                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button onClick={closeDrawer}>Batal</Button>
                  <Button
                    type='primary'
                    htmlType='submit'
                    icon={<Save size={15} />}
                    loading={creating || updating}
                  >
                    Simpan Target Plan
                  </Button>
                </Space>
              </Form>
            </Card>
          </div>
        </MotionDiv>
      </Drawer>
    </MotionDiv>
  );
};

export default Target;
