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
  useAddHonorUnitMutation,
  useDeleteHonorUnitMutation,
  useGetHonorUnitsQuery,
  useUpdateHonorUnitMutation,
} from "../../../../service/finance/ApiHonorarium";
import { cardStyle } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const HonorariumUnitPanel = ({
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

  const listQuery = useGetHonorUnitsQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );
  const units = listQuery.data?.data || [];

  const [addUnit, addState] = useAddHonorUnitMutation();
  const [updateUnit, updateState] = useUpdateHonorUnitMutation();
  const [deleteUnit, deleteState] = useDeleteHonorUnitMutation();
  const saving = addState.isLoading || updateState.isLoading;

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      name: "",
      code: "",
      sort_order: (units.length || 0) + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code || "",
      sort_order: record.sort_order ?? 0,
      is_active: record.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        homebase_id: homebaseId,
        name: values.name,
        code: values.code || null,
        sort_order: values.sort_order ?? 0,
        is_active: values.is_active !== false,
      };

      if (editing?.id) {
        await updateUnit({ id: editing.id, ...payload }).unwrap();
        message.success("Unit berhasil diperbarui");
      } else {
        await addUnit(payload).unwrap();
        message.success("Unit berhasil ditambahkan");
      }

      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan unit");
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: `Hapus unit "${record.name}"?`,
      content:
        record.position_count > 0
          ? "Unit masih memiliki jabatan. Hapus jabatan terlebih dahulu."
          : "Data yang dihapus tidak dapat dikembalikan.",
      okText: "Hapus",
      okButtonProps: {
        danger: true,
        disabled: record.position_count > 0,
        loading: deleteState.isLoading,
      },
      cancelText: "Batal",
      onOk: async () => {
        if (record.position_count > 0) {
          return;
        }

        try {
          await deleteUnit({
            id: record.id,
            homebase_id: homebaseId,
          }).unwrap();
          message.success("Unit berhasil dihapus");
        } catch (error) {
          message.error(error?.data?.message || "Gagal menghapus unit");
        }
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        title: "Urutan",
        dataIndex: "sort_order",
        width: 90,
        align: "center",
      },
      {
        title: "Unit",
        key: "name",
        render: (_, record) => (
          <Space direction='vertical' size={0}>
            <Text strong>{record.name}</Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {record.code || "Tanpa kode"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Jabatan",
        dataIndex: "position_count",
        width: 100,
        align: "center",
        render: (value) => (
          <Tag style={{ borderRadius: 999 }}>{Number(value || 0)}</Tag>
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
              Unit Honorarium
            </Text>
            <Text type='secondary' style={{ fontSize: 13 }}>
              Section slip gaji: Yayasan, Guru, Tata Usaha, atau unit custom.
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
              Tambah Unit
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
            dataSource={units}
            loading={listQuery.isFetching}
            pagination={false}
            scroll={{ x: 640 }}
          />
        </Card>
      </MotionDiv>

      <Modal
        title={editing ? "Edit Unit" : "Tambah Unit"}
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
            name='name'
            label='Nama Unit'
            rules={[{ required: true, message: "Nama unit wajib diisi" }]}
          >
            <Input placeholder='Contoh: Yayasan, Guru, Tata Usaha' />
          </Form.Item>
          <Form.Item name='code' label='Kode (opsional)'>
            <Input placeholder='Contoh: YAYASAN' />
          </Form.Item>
          <Form.Item name='sort_order' label='Urutan tampil'>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name='is_active'
            label='Aktif'
            valuePropName='checked'
          >
            <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

export default HonorariumUnitPanel;
