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
  useAddHonorPositionMutation,
  useDeleteHonorPositionMutation,
  useGetHonorPositionsQuery,
  useGetHonorUnitsQuery,
  useUpdateHonorPositionMutation,
} from "../../../../service/finance/ApiHonorarium";
import { cardStyle, currencyFormatter, rupiahInputProps } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const HonorariumPositionPanel = ({
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
  const [unitFilter, setUnitFilter] = useState("all");

  const unitsQuery = useGetHonorUnitsQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );
  const units = unitsQuery.data?.data || [];

  const listQuery = useGetHonorPositionsQuery(
    {
      homebase_id: homebaseId,
      ...(unitFilter !== "all" ? { unit_id: unitFilter } : {}),
    },
    { skip: !homebaseId },
  );
  const positions = listQuery.data?.data || [];

  const [addPosition, addState] = useAddHonorPositionMutation();
  const [updatePosition, updateState] = useUpdateHonorPositionMutation();
  const [deletePosition, deleteState] = useDeleteHonorPositionMutation();
  const saving = addState.isLoading || updateState.isLoading;

  const unitOptions = useMemo(
    () =>
      units.map((item) => ({
        value: item.id,
        label: item.name,
        disabled: item.is_active === false,
      })),
    [units],
  );

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      unit_id: unitFilter !== "all" ? unitFilter : undefined,
      name: "",
      allowance_amount: 0,
      base_salary: 0,
      sort_order: (positions.length || 0) + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      unit_id: record.unit_id,
      name: record.name,
      allowance_amount: record.allowance_amount || 0,
      base_salary: record.base_salary || 0,
      sort_order: record.sort_order ?? 0,
      is_active: record.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        homebase_id: homebaseId,
        unit_id: values.unit_id,
        name: values.name,
        allowance_amount: values.allowance_amount || 0,
        base_salary: values.base_salary || 0,
        sort_order: values.sort_order ?? 0,
        is_active: values.is_active !== false,
      };

      if (editing?.id) {
        await updatePosition({ id: editing.id, ...payload }).unwrap();
        message.success("Jabatan berhasil diperbarui");
      } else {
        await addPosition(payload).unwrap();
        message.success("Jabatan berhasil ditambahkan");
      }

      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan jabatan");
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: `Hapus jabatan "${record.name}"?`,
      content: "Data yang dihapus tidak dapat dikembalikan.",
      okText: "Hapus",
      okButtonProps: { danger: true, loading: deleteState.isLoading },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await deletePosition({
            id: record.id,
            homebase_id: homebaseId,
          }).unwrap();
          message.success("Jabatan berhasil dihapus");
        } catch (error) {
          message.error(error?.data?.message || "Gagal menghapus jabatan");
        }
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        title: "Unit",
        dataIndex: "unit_name",
        width: 140,
        render: (value) => (
          <Tag color='blue' style={{ borderRadius: 999 }}>
            {value || "-"}
          </Tag>
        ),
      },
      {
        title: "Jabatan",
        dataIndex: "name",
        render: (value, record) => (
          <Space direction='vertical' size={0}>
            <Text strong>{value}</Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              Urutan {record.sort_order ?? 0}
            </Text>
          </Space>
        ),
      },
      {
        title: "Tunjangan Jabatan",
        dataIndex: "allowance_amount",
        width: 160,
        align: "right",
        render: (value) => currencyFormatter.format(Number(value || 0)),
      },
      {
        title: "Gapok Default",
        dataIndex: "base_salary",
        width: 150,
        align: "right",
        render: (value) => currencyFormatter.format(Number(value || 0)),
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

  if (unitsQuery.isLoading || listQuery.isLoading) {
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
              Jabatan / Posisi
            </Text>
            <Text type='secondary' style={{ fontSize: 13 }}>
              Nama jabatan, tunjangan jabatan, dan gapok default per unit.
            </Text>
          </Flex>
          <Flex gap={8} wrap='wrap' style={{ width: isMobile ? "100%" : "auto" }}>
            {!lockHomebase ? (
              <Select
                placeholder='Pilih satuan'
                value={homebaseId}
                onChange={(value) => {
                  onHomebaseChange?.(value);
                  setUnitFilter("all");
                }}
                style={{ minWidth: isMobile ? "100%" : 200 }}
                options={homebases.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            ) : null}
            <Select
              placeholder='Filter unit'
              value={unitFilter}
              onChange={setUnitFilter}
              style={{ minWidth: isMobile ? "100%" : 180 }}
              options={[
                { value: "all", label: "Semua unit" },
                ...unitOptions,
              ]}
            />
            <Button
              type='primary'
              icon={<Plus size={16} />}
              onClick={openCreate}
              disabled={units.length === 0}
              block={isMobile}
              style={{ borderRadius: 12 }}
            >
              Tambah Jabatan
            </Button>
          </Flex>
        </Flex>
      </Card>

      {units.length === 0 ? (
        <Card style={cardStyle}>
          <Text type='secondary'>
            Belum ada unit. Buat unit honorarium terlebih dahulu.
          </Text>
        </Card>
      ) : (
        <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            style={cardStyle}
            styles={{ body: { padding: isMobile ? 8 : 12 } }}
          >
            <Table
              rowKey='id'
              size={isMobile ? "small" : "middle"}
              columns={columns}
              dataSource={positions}
              loading={listQuery.isFetching}
              pagination={false}
              scroll={{ x: 860 }}
            />
          </Card>
        </MotionDiv>
      )}

      <Modal
        title={editing ? "Edit Jabatan" : "Tambah Jabatan"}
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
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name='unit_id'
            label='Unit'
            rules={[{ required: true, message: "Unit wajib dipilih" }]}
          >
            <Select
              placeholder='Pilih unit'
              options={unitOptions}
              showSearch
              optionFilterProp='label'
            />
          </Form.Item>
          <Form.Item
            name='name'
            label='Nama Jabatan'
            rules={[{ required: true, message: "Nama jabatan wajib diisi" }]}
          >
            <Input placeholder='Contoh: Kepala Sekolah, Kurikulum, Operator' />
          </Form.Item>
          <Form.Item name='allowance_amount' label='Tunjangan Jabatan'>
            <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
          </Form.Item>
          <Form.Item name='base_salary' label='Gapok Default'>
            <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
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

export default HonorariumPositionPanel;
