import { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { LoadApp } from "../../../../components";
import {
  useAddHonorExtraAssignmentMutation,
  useAddHonorRateMutation,
  useDeleteHonorExtraAssignmentMutation,
  useDeleteHonorRateMutation,
  useGetHonorExtraAssignmentsQuery,
  useGetHonorPeopleQuery,
  useGetHonorRatesQuery,
  useUpdateHonorExtraAssignmentMutation,
  useUpdateHonorRateMutation,
} from "../../../../service/finance/ApiHonorarium";
import { cardStyle, currencyFormatter, rupiahInputProps } from "../constants";

const { Text } = Typography;
const { TextArea } = Input;
const MotionDiv = motion.div;

const SYSTEM_CODES = new Set([
  "TEACHING_RATE",
  "TRANSPORT_DAILY",
  "HOMEROOM_ALLOWANCE",
]);

const KIND_LABEL = {
  standard: "Rate global",
  extra_income: "Pendapatan tambahan",
  extra_duty: "Tugas tambahan",
};

const HonorariumRatePanel = ({
  homebaseId,
  homebases = [],
  lockHomebase = false,
  onHomebaseChange,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const itemKindWatch = Form.useWatch("item_kind", form);

  const listQuery = useGetHonorRatesQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );
  const rates = listQuery.data?.data || [];
  const extraItems = rates.filter((item) => item.item_kind === "extra_income");

  const peopleQuery = useGetHonorPeopleQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );
  const teachers = peopleQuery.data?.data?.teachers || [];

  const extraQuery = useGetHonorExtraAssignmentsQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );
  const extraAssignments = extraQuery.data?.data || [];

  const [addRate, addState] = useAddHonorRateMutation();
  const [updateRate, updateState] = useUpdateHonorRateMutation();
  const [deleteRate, deleteState] = useDeleteHonorRateMutation();
  const [addExtra, addExtraState] = useAddHonorExtraAssignmentMutation();
  const [updateExtra] = useUpdateHonorExtraAssignmentMutation();
  const [deleteExtra, deleteExtraState] = useDeleteHonorExtraAssignmentMutation();
  const saving = addState.isLoading || updateState.isLoading;

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      code: "",
      name: "",
      item_kind: "standard",
      amount: 0,
      description: "",
      valid_range: null,
      sort_order: (rates.length || 0) + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      code: record.code || "",
      name: record.name || "",
      item_kind: record.item_kind || "standard",
      amount: record.amount || 0,
      description: record.description || "",
      valid_range:
        record.valid_from || record.valid_to
          ? [
              record.valid_from ? dayjs(record.valid_from) : null,
              record.valid_to ? dayjs(record.valid_to) : null,
            ]
          : null,
      sort_order: record.sort_order ?? 0,
      is_active: record.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      const [fromDate, toDate] = values.valid_range || [];
      const payload = {
        homebase_id: homebaseId,
        code: values.code,
        name: values.name,
        item_kind: values.item_kind || "standard",
        amount: values.amount || 0,
        description: values.description || null,
        valid_from: fromDate ? fromDate.format("YYYY-MM-DD") : null,
        valid_to: toDate ? toDate.format("YYYY-MM-DD") : null,
        sort_order: values.sort_order ?? 0,
        is_active: values.is_active !== false,
      };

      if (editing?.id) {
        await updateRate({ id: editing.id, ...payload }).unwrap();
        message.success("Item honor berhasil diperbarui");
      } else {
        await addRate(payload).unwrap();
        message.success("Item honor berhasil ditambahkan");
      }

      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan item honor");
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: `Hapus item "${record.name}"?`,
      content: SYSTEM_CODES.has(String(record.code || "").toUpperCase())
        ? "Ini adalah item sistem default. Hapus hanya jika yakin tidak dipakai generate payroll."
        : "Data yang dihapus tidak dapat dikembalikan.",
      okText: "Hapus",
      okButtonProps: { danger: true, loading: deleteState.isLoading },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await deleteRate({
            id: record.id,
            homebase_id: homebaseId,
          }).unwrap();
          message.success("Item honor berhasil dihapus");
        } catch (error) {
          message.error(error?.data?.message || "Gagal menghapus item honor");
        }
      },
    });
  };

  const openAssign = (record) => {
    assignForm.setFieldsValue({
      rate_item_id: record?.id,
      teacher_id: undefined,
      quantity: record?.item_kind === "extra_income" ? 1 : 0,
    });
    setAssignOpen(true);
  };

  const handleAssign = async (values) => {
    try {
      await addExtra({
        homebase_id: homebaseId,
        rate_item_id: values.rate_item_id,
        teacher_id: values.teacher_id,
        quantity: values.quantity || 0,
      }).unwrap();
      message.success("Guru berhasil ditugaskan");
      setAssignOpen(false);
      assignForm.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menugaskan guru");
    }
  };

  const handleQuantityChange = async (record, quantity) => {
    try {
      await updateExtra({
        id: record.id,
        homebase_id: homebaseId,
        quantity,
      }).unwrap();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan kehadiran");
    }
  };

  const handleRemoveExtra = (record) => {
    Modal.confirm({
      title: `Lepas ${record.teacher_name} dari ${record.item_name}?`,
      okText: "Lepas",
      okButtonProps: { danger: true, loading: deleteExtraState.isLoading },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await deleteExtra({
            id: record.id,
            homebase_id: homebaseId,
          }).unwrap();
          message.success("Penugasan dihapus");
        } catch (error) {
          message.error(error?.data?.message || "Gagal menghapus penugasan");
        }
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        title: "Urutan",
        dataIndex: "sort_order",
        width: 80,
        align: "center",
      },
      {
        title: "Item",
        key: "name",
        render: (_, record) => (
          <Space direction='vertical' size={0}>
            <Text strong>{record.name}</Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {record.code}
              {SYSTEM_CODES.has(String(record.code || "").toUpperCase())
                ? " · sistem"
                : ""}
            </Text>
          </Space>
        ),
      },
      {
        title: "Jenis",
        dataIndex: "item_kind",
        width: 170,
        render: (value) => (
          <Tag style={{ borderRadius: 999 }}>
            {KIND_LABEL[value] || KIND_LABEL.standard}
          </Tag>
        ),
      },
      {
        title: "Nominal",
        dataIndex: "amount",
        width: 150,
        align: "right",
        render: (value) => (
          <Text strong style={{ color: "#9a3412" }}>
            {currencyFormatter.format(Number(value || 0))}
          </Text>
        ),
      },
      {
        title: "Berlaku",
        key: "valid",
        width: 180,
        render: (_, record) => {
          if (!record.valid_from && !record.valid_to) {
            return <Text type='secondary'>Selamanya</Text>;
          }

          const from = record.valid_from
            ? dayjs(record.valid_from).format("DD MMM YYYY")
            : "…";
          const to = record.valid_to
            ? dayjs(record.valid_to).format("DD MMM YYYY")
            : "…";
          return (
            <Text type='secondary' style={{ fontSize: 12 }}>
              {from} – {to}
            </Text>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "is_active",
        width: 110,
        render: (value) => (
          <Tag color={value ? "green" : "default"} style={{ borderRadius: 999 }}>
            {value ? "Aktif" : "Nonaktif"}
          </Tag>
        ),
      },
      {
        title: "Aksi",
        key: "action",
        width: 120,
        render: (_, record) => (
          <Space>
            <Button
              type='text'
              icon={<Pencil size={16} />}
              onClick={() => openEdit(record)}
            />
            <Button
              type='text'
              danger
              icon={<Trash2 size={16} />}
              onClick={() => handleDelete(record)}
            />
          </Space>
        ),
      },
    ],
    [deleteState.isLoading, homebaseId],
  );

  if (!homebaseId) {
    return (
      <Card style={cardStyle}>
        <Text type='secondary'>Pilih satuan sekolah terlebih dahulu.</Text>
      </Card>
    );
  }

  if (listQuery.isLoading) {
    return <LoadApp />;
  }

  return (
    <Flex vertical gap={isMobile ? 12 : 16}>
      <Card style={cardStyle} styles={{ body: { padding: isMobile ? 14 : 18 } }}>
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          gap={12}
          wrap='wrap'
        >
          <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
            <Text strong style={{ fontSize: 16 }}>
              Item Honor
            </Text>
            <Text type='secondary' style={{ fontSize: 13 }}>
              Rate global atau pendapatan tambahan (insentif × kehadiran), misalnya eskul.
            </Text>
          </Flex>
          <Flex gap={8} wrap='wrap' style={{ width: isMobile ? "100%" : "auto" }}>
            {!lockHomebase ? (
              <Select
                placeholder='Pilih satuan'
                value={homebaseId}
                onChange={onHomebaseChange}
                style={{ minWidth: isMobile ? "100%" : 220 }}
                options={homebases.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                virtual={false}
              />
            ) : null}
            <Button
              type='primary'
              icon={<Plus size={16} />}
              onClick={openCreate}
              block={isMobile}
              style={{ borderRadius: 12 }}
            >
              Tambah Item
            </Button>
          </Flex>
        </Flex>
      </Card>

      <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          style={cardStyle}
          styles={{ body: { padding: isMobile ? 8 : 12 } }}
        >
          <Table
            rowKey='id'
            size={isMobile ? "small" : "middle"}
            columns={columns}
            dataSource={rates}
            loading={listQuery.isFetching}
            pagination={false}
            scroll={{ x: 820 }}
          />
        </Card>
      </MotionDiv>

      <Card style={cardStyle} styles={{ body: { padding: isMobile ? 14 : 18 } }}>
        <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
          <Flex vertical gap={4}>
            <Text strong style={{ fontSize: 16 }}>
              Penugasan guru
            </Text>
            <Text type='secondary' style={{ fontSize: 13 }}>
              Pendapatan tambahan dibayar insentif × kehadiran. Tugas tambahan diisi lewat jabatan. Masuk slip setelah payroll dihitung ulang.
            </Text>
          </Flex>
          <Button
            type='primary'
            icon={<Plus size={16} />}
            disabled={extraItems.length === 0}
            onClick={() => openAssign(extraItems[0])}
            style={{ borderRadius: 12 }}
          >
            Tugaskan Guru
          </Button>
        </Flex>
        <Table
          style={{ marginTop: 12 }}
          rowKey='id'
          size={isMobile ? "small" : "middle"}
          loading={extraQuery.isFetching}
          dataSource={extraAssignments}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{
            emptyText: "Belum ada guru yang ditugaskan pada pendapatan atau tugas tambahan.",
          }}
          columns={[
            {
              title: "Item",
              key: "item",
              render: (_, record) => (
                <Space direction='vertical' size={0}>
                  <Text strong>{record.item_name}</Text>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {KIND_LABEL[record.item_kind] || record.item_kind}
                  </Text>
                </Space>
              ),
            },
            {
              title: "Guru",
              dataIndex: "teacher_name",
              render: (value, record) =>
                record.teacher_nip ? `${value} (${record.teacher_nip})` : value,
            },
            {
              title: "Kehadiran",
              dataIndex: "quantity",
              width: 120,
              render: (value, record) =>
                record.item_kind === "extra_income" ? (
                  <InputNumber
                    min={0}
                    defaultValue={Number(value || 0)}
                    key={`${record.id}-${value}`}
                    onBlur={(event) => {
                      const next = Number(String(event.target.value || "0").replace(",", "."));
                      if (Number.isFinite(next) && next !== Number(value || 0)) {
                        handleQuantityChange(record, next);
                      }
                    }}
                  />
                ) : (
                  <Text type='secondary'>—</Text>
                ),
            },
            {
              title: "Dibayar",
              dataIndex: "payable",
              width: 140,
              align: "right",
              render: (value) => (
                <Text strong>{currencyFormatter.format(Number(value || 0))}</Text>
              ),
            },
            {
              title: "",
              key: "action",
              width: 64,
              render: (_, record) => (
                <Button
                  type='text'
                  danger
                  icon={<Trash2 size={16} />}
                  onClick={() => handleRemoveExtra(record)}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title='Tugaskan Guru'
        open={assignOpen}
        onCancel={() => {
          setAssignOpen(false);
          assignForm.resetFields();
        }}
        onOk={assignForm.submit}
        okText='Tugaskan'
        cancelText='Batal'
        confirmLoading={addExtraState.isLoading}
        destroyOnClose
        centered
      >
        <Form
          form={assignForm}
          layout='vertical'
          onFinish={handleAssign}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name='rate_item_id'
            label='Item'
            rules={[{ required: true, message: "Item wajib dipilih" }]}
          >
            <Select
              virtual={false}
              placeholder='Pilih pendapatan atau tugas tambahan'
              options={extraItems.map((item) => ({
                value: item.id,
                label: `${item.name} · ${KIND_LABEL[item.item_kind]} · ${currencyFormatter.format(Number(item.amount || 0))}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name='teacher_id'
            label='Guru'
            rules={[{ required: true, message: "Guru wajib dipilih" }]}
          >
            <Select
              virtual={false}
              showSearch
              optionFilterProp='label'
              placeholder='Pilih guru'
              options={teachers.map((item) => ({
                value: item.id,
                label: item.nip
                  ? `${item.full_name} (${item.nip})`
                  : item.full_name,
              }))}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) => prev.rate_item_id !== next.rate_item_id}
          >
            {() => {
              const selected = extraItems.find(
                (item) => item.id === assignForm.getFieldValue("rate_item_id"),
              );
              if (selected?.item_kind !== "extra_income") {
                return null;
              }
              return (
                <Form.Item
                  name='quantity'
                  label='Kehadiran yang dibayar'
                  rules={[{ required: true, message: "Kehadiran wajib diisi" }]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editing ? "Edit Item Honor" : "Tambah Item Honor"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={form.submit}
        okText={editing ? "Simpan" : "Tambah"}
        cancelText='Batal'
        confirmLoading={saving}
        destroyOnClose
        centered
        width={isMobile ? "calc(100vw - 24px)" : 560}
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name='code'
            label='Kode'
            rules={[{ required: true, message: "Kode wajib diisi" }]}
            extra='Contoh: TEACHING_RATE, TRANSPORT_DAILY, BONUS_KHUSUS'
          >
            <Input
              placeholder='TEACHING_RATE'
              disabled={
                editing &&
                SYSTEM_CODES.has(String(editing.code || "").toUpperCase())
              }
            />
          </Form.Item>
          <Form.Item
            name='item_kind'
            label='Jenis'
            rules={[{ required: true, message: "Jenis wajib dipilih" }]}
          >
            <Select
              virtual={false}
              disabled={
                editing &&
                SYSTEM_CODES.has(String(editing.code || "").toUpperCase())
              }
              options={[
                { value: "standard", label: "Rate global" },
                {
                  value: "extra_income",
                  label: "Pendapatan tambahan (per kehadiran)",
                },
              ]}
            />
          </Form.Item>
          <Form.Item
            name='name'
            label='Nama Item'
            rules={[{ required: true, message: "Nama wajib diisi" }]}
          >
            <Input
              placeholder={
                itemKindWatch === "extra_income"
                  ? "Eskul Robotik"
                  : itemKindWatch === "extra_duty"
                    ? "Kesiswaan"
                    : "Rate per Jam Mengajar"
              }
            />
          </Form.Item>
          <Form.Item
            name='amount'
            label={
              itemKindWatch === "extra_income"
                ? "Insentif per kehadiran"
                : itemKindWatch === "extra_duty"
                  ? "Insentif"
                  : "Nominal"
            }
            rules={[{ required: true, message: "Nominal wajib diisi" }]}
          >
            <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
          </Form.Item>
          <Form.Item name='description' label='Keterangan'>
            <TextArea rows={2} placeholder='Opsional' />
          </Form.Item>
          <Form.Item
            name='valid_range'
            label='Masa berlaku (opsional)'
            extra='Kosongkan jika berlaku tanpa batas waktu'
          >
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name='sort_order' label='Urutan tampil'>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
            <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

export default HonorariumRatePanel;
