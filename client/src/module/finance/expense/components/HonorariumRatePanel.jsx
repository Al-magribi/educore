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
  useAddHonorRateMutation,
  useDeleteHonorRateMutation,
  useGetHonorRatesQuery,
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

const HonorariumRatePanel = ({
  homebaseId,
  homebases = [],
  lockHomebase = false,
  onHomebaseChange,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const listQuery = useGetHonorRatesQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );
  const rates = listQuery.data?.data || [];

  const [addRate, addState] = useAddHonorRateMutation();
  const [updateRate, updateState] = useUpdateHonorRateMutation();
  const [deleteRate, deleteState] = useDeleteHonorRateMutation();
  const saving = addState.isLoading || updateState.isLoading;

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      code: "",
      name: "",
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
              Rate per jam, transport harian, honor wali kelas, atau item custom.
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
            name='name'
            label='Nama Item'
            rules={[{ required: true, message: "Nama wajib diisi" }]}
          >
            <Input placeholder='Rate per Jam Mengajar' />
          </Form.Item>
          <Form.Item
            name='amount'
            label='Nominal'
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
