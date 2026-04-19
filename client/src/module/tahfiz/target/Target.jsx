import React, { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Form,
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
} from "lucide-react";
import {
  useCreateTargetPlanMutation,
  useDeleteTargetPlanMutation,
  useGetTargetOptionsQuery,
  useGetTargetPlansQuery,
  useUpdateTargetPlanMutation,
} from "../../../service/tahfiz/ApiTarget";

const { Title, Text } = Typography;

const normalizeToNull = (value) =>
  value === undefined || value === null || value === "" ? null : value;

const Target = () => {
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
  const selectedHomebaseId = homebaseId ?? optionsQuery.data?.selected_homebase_id;
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

  const formPeriodeOptions = (formOptionsQuery.data?.periodes || []).map((item) => ({
    value: item.id,
    label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
  }));
  const formGradeOptions = (formOptionsQuery.data?.grades || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

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
        <Space direction="vertical" size={2}>
          <Text strong>{record.title || "Tanpa Judul"}</Text>
          <Text type="secondary">
            {record.homebase_name || "Semua Satuan"} • {record.periode_name} •{" "}
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
        if (!items.length) return <Text type="secondary">Belum ada item</Text>;

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
          color={active ? "#52c41a" : "#bfbfbf"}
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
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Hapus Target Plan"
            description="Data target beserta item akan terhapus permanen."
            okText="Hapus"
            cancelText="Batal"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (optionsQuery.isError || plansQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Gagal memuat data target tahfiz."
        description="Silakan refresh halaman atau cek koneksi server."
      />
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card
        style={{
          borderRadius: 14,
          border: "1px solid #d9f7be",
          background: "linear-gradient(135deg, #f6ffed 0%, #ffffff 70%)",
        }}
      >
        <Space direction="vertical" size={4}>
          <Title level={4} style={{ margin: 0 }}>
            Manajemen Target Tahfiz
          </Title>
          <Text type="secondary">
            Atur target hafalan per periode, tingkat, dan satuan dengan kombinasi
            item Juz maupun Surah.
          </Text>
        </Space>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 12 }}>
            <Space direction="vertical" size={0}>
              <Text type="secondary">Total Plan</Text>
              <Title level={3} style={{ margin: 0 }}>
                {plansQuery.data?.summary?.total_plans || 0}
              </Title>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 12 }}>
            <Space direction="vertical" size={0}>
              <Text type="secondary">Plan Aktif</Text>
              <Title level={3} style={{ margin: 0 }}>
                {plansQuery.data?.summary?.active_plans || 0}
              </Title>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 12 }}>
            <Space direction="vertical" size={0}>
              <Text type="secondary">Total Item Target</Text>
              <Title level={3} style={{ margin: 0 }}>
                {plansQuery.data?.summary?.total_items || 0}
              </Title>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Select
              allowClear
              value={selectedHomebaseId}
              placeholder="Filter Satuan"
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
              placeholder="Filter Periode"
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
              placeholder="Filter Tingkat"
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
              placeholder="Cari judul target..."
              prefix={<Search size={14} />}
              suffix={
                <Button
                  type="text"
                  size="small"
                  icon={<Sparkles size={14} />}
                  onClick={() => setSearchValue(searchInput.trim())}
                />
              }
              allowClear
            />
          </Col>
        </Row>

        <Divider />

        <Space
          style={{
            width: "100%",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
          wrap
        >
          <Text strong>Daftar Target Plan</Text>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            Buat Target Plan
          </Button>
        </Space>

        <Table
          rowKey="id"
          loading={plansQuery.isLoading || plansQuery.isFetching}
          dataSource={plansQuery.data?.plans || []}
          columns={columns}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="Belum ada target plan" /> }}
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
                    {item.is_mandatory ? " • Wajib" : " • Opsional"}
                  </Tag>
                ))}
              </Space>
            ),
            rowExpandable: (record) => (record.items || []).length > 0,
          }}
        />
      </Card>

      <Drawer
        width={900}
        title={editingPlan ? "Edit Target Plan" : "Buat Target Plan"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Satuan"
                name="homebase_id"
                rules={[{ required: true, message: "Satuan wajib dipilih." }]}
              >
                <Select
                  placeholder="Pilih satuan"
                  options={homebaseOptions}
                  virtual={false}
                  onChange={() => {
                    form.setFieldsValue({
                      periode_id: undefined,
                      grade_id: undefined,
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Periode"
                name="periode_id"
                rules={[{ required: true, message: "Periode wajib dipilih." }]}
              >
                <Select
                  options={formPeriodeOptions}
                  virtual={false}
                  placeholder="Pilih periode"
                  loading={formOptionsQuery.isFetching}
                  disabled={!formPeriodeOptions.length}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Tingkat"
                name="grade_id"
                rules={[{ required: true, message: "Tingkat wajib dipilih." }]}
              >
                <Select
                  options={formGradeOptions}
                  virtual={false}
                  placeholder="Pilih tingkat"
                  loading={formOptionsQuery.isFetching}
                  disabled={!formGradeOptions.length}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Judul Plan" name="title">
                <Input placeholder="Contoh: Target Tahfiz Kelas 7 Semester Ganjil" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Status Aktif"
                name="is_active"
                valuePropName="checked"
              >
                <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Catatan Plan" name="notes">
                <Input.TextArea rows={2} placeholder="Catatan tambahan plan..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Item Target</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {fields.map(({ key, name }, index) => (
                  <Card
                    key={key}
                    style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
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
                                    label="Pilih Juz"
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
                                      label="Pilih Surah"
                                      name={[name, "surah_id"]}
                                      rules={[{ required: true, message: "Surah wajib dipilih." }]}
                                    >
                                      <Select
                                        virtual={false}
                                        showSearch
                                        optionFilterProp="label"
                                        options={surahOptions}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={12} md={4}>
                                    <Form.Item label="Start Ayat" name={[name, "start_ayat"]}>
                                      <Input type="number" min={1} />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={12} md={4}>
                                    <Form.Item label="End Ayat" name={[name, "end_ayat"]}>
                                      <Input
                                        type="number"
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
                          label="Wajib"
                          name={[name, "is_mandatory"]}
                          valuePropName="checked"
                          initialValue
                        >
                          <Switch
                            checkedChildren={<CircleDot size={12} />}
                            unCheckedChildren={<CircleDot size={12} />}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={20}>
                        <Form.Item label="Catatan Item" name={[name, "notes"]}>
                          <Input placeholder="Opsional: target khusus, metode, dll." />
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
            <Button onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<Save size={15} />}
              loading={creating || updating}
            >
              Simpan Target Plan
            </Button>
          </Space>
        </Form>
      </Drawer>
    </Space>
  );
};

export default Target;
