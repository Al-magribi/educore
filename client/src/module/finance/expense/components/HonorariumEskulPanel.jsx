import { useMemo, useState } from "react";
import {
  Button,
  Card,
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
const MotionDiv = motion.div;

const toEskulCode = (name) => {
  const slug = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return `ESKUL_${slug || "ITEM"}`;
};

const HonorariumEskulPanel = ({
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
  const eskuls = (listQuery.data?.data || []).filter(
    (item) => item.item_kind === "eskul",
  );
  const [addRate, addState] = useAddHonorRateMutation();
  const [updateRate, updateState] = useUpdateHonorRateMutation();
  const [deleteRate, deleteState] = useDeleteHonorRateMutation();
  const saving = addState.isLoading || updateState.isLoading;

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ name: "", amount: 0, is_active: true });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name || "",
      amount: record.amount || 0,
      is_active: record.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        homebase_id: homebaseId,
        code: editing?.code || toEskulCode(values.name),
        name: values.name,
        item_kind: "eskul",
        amount: values.amount || 0,
        description: null,
        valid_from: null,
        valid_to: null,
        sort_order: editing?.sort_order ?? eskuls.length + 1,
        is_active: values.is_active !== false,
      };
      if (editing?.id) {
        await updateRate({ id: editing.id, ...payload }).unwrap();
        message.success("Eskul berhasil diperbarui");
      } else {
        await addRate(payload).unwrap();
        message.success("Eskul berhasil ditambahkan");
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan eskul");
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: `Hapus eskul "${record.name}"?`,
      okText: "Hapus",
      okButtonProps: { danger: true, loading: deleteState.isLoading },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await deleteRate({ id: record.id, homebase_id: homebaseId }).unwrap();
          message.success("Eskul berhasil dihapus");
        } catch (error) {
          message.error(error?.data?.message || "Gagal menghapus eskul");
        }
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        title: "Eskul",
        dataIndex: "name",
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: "Rate",
        dataIndex: "amount",
        width: 160,
        align: "right",
        render: (value) => (
          <Text strong>{currencyFormatter.format(Number(value || 0))}</Text>
        ),
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
        title: "",
        key: "action",
        width: 96,
        render: (_, record) => (
          <Space>
            <Button type='text' icon={<Pencil size={16} />} onClick={() => openEdit(record)} />
            <Button type='text' danger icon={<Trash2 size={16} />} onClick={() => handleDelete(record)} />
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
        <Flex justify='space-between' align={isMobile ? "stretch" : "center"} vertical={isMobile} gap={12}>
          <Flex vertical gap={4}>
            <Text strong style={{ fontSize: 16 }}>Eskul</Text>
            <Text type='secondary' style={{ fontSize: 13 }}>
              Nama eskul dan rate per kehadiran. Penugasan ke guru atau tendik dilakukan di tab Personel.
            </Text>
          </Flex>
          <Flex gap={8} wrap='wrap'>
            {!lockHomebase ? (
              <Select
                placeholder='Pilih satuan'
                value={homebaseId}
                onChange={onHomebaseChange}
                style={{ minWidth: isMobile ? "100%" : 220 }}
                options={homebases.map((item) => ({ value: item.id, label: item.name }))}
                virtual={false}
              />
            ) : null}
            <Button type='primary' icon={<Plus size={16} />} onClick={openCreate} style={{ borderRadius: 12 }}>
              Tambah Eskul
            </Button>
          </Flex>
        </Flex>
      </Card>

      <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card style={cardStyle} styles={{ body: { padding: isMobile ? 8 : 12 } }}>
          <Table
            rowKey='id'
            size={isMobile ? "small" : "middle"}
            columns={columns}
            dataSource={eskuls}
            loading={listQuery.isFetching}
            pagination={false}
            locale={{ emptyText: "Belum ada eskul." }}
          />
        </Card>
      </MotionDiv>

      <Modal
        title={editing ? "Edit Eskul" : "Tambah Eskul"}
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
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 12 }}>
          <Form.Item name='name' label='Nama eskul' rules={[{ required: true, message: "Nama eskul wajib diisi" }]}>
            <Input placeholder='Robotik' />
          </Form.Item>
          <Form.Item name='amount' label='Rate' rules={[{ required: true, message: "Rate wajib diisi" }]}>
            <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
          </Form.Item>
          <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
            <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

export default HonorariumEskulPanel;
